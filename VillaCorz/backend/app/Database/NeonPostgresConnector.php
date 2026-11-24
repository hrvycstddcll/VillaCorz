<?php

namespace App\Database;

use Illuminate\Database\Connectors\PostgresConnector;

class NeonPostgresConnector extends PostgresConnector
{
    protected function addServerOptions($dsn, array $config)
    {
        if (empty($config['server_options'])) {
            return $dsn;
        }

        $options = [];

        foreach ($config['server_options'] as $name => $value) {
            $options[] = $name.'='.str_replace(['\\', "'"], ['\\\\', "\\'"], (string) $value);
        }

        return $dsn.";options='".implode(' ', $options)."'";
    }
}
