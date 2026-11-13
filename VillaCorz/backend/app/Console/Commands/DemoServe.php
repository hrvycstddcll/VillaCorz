<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class DemoServe extends Command
{
    protected $signature = 'demo:serve
        {--host=0.0.0.0 : Interface to bind (0.0.0.0 makes it reachable from a phone)}
        {--port=8000 : Port for the demo server}
        {--no-env : Do not rewrite PAYMENT_PUBLIC_URL in .env}';

    protected $description = 'Start the demo server on the LAN so the phone can open payment QR codes';

    public function handle(): int
    {
        $host = (string) $this->option('host');
        $port = (int) $this->option('port');
        $lanIp = $this->detectLanIp();

        if ($lanIp === null) {
            $this->error('Could not detect a LAN IP address. Connect to Wi-Fi and try again.');

            return self::FAILURE;
        }

        $publicUrl = "http://{$lanIp}:{$port}";

        if (! $this->option('no-env')) {
            $this->writeEnvValue('PAYMENT_PUBLIC_URL', $publicUrl);
            $this->callSilent('config:clear');
        }

        if ($this->portIsBusy($port)) {
            $this->warn("Port {$port} is already in use. Stop the other server first, then run this command again.");
        }

        $this->newLine();
        $this->info('VillaCorz demo server');
        $this->line("  Phone URL:    {$publicUrl}");
        $this->line("  Health check: {$publicUrl}/demo/health");
        $this->newLine();
        $this->line('Open the health check on your phone before scanning a payment QR code.');
        $this->line('If the phone cannot connect, allow port '.$port.' through Windows Firewall.');
        $this->newLine();

        return $this->call('serve', [
            '--host' => $host,
            '--port' => $port,
        ]);
    }

    private function detectLanIp(): ?string
    {
        if (PHP_OS_FAMILY === 'Windows') {
            $output = $this->runProcess(['ipconfig'], multiline: true);

            if ($output !== null) {
                // Prefer the adapter that owns the default gateway: that is the
                // Wi-Fi/Ethernet link the phone is actually on, not a virtual
                // adapter such as VirtualBox's host-only network.
                foreach (preg_split('/\r?\n\r?\n/', $output) ?: [] as $adapter) {
                    if (! preg_match('/Default Gateway[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i', $adapter)) {
                        continue;
                    }

                    if (preg_match('/IPv4 Address[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i', $adapter, $matches)) {
                        return $matches[1];
                    }
                }

                if (preg_match('/IPv4 Address[^:]*:\s*(\d+\.\d+\.\d+\.\d+)/i', $output, $matches)) {
                    return $matches[1];
                }
            }
        } else {
            $output = $this->runProcess(['hostname', '-I']);

            if ($output !== null) {
                foreach (preg_split('/\s+/', $output) ?: [] as $candidate) {
                    if (filter_var($candidate, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                        return $candidate;
                    }
                }
            }
        }

        // Last resort: resolve the machine name and keep a non-loopback IPv4 address.
        $resolved = gethostbynamel(gethostname()) ?: [];

        foreach ($resolved as $candidate) {
            if (! filter_var($candidate, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                continue;
            }

            if (str_starts_with($candidate, '127.') || str_starts_with($candidate, '169.254.')) {
                continue;
            }

            return $candidate;
        }

        return null;
    }

    private function runProcess(array $command, bool $multiline = false): ?string
    {
        try {
            $process = new Process($command);
            $process->setTimeout(10);
            $process->run();

            if (! $process->isSuccessful()) {
                return null;
            }

            $output = $process->getOutput();

            if ($multiline) {
                $output = trim($output);

                return $output !== '' ? $output : null;
            }

            $line = trim(strtok($output, "\r\n") ?: '');

            return $line !== '' ? $line : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function portIsBusy(int $port): bool
    {
        $connection = @fsockopen('127.0.0.1', $port, $errorCode, $errorMessage, 0.4);

        if (is_resource($connection)) {
            fclose($connection);

            return true;
        }

        return false;
    }

    private function writeEnvValue(string $key, string $value): void
    {
        $path = base_path('.env');

        if (! is_file($path)) {
            $this->warn('.env was not found; PAYMENT_PUBLIC_URL was not updated.');

            return;
        }

        $contents = (string) file_get_contents($path);
        $line = $key.'='.$value;

        if (preg_match('/^'.preg_quote($key, '/').'=.*$/m', $contents) === 1) {
            $contents = (string) preg_replace(
                '/^'.preg_quote($key, '/').'=.*$/m',
                $line,
                $contents,
                limit: 1,
            );
        } else {
            $contents = rtrim($contents, "\r\n").PHP_EOL.$line.PHP_EOL;
        }

        file_put_contents($path, $contents);
    }
}