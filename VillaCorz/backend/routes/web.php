
<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Mail;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/test-email', function () {
    Mail::raw('Congratulations! VillaCorz email sending is working.', function ($message) {
        $message->to('dlord0260@gmail.com')
                ->subject('VillaCorz Email Test');
    });

    return 'Test email sent successfully!';
});
