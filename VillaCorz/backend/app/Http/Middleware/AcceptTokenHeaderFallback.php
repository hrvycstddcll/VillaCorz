<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AcceptTokenHeaderFallback
{
    public function handle(Request $request, Closure $next): Response
    {
        $authorization = trim((string) $request->header('Authorization', ''));

        if ($authorization === '') {
            $token = trim((string) $request->header('X-VillaCorz-Token', ''));
            $token = preg_replace('/^bearer\s+/i', '', $token) ?? '';

            if ($token !== '') {
                $request->headers->set('Authorization', 'Bearer '.$token);
            }
        }

        return $next($request);
    }
}
