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

            $contents = file_get_contents($sqlPath);
            if ($contents === false) {
                throw new RuntimeException('Unable to read the database dump.');
            }

            if ($this->usesDatabaseStorage()) {
                $this->storeInDatabase($filename, $contents);

                return [
                    'filename' => $filename,
                    'size' => strlen($contents),
                    'created_at' => date('c'),
                ];
            }

            $disk = Storage::disk(config('backup.disk'));
            $disk->makeDirectory($directory);
            $disk->put($directory.'/'.$filename, $contents, 'private');
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
        if ($this->usesDatabaseStorage()) {
            return DB::table('backups')
                ->orderByDesc('created_at')
                ->get()
                ->map(fn ($row): array => [
                    'filename' => (string) $row->filename,
                    'size' => (int) $row->size,
                    'created_at' => $this->formatTimestamp($row->created_at),
                ])
                ->all();
        }

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

    public function read(string $filename): ?array
    {
        if (! $this->isValidFilename($filename)) {
            return null;
        }

        if ($this->usesDatabaseStorage()) {
            $row = DB::table('backups')->where('filename', $filename)->first();

            return $row === null ? null : [
                'filename' => (string) $row->filename,
                'size' => (int) $row->size,
                'contents' => (string) $row->contents,
                'created_at' => $this->formatTimestamp($row->created_at),
            ];
        }

        $path = $this->directory().'/'.$filename;
        $disk = Storage::disk(config('backup.disk'));

        if (! $disk->exists($path)) {
            return null;
        }

        return [
            'filename' => $filename,
            'size' => (int) $disk->size($path),
            'contents' => (string) $disk->get($path),
            'created_at' => date('c', (int) $disk->lastModified($path)),
        ];
    }

    private function usesDatabaseStorage(): bool
    {
        return config('backup.driver', 'local') === 'database';
    }

    private function isValidFilename(string $filename): bool
    {
        return $filename !== ''
            && ! str_contains($filename, '/')
            && ! str_contains($filename, '\\')
            && str_ends_with($filename, '.sql')
            && preg_match('/^[A-Za-z0-9._-]+$/', $filename) === 1;
    }

    private function formatTimestamp(mixed $timestamp): string
    {
        $time = $timestamp === null ? null : strtotime((string) $timestamp);

        return date('c', $time === false ? time() : $time);
    }

    private function storeInDatabase(string $filename, string $contents): void
    {
        $now = now();

        DB::table('backups')->updateOrInsert(
            ['filename' => $filename],
            [
                'size' => strlen($contents),
                'contents' => $contents,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );

        $keep = max(1, (int) config('backup.keep', 5));
        $oldFilenames = DB::table('backups')
            ->orderByDesc('created_at')
            ->pluck('filename')
            ->slice($keep);

        if ($oldFilenames->isNotEmpty()) {
            DB::table('backups')->whereIn('filename', $oldFilenames)->delete();
        }
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

        if ($connection === 'pgsql') {
            $this->dumpPostgres($destination);

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
            if ($name === 'backups' || $type !== 'BASE TABLE' || ! preg_match('/^[A-Za-z0-9_]+$/', $name)) {
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

    private function dumpPostgres(string $destination): void
    {
        $handle = fopen($destination, 'w');
        if ($handle === false) {
            throw new RuntimeException('Unable to write the database dump.');
        }

        $pdo = DB::connection()->getPdo();
        $tables = $this->postgresTables($pdo);
        $sequences = $this->postgresSequences($pdo);

        fwrite($handle, "-- VillaCorz database backup\n");
        fwrite($handle, '-- Generated '.date('c')."\n");
        fwrite($handle, "-- PostgreSQL\n\n");
        fwrite($handle, "BEGIN;\n\n");

        foreach ($tables as $table) {
            fwrite($handle, 'DROP TABLE IF EXISTS '.$this->postgresQualifiedName($table)." CASCADE;\n");
        }
        fwrite($handle, "\n");

        foreach ($sequences as $sequence) {
            fwrite($handle, 'DROP SEQUENCE IF EXISTS '.$sequence['quoted_name']." CASCADE;\n");
            fwrite($handle, $sequence['ddl'].";\n");
        }
        fwrite($handle, "\n");

        $constraints = [];

        foreach ($tables as $table) {
            $quotedTable = $this->postgresQualifiedName($table);

            fwrite($handle, 'CREATE TABLE '.$quotedTable.' ('."\n");
            fwrite($handle, implode(",\n", $this->postgresColumns($pdo, $table))."\n");
            fwrite($handle, ");\n\n");

            $this->writePostgresRows($handle, $pdo, $table);
            fwrite($handle, "\n");

            foreach ($sequences as $sequence) {
                foreach ($sequence['columns'] as $column) {
                    if ($column['table'] !== $table) {
                        continue;
                    }

                    $quotedColumn = $this->quotePostgresIdentifier($column['column']);
                    $sequenceLiteral = str_replace("'", "''", $sequence['name']);

                    fwrite($handle, 'ALTER SEQUENCE '.$sequence['quoted_name'].' OWNED BY '.$quotedTable.'.'.$quotedColumn.";\n");
                    fwrite($handle, 'ALTER TABLE ONLY '.$quotedTable.' ALTER COLUMN '.$quotedColumn." SET DEFAULT nextval('".$sequenceLiteral."'::regclass);\n");
                    fwrite($handle, 'SELECT setval(\''.$sequenceLiteral.'\', COALESCE((SELECT MAX('.$quotedColumn.') FROM '.$quotedTable.'), 1), (SELECT COUNT(*) FROM '.$quotedTable.") > 0);\n");
                }
            }
            fwrite($handle, "\n");

            $constraints = array_merge($constraints, $this->postgresConstraints($pdo, $table));
        }

        foreach ($constraints as $constraint) {
            fwrite($handle, $constraint.";\n");
        }

        fwrite($handle, "\nCOMMIT;\n");
        fclose($handle);
    }

    private function postgresTables(PDO $pdo): array
    {
        $statement = $pdo->query(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'backups' AND tablename ~ '^[A-Za-z0-9_]+$' ORDER BY tablename",
        );

        if ($statement === false) {
            throw new RuntimeException('Unable to read PostgreSQL tables.');
        }

        return array_map('strval', $statement->fetchAll(PDO::FETCH_COLUMN));
    }

    private function postgresColumns(PDO $pdo, string $table): array
    {
        $statement = $pdo->prepare(
            'SELECT column_name, data_type, udt_name, character_maximum_length, numeric_precision, numeric_scale, is_nullable, column_default
             FROM information_schema.columns
             WHERE table_schema = \'public\' AND table_name = ?
             ORDER BY ordinal_position',
        );
        $statement->execute([$table]);

        $columns = [];
        while ($row = $statement->fetch(PDO::FETCH_ASSOC)) {
            $line = $this->quotePostgresIdentifier((string) $row['column_name']).' '.$this->postgresColumnType($row);

            if (($row['is_nullable'] ?? null) === 'NO') {
                $line .= ' NOT NULL';
            }

            $default = $row['column_default'] ?? null;
            if (is_string($default) && $default !== '' && ! str_contains($default, 'nextval(')) {
                $line .= ' DEFAULT '.$default;
            }

            $columns[] = $line;
        }

        if ($columns === []) {
            throw new RuntimeException("Unable to read columns for table: {$table}");
        }

        return $columns;
    }

    private function postgresColumnType(array $row): string
    {
        $dataType = strtolower((string) ($row['data_type'] ?? ''));
        $udtName = (string) ($row['udt_name'] ?? '');
        $length = $row['character_maximum_length'] ?? null;
        $precision = $row['numeric_precision'] ?? null;
        $scale = $row['numeric_scale'] ?? null;

        if ($dataType === 'array' && str_starts_with($udtName, '_')) {
            return substr($udtName, 1).'[]';
        }

        if ($dataType === 'user-defined') {
            return 'public.'.$this->quotePostgresIdentifier($udtName);
        }

        if (($dataType === 'character varying' || $dataType === 'character') && $length !== null) {
            return $dataType.'('.(int) $length.')';
        }

        if ($dataType === 'numeric' && $precision !== null) {
            return $scale === null
                ? 'numeric('.(int) $precision.')'
                : 'numeric('.(int) $precision.', '.(int) $scale.')';
        }

        return (string) ($row['data_type'] ?? 'text');
    }

    private function writePostgresRows($handle, PDO $pdo, string $table): void
    {
        $quotedTable = $this->postgresQualifiedName($table);
        $statement = $pdo->query('SELECT * FROM '.$quotedTable, PDO::FETCH_ASSOC);
        if ($statement === false) {
            throw new RuntimeException("Unable to read rows for table: {$table}");
        }

        $columns = [];
        while ($row = $statement->fetch(PDO::FETCH_ASSOC)) {
            if ($columns === []) {
                $columns = array_map(
                    fn (string $column): string => $this->quotePostgresIdentifier($column),
                    array_map('strval', array_keys($row)),
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
                'INSERT INTO '.$quotedTable.' ('.implode(', ', $columns).') VALUES ('.implode(', ', $values).");\n",
            );
        }
    }

    private function postgresConstraints(PDO $pdo, string $table): array
    {
        $statement = $pdo->prepare(
            "SELECT conname, pg_get_constraintdef(oid) AS definition
             FROM pg_constraint
             WHERE conrelid = ?::regclass AND contype IN ('p', 'u', 'f', 'c')
             ORDER BY CASE contype WHEN 'p' THEN 0 WHEN 'u' THEN 1 WHEN 'f' THEN 2 ELSE 3 END, conname",
        );
        $statement->execute(['public.'.$this->quotePostgresIdentifier($table)]);

        $constraints = [];
        while ($row = $statement->fetch(PDO::FETCH_ASSOC)) {
            $constraints[] = 'ALTER TABLE ONLY '.$this->postgresQualifiedName($table)
                .' ADD CONSTRAINT '.$this->quotePostgresIdentifier((string) $row['conname'])
                .' '.(string) $row['definition'];
        }

        return $constraints;
    }

    private function postgresSequences(PDO $pdo): array
    {
        $statement = $pdo->query(
            "SELECT sequencename, data_type, start_value, min_value, max_value, increment_by, cycle, cache_size
             FROM pg_sequences
             WHERE schemaname = 'public'
             ORDER BY sequencename",
        );

        if ($statement === false) {
            throw new RuntimeException('Unable to read PostgreSQL sequences.');
        }

        $sequences = [];
        while ($row = $statement->fetch(PDO::FETCH_ASSOC)) {
            $key = (string) $row['sequencename'];
            $qualifiedName = 'public.'.$this->quotePostgresIdentifier($key);
            $cycle = in_array(strtolower((string) $row['cycle']), ['1', 't', 'true'], true)
                ? 'CYCLE'
                : 'NO CYCLE';

            $sequences[$key] = [
                'name' => $qualifiedName,
                'quoted_name' => $qualifiedName,
                'ddl' => 'CREATE SEQUENCE '.$qualifiedName
                    .' AS '.(string) $row['data_type']
                    .' START WITH '.(string) $row['start_value']
                    .' INCREMENT BY '.(string) $row['increment_by']
                    .' MINVALUE '.(string) $row['min_value']
                    .' MAXVALUE '.(string) $row['max_value']
                    .' '.$cycle
                    .' CACHE '.(string) $row['cache_size'],
                'columns' => [],
            ];
        }

        $columnStatement = $pdo->query(
            "SELECT table_name, column_name FROM information_schema.columns
             WHERE table_schema = 'public' AND column_default LIKE 'nextval(%'
             ORDER BY table_name, ordinal_position",
        );

        if ($columnStatement === false) {
            throw new RuntimeException('Unable to read PostgreSQL sequence columns.');
        }

        $serialStatement = $pdo->prepare('SELECT pg_get_serial_sequence(?, ?)');
        while ($row = $columnStatement->fetch(PDO::FETCH_ASSOC)) {
            $table = (string) $row['table_name'];
            $column = (string) $row['column_name'];
            $serialStatement->execute(['public.'.$this->quotePostgresIdentifier($table), $column]);
            $qualified = $serialStatement->fetchColumn();

            if (! is_string($qualified) || $qualified === '') {
                continue;
            }

            $parts = explode('.', $qualified);
            $key = trim((string) end($parts), '"');
            if (! isset($sequences[$key])) {
                continue;
            }

            $sequences[$key]['columns'][] = ['table' => $table, 'column' => $column];
        }

        return $sequences;
    }

    private function quotePostgresIdentifier(string $name): string
    {
        return '"'.str_replace('"', '""', $name).'"';
    }

    private function postgresQualifiedName(string $table): string
    {
        return 'public.'.$this->quotePostgresIdentifier($table);
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
