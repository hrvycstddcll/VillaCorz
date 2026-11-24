<?php

namespace App\Services;

use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PDO;
use RuntimeException;

class DatabaseBackupService
{
    private readonly ?Closure $dumper;

    /**
     * @param  (callable(string): void)|null  $dumper
     */
    public function __construct(?callable $dumper = null)
    {
        $this->dumper = $dumper === null ? null : Closure::fromCallable($dumper);
    }

    /**
     * @return array{filename: string, size: int, created_at: string}
     */
    public function create(): array
    {
        $directory = $this->directory();
        $filename = 'villacorz-backup-'.date('Ymd-His').'.sql';
        $sqlPath = tempnam(sys_get_temp_dir(), 'vc-backup-');

        if ($sqlPath === false) {
            throw new RuntimeException('Unable to create a temporary SQL file.');
        }

        try {
            $this->dumpDatabase($sqlPath);

            $disk = Storage::disk(config('backup.disk'));
            $disk->makeDirectory($directory);
            $disk->put($directory.'/'.$filename, file_get_contents($sqlPath), 'private');
            $this->prune($disk, $directory);

            return [
                'filename' => $filename,
                'size' => (int) $disk->size($directory.'/'.$filename),
                'created_at' => date('c'),
            ];
        } finally {
            if (is_file($sqlPath)) {
                unlink($sqlPath);
            }
        }
    }

    /**
     * @return array<int, array{filename: string, size: int, created_at: string}>
     */
    public function list(): array
    {
        $disk = Storage::disk(config('backup.disk'));
        $directory = $this->directory();

        return collect($disk->files($directory))
            ->filter(fn (string $path): bool => str_ends_with($path, '.sql'))
            ->map(fn (string $path): array => [
                'filename' => basename($path),
                'size' => (int) $disk->size($path),
                'created_at' => date('c', (int) $disk->lastModified($path)),
            ])
            ->sortByDesc('created_at')
            ->values()
            ->all();
    }

    public function resolvePath(string $filename): ?string
    {
        if (
            $filename === ''
            || str_contains($filename, '/')
            || str_contains($filename, '\\')
            || ! str_ends_with($filename, '.sql')
            || ! preg_match('/^[A-Za-z0-9._-]+$/', $filename)
        ) {
            return null;
        }

        $path = $this->directory().'/'.$filename;
        $disk = Storage::disk(config('backup.disk'));

        return $disk->exists($path) ? $path : null;
    }

    private function directory(): string
    {
        return trim((string) config('backup.directory', 'backups'), '/');
    }

    private function dumpDatabase(string $destination): void
    {
        if ($this->dumper !== null) {
            ($this->dumper)($destination);

            return;
        }

        $connection = (string) config('database.default');

        if ($connection === 'sqlite') {
            $database = (string) config('database.connections.sqlite.database');
            if (! is_file($database) || ! copy($database, $destination)) {
                throw new RuntimeException('Unable to copy the SQLite database.');
            }

            return;
        }

        if ($connection !== 'mysql' && $connection !== 'mariadb') {
            throw new RuntimeException("Unsupported database connection: {$connection}");
        }

        $this->dumpWithPdo($destination);
    }

    private function dumpWithPdo(string $destination): void
    {
        $handle = fopen($destination, 'w');
        if ($handle === false) {
            throw new RuntimeException('Unable to write the database dump.');
        }

        $pdo = DB::connection()->getPdo();
        fwrite($handle, "-- VillaCorz database backup\n");
        fwrite($handle, '-- Generated '.date('c')."\n\n");
        fwrite($handle, "SET FOREIGN_KEY_CHECKS=0;\n\n");

        $tables = DB::select('SHOW FULL TABLES');
        foreach ($tables as $table) {
            $values = (array) $table;
            $name = (string) reset($values);
            $type = strtoupper((string) (end($values) ?: ''));
            if ($type !== 'BASE TABLE' || ! preg_match('/^[A-Za-z0-9_]+$/', $name)) {
                continue;
            }

            $quoted = '`'.str_replace('`', '``', $name).'`';
            $create = DB::select("SHOW CREATE TABLE {$quoted}");
            $ddl = (array) ($create[0] ?? []);
            $statement = end($ddl);

            fwrite($handle, "DROP TABLE IF EXISTS {$quoted};\n");
            fwrite($handle, (string) $statement.";\n\n");

            $rows = $pdo->query("SELECT * FROM {$quoted}", PDO::FETCH_ASSOC);
            if ($rows === false) {
                continue;
            }

            $columns = [];
            while (($row = $rows->fetch(PDO::FETCH_ASSOC)) !== false) {
                if ($columns === []) {
                    $columns = array_map(
                        fn (string $column): string => '`'.str_replace('`', '``', $column).'`',
                        array_keys($row),
                    );
                }

                $values = array_map(
                    fn (mixed $value): string => $value === null
                        ? 'NULL'
                        : $pdo->quote((string) $value),
                    array_values($row),
                );

                fwrite(
                    $handle,
                    'INSERT INTO '.$quoted.' ('.implode(', ', $columns).') VALUES ('.implode(', ', $values).");\n",
                );
            }

            fwrite($handle, "\n");
        }

        fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n");
        fclose($handle);
    }

    private function prune($disk, string $directory): void
    {
        $keep = max(1, (int) config('backup.keep', 5));
        $files = collect($disk->files($directory))
            ->filter(fn (string $path): bool => str_ends_with($path, '.sql'))
            ->sortByDesc(fn (string $path): int => (int) $disk->lastModified($path))
            ->values();

        foreach ($files->slice($keep) as $path) {
            $disk->delete($path);
        }
    }
}
