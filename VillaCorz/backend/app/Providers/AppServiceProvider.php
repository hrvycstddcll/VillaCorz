<?php

namespace App\Providers;

use App\Database\NeonPostgresConnection;
use App\Database\NeonPostgresConnector;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory;
use Symfony\Component\Mailer\Transport\Dsn;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind('db.connector.pgsql', fn () => new NeonPostgresConnector);

        Connection::resolverFor('pgsql', fn ($connection, $database, $prefix, $config) => new NeonPostgresConnection(
            $connection,
            $database,
            $prefix,
            $config,
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // HTTPS API mail transport. Sends over port 443, so it keeps working
        // on networks (like campus Wi-Fi) that block outbound SMTP ports.
        Mail::extend('brevo', function () {
            return (new BrevoTransportFactory)->create(
                new Dsn('brevo+api', 'default', config('services.brevo.key'))
            );
        });
    }
}
