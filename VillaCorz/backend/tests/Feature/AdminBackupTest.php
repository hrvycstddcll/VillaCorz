<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\DatabaseBackupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminBackupTest extends TestCase
{
    use RefreshDatabase;

    private function fakeBackups(): void
    {
        Storage::fake('local');

        $this->app->instance(DatabaseBackupService::class, new DatabaseBackupService(
            function (string $path): void {
                file_put_contents($path, '-- fake database dump');
            },
        ));
    }

    public function test_guests_and_customers_cannot_manage_backups(): void
    {
        $this->postJson('/api/backups')->assertUnauthorized();
        $this->getJson('/api/backups')->assertUnauthorized();

        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer)->postJson('/api/backups')->assertForbidden();
        $this->actingAs($customer)->getJson('/api/backups')->assertForbidden();
    }

    public function test_admin_can_save_list_and_download_a_backup(): void
    {
        $this->fakeBackups();
        $admin = User::factory()->create(['role' => 'admin']);

        $created = $this->actingAs($admin)->postJson('/api/backups');
        $created->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.filename', fn (string $filename): bool => str_starts_with($filename, 'villacorz-backup-') && str_ends_with($filename, '.sql'));

        $filename = $created->json('data.filename');
        Storage::disk('local')->assertExists('backups/'.$filename);

        $this->actingAs($admin)->getJson('/api/backups')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.filename', $filename);

        $this->actingAs($admin)->get('/api/backups/'.$filename.'/download')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/sql');
    }

    public function test_admin_cannot_download_an_invalid_backup_filename(): void
    {
        $this->fakeBackups();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get('/api/backups/invalid.txt/download')
            ->assertNotFound();
    }
}
