<?php

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
}
