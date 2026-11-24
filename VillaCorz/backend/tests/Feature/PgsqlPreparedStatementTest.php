<?php

use App\Database\NeonPostgresConnection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PgsqlPreparedStatementTest extends TestCase
{
    use RefreshDatabase;

    public function test_pgsql_connections_emulate_prepared_statements(): void
    {
        foreach (['pgsql', 'pgsql_migrations'] as $connection) {
            $options = config("database.connections.{$connection}.options", []);

            $this->assertTrue($options[\PDO::ATTR_EMULATE_PREPARES] ?? false);
        }
    }

    public function test_pgsql_booleans_are_prepared_as_postgres_literals(): void
    {
        $connection = new NeonPostgresConnection(
            null,
            'neondb',
            '',
            config('database.connections.pgsql'),
        );

        $this->assertSame(['true', 'false'], $connection->prepareBindings([true, false]));
    }
}
