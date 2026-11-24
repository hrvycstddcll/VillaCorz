<?php

namespace Tests;

use Illuminate\Foundation\Application;

trait UsesSqliteInMemory
{
    private ?array $originalDatabaseEnv = null;

    public function createApplication(): Application
    {
        $this->originalDatabaseEnv = [
            'env' => [
                'DB_CONNECTION' => $_ENV['DB_CONNECTION'] ?? null,
                'DB_DATABASE' => $_ENV['DB_DATABASE'] ?? null,
            ],
            'getenv' => [
                'DB_CONNECTION' => getenv('DB_CONNECTION'),
                'DB_DATABASE' => getenv('DB_DATABASE'),
            ],
        ];

        $_ENV['DB_CONNECTION'] = 'sqlite';
        $_ENV['DB_DATABASE'] = ':memory:';
        putenv('DB_CONNECTION=sqlite');
        putenv('DB_DATABASE=:memory:');

        return parent::createApplication();
    }

    protected function tearDown(): void
    {
        parent::tearDown();

        if ($this->originalDatabaseEnv === null) {
            return;
        }

        foreach ($this->originalDatabaseEnv['env'] as $key => $value) {
            if ($value === null) {
                unset($_ENV[$key]);
            } else {
                $_ENV[$key] = $value;
            }
        }

        foreach ($this->originalDatabaseEnv['getenv'] as $key => $value) {
            putenv($value === false ? $key : "{$key}={$value}");
        }
    }
}
