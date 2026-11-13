<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserPhoneNumber;
use App\Rules\PhoneNumberRule;
use App\Services\ActivityLogger;
use App\Services\PhoneNumberService;
use App\Services\PhoneVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PhoneNumberController extends Controller
{
    public function __construct(
        private readonly PhoneNumberService $phones,
        private readonly PhoneVerificationService $verification,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $request->user()->phoneNumbersPayload(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone_number' => ['required', 'string', 'max:32', new PhoneNumberRule()],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $phone = $this->phones->add(
            $user,
            $validated['phone_number'],
            (bool) ($validated['is_primary'] ?? false),
        );

        ActivityLogger::record(
            'phone_number_added',
            $user,
            'Added a phone number.',
            UserPhoneNumber::class,
            $phone->id,
            ['phone_number' => $phone->phone_number],
            $request,
        );

        return response()->json([
            'success' => true,
            'message' => 'Phone number added.',
            'phone_number' => $this->phonePayload($phone),
            'user' => $user->fresh()->accountPayload(),
        ], 201);
    }

    public function update(Request $request, int $phoneNumber): JsonResponse
    {
        $validated = $request->validate([
            'phone_number' => ['sometimes', 'required', 'string', 'max:32', new PhoneNumberRule()],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $phone = $this->findOwned($user, $phoneNumber);

        $phone = $this->phones->update(
            $user,
            $phone,
            $validated['phone_number'] ?? null,
            array_key_exists('is_primary', $validated)
                ? (bool) $validated['is_primary']
                : null,
        );

        ActivityLogger::record(
            'phone_number_updated',
            $user,
            'Updated a phone number.',
            UserPhoneNumber::class,
            $phone->id,
            [
                'phone_number' => $phone->phone_number,
                'is_primary' => $phone->is_primary,
            ],
            $request,
        );

        return response()->json([
            'success' => true,
            'message' => 'Phone number updated.',
            'phone_number' => $this->phonePayload($phone),
            'user' => $user->fresh()->accountPayload(),
        ]);
    }

    public function destroy(Request $request, int $phoneNumber): JsonResponse
    {
        $user = $request->user();
        $phone = $this->findOwned($user, $phoneNumber);
        $number = $phone->phone_number;

        $this->phones->remove($user, $phone);

        ActivityLogger::record(
            'phone_number_removed',
            $user,
            'Removed a phone number.',
            UserPhoneNumber::class,
            $phoneNumber,
            ['phone_number' => $number],
            $request,
        );

        return response()->json([
            'success' => true,
            'message' => 'Phone number removed.',
            'user' => $user->fresh()->accountPayload(),
        ]);
    }

    public function sendVerification(Request $request, int $phoneNumber): JsonResponse
    {
        $user = $request->user();
        $phone = $this->findOwned($user, $phoneNumber);

        $result = $this->verification->send($user, $phone);

        return response()->json([
            'success' => true,
            ...$result,
        ]);
    }

    public function confirmVerification(Request $request, int $phoneNumber): JsonResponse
    {
        $validated = $request->validate([
            'otp' => ['required', 'string', 'digits:6'],
        ]);

        $user = $request->user();
        $phone = $this->findOwned($user, $phoneNumber);

        $this->verification->confirm($user, $phone, $validated['otp']);

        ActivityLogger::record(
            'phone_number_verified',
            $user,
            'Verified a phone number.',
            UserPhoneNumber::class,
            $phone->id,
            ['phone_number' => $phone->phone_number],
            $request,
        );

        return response()->json([
            'success' => true,
            'message' => 'Phone number verified.',
            'phone_number' => $this->phonePayload($phone->fresh()),
            'user' => $user->fresh()->accountPayload(),
        ]);
    }

    private function findOwned(User $user, int $phoneNumber): UserPhoneNumber
    {
        return $user->phoneNumbers()->findOrFail($phoneNumber);
    }

    /**
     * @return array{id: int, phone_number: string, is_primary: bool, verified_at: ?string}
     */
    private function phonePayload(UserPhoneNumber $phone): array
    {
        return [
            'id' => $phone->id,
            'phone_number' => $phone->phone_number,
            'is_primary' => $phone->is_primary,
            'verified_at' => $phone->verified_at?->toIso8601String(),
        ];
    }
}