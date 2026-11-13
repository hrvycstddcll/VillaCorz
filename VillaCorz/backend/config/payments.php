<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Public payment confirmation URL
    |--------------------------------------------------------------------------
    |
    | The QR code is rendered on the guest's phone, so this must be an address
    | the phone can actually reach. Use a LAN IP (http://192.168.x.x:8000) or
    | a tunnel URL (https://....trycloudflare.com) when demoing on a phone.
    |
    */

    'public_url' => env('PAYMENT_PUBLIC_URL', env('APP_URL', 'http://localhost')),

    /*
    |--------------------------------------------------------------------------
    | QR lifetime
    |--------------------------------------------------------------------------
    |
    | Give the QR enough time for a classroom demo. The payment can no longer
    | be confirmed once this expires.
    |
    */

    'qr_ttl_minutes' => (int) env('PAYMENT_QR_TTL_MINUTES', 60),

    'provider' => 'demo',

    'methods' => [
        'GCash',
        'Maya',
        'PayPal',
        'BDO',
        'Unionbank Internet Banking',
        'BPI',
    ],

];
