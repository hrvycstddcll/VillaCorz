<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:254',
            'message' => 'required|string|max:5000',
        ]);

        $recipient = config('services.contact.recipient');

        if (!is_string($recipient) || trim($recipient) === '') {
            return response()->json([
                'message' => 'The contact form is temporarily unavailable. Please try again later.',
            ], 503);
        }

        Mail::to($recipient)->send(new ContactMessage(
            name: $validated['name'],
            senderEmail: $validated['email'],
            messageText: $validated['message'],
        ));

        return response()->json([
            'message' => 'Your message has been sent. We will get back to you soon.',
        ]);
    }
}
