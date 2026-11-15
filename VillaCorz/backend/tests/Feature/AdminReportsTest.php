<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ContactSubmission;
use App\Models\PageView;
use App\Models\ScheduledReportExport;
use App\Mail\AdminReportExport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminReportsTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role): User
    {
        return User::create([
            'firstname' => ucfirst($role),
            'lastname' => 'User',
            'email' => $role.'-'.uniqid().'@example.com',
            'password' => 'password',
            'role' => $role,
        ]);
    }

    public function test_report_rows_and_contact_read_action_are_admin_only(): void
    {
        $admin = $this->makeUser('admin');
        $submission = ContactSubmission::create([
            'name' => 'Guest',
            'email' => 'guest@example.com',
            'message' => 'Question about a stay.',
        ]);

        $this->getJson('/api/reports?report=contacts')->assertUnauthorized();
        $this->actingAs($this->makeUser('customer'))
            ->getJson('/api/reports?report=contacts')
            ->assertForbidden();

        $this->actingAs($admin)
            ->getJson('/api/reports?report=contacts&status=unread')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.status', 'unread')
            ->assertJsonPath('data.0.detail', 'Question about a stay.');

        $this->actingAs($admin)
            ->patchJson("/api/reports/contacts/{$submission->id}/read")
            ->assertOk();

        $this->actingAs($admin)
            ->getJson('/api/reports?report=contacts&status=unread')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    public function test_admin_can_schedule_and_cancel_a_report_export(): void
    {
        $admin = $this->makeUser('admin');

        $response = $this->actingAs($admin)
            ->postJson('/api/reports/schedules', [
                'email' => 'reports@example.com',
                'report' => 'revenue',
                'frequency' => 'weekly',
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'reports@example.com');

        $scheduleId = $response->json('data.id');
        $this->assertDatabaseHas('scheduled_report_exports', [
            'id' => $scheduleId,
            'user_id' => $admin->id,
            'report' => 'revenue',
            'frequency' => 'weekly',
            'active' => true,
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/reports/schedules/{$scheduleId}")
            ->assertOk();

        $this->assertDatabaseMissing('scheduled_report_exports', ['id' => $scheduleId]);
    }

    public function test_scheduled_report_list_is_scoped_to_the_current_admin(): void
    {
        $admin = $this->makeUser('admin');
        $otherAdmin = $this->makeUser('admin');
        ScheduledReportExport::create([
            'user_id' => $otherAdmin->id,
            'email' => 'private@example.com',
            'report' => 'bookings',
            'frequency' => 'monthly',
            'next_run_at' => now()->addMonth(),
        ]);

        $this->actingAs($admin)
            ->getJson('/api/reports/schedules')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_due_scheduled_exports_are_emailed_and_advanced(): void
    {
        Mail::fake();
        $admin = $this->makeUser('admin');
        $schedule = ScheduledReportExport::create([
            'user_id' => $admin->id,
            'email' => 'reports@example.com',
            'report' => 'revenue',
            'frequency' => 'weekly',
            'next_run_at' => now()->subMinute(),
        ]);

        $this->artisan('reports:send-scheduled')->assertSuccessful();

        Mail::assertSent(AdminReportExport::class, function (AdminReportExport $mail) {
            return $mail->hasTo('reports@example.com')
                && $mail->report === 'revenue'
                && $mail->frequency === 'weekly'
                && str_contains($mail->filename, '.csv');
        });
        $this->assertTrue($schedule->fresh()->next_run_at->isFuture());
    }

    public function test_guest_traffic_and_check_in_reports_support_dashboard_drilldown_filters(): void
    {
        $admin = $this->makeUser('admin');
        $guest = $this->makeUser('customer');
        PageView::create([
            'path' => '/rooms',
            'session_hash' => hash('sha256', 'test-session'),
            'referrer' => 'https://example.test/',
        ]);
        $booking = Booking::create([
            'user_id' => $guest->id,
            'reference' => 'VC-CHECKIN-001',
            'contact_name' => $guest->firstname.' '.$guest->lastname,
            'contact_email' => $guest->email,
            'check_in' => now()->toDateString(),
            'check_out' => now()->addDay()->toDateString(),
            'nights' => 1,
            'adults' => 1,
            'kids' => 0,
            'subtotal' => 1000,
            'total' => 1000,
            'currency' => 'PHP',
            'status' => 'confirmed',
        ]);
        $booking->forceFill(['created_at' => now()->subDays(10)])->saveQuietly();
        $today = now()->toDateString();

        $this->actingAs($admin)
            ->getJson("/api/reports?report=guests&from={$today}&to={$today}&search=".urlencode($guest->email))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.detail', $guest->email);

        $this->actingAs($admin)
            ->getJson("/api/reports?report=traffic&from={$today}&to={$today}&search=rooms")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.label', '/rooms');

        $this->actingAs($admin)
            ->getJson("/api/reports?report=bookings&date_field=check_in&status=check_ins&from={$today}&to={$today}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.reference', 'VC-CHECKIN-001');
    }
}
