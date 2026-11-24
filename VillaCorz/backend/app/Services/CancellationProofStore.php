<?php

namespace App\Services;

use App\Models\CancellationProof;
use App\Models\CancellationRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use RuntimeException;

class CancellationProofStore
{
    public function store(
        UploadedFile $file,
        CancellationRequest $request,
        string $bookingReference,
    ): CancellationProof {
        $contents = file_get_contents($file->getRealPath());

        if ($contents === false) {
            throw new RuntimeException('Unable to read the cancellation proof.');
        }

        $originalName = $file->getClientOriginalName() ?: 'proof';
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $reference = 'cancel-requests/'.$bookingReference.'/'.Str::uuid()->toString();

        if ($extension !== '') {
            $reference .= '.'.$extension;
        }

        return $request->proof()->create([
            'path' => $reference,
            'original_name' => $originalName,
            'mime' => $file->getMimeType() ?: $file->getClientMimeType(),
            'size' => (int) $file->getSize(),
            'contents' => $contents,
        ]);
    }
}
