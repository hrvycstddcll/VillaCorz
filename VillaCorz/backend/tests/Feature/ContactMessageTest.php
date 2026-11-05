<?php

namespace Tests\Feature;

use App\Mail\ContactMessage;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ContactMessageTest extends TestCase
{
    public function test_contact_message_is_sent_to_the_configured_recipient(): void
    {
        Mail::fake();
        config(['services.contact.recipient' => 'contact@example.com']);

        $response = $this->postJson('/api/contact', [
            'name' => 'Taylor Guest',
            'email' => 'taylor@example.com',
            'message' => 'I have a question about booking.',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath(
                'message',
                'Your message has been sent. We will get back to you soon.',
            );

        Mail::assertSent(ContactMessage::class, function (ContactMessage $mail) {
            return $mail->hasTo('contact@example.com')
                && $mail->name === 'Taylor Guest'
                && $mail->senderEmail === 'taylor@example.com'
                && $mail->messageText === 'I have a question about booking.';
        });
    }

    public function test_contact_message_requires_valid_fields(): void
    {
        Mail::fake();
        config(['services.contact.recipient' => 'contact@example.com']);

        $response = $this->postJson('/api/contact', [
            'name' => '',
            'email' => 'not-an-email',
            'message' => '',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'message']);

        Mail::assertNothingSent();
    }

    public function test_contact_message_fails_explicitly_when_recipient_is_not_configured(): void
    {
        Mail::fake();
        config(['services.contact.recipient' => null]);

        $response = $this->postJson('/api/contact', [
            'name' => 'Taylor Guest',
            'email' => 'taylor@example.com',
            'message' => 'I have a question about booking.',
        ]);

        $response->assertServiceUnavailable();
        Mail::assertNothingSent();
    }
}
