<?php

return [

    /*
    |--------------------------------------------------------------------------
    | SMS Provider (HTTP-based, provider-agnostic)
    |--------------------------------------------------------------------------
    |
    | The SMS channel POSTs a small JSON payload to a configurable endpoint.
    | This keeps the integration provider-agnostic: it works with Twilio,
    | Africa's Talking, Orange SMS API, or any HTTP gateway that accepts a
    | recipient + message. Configure the endpoint and credentials via env.
    |
    | Set SMS_PROVIDER_URL to enable real sending. When it is empty the
    | channel logs the message instead of calling an external service, which
    | keeps local/dev environments quiet and avoids accidental sends.
    |
    */

    'provider_url' => env('SMS_PROVIDER_URL'),

    'api_key' => env('SMS_API_KEY'),

    'sender_name' => env('SMS_SENDER_NAME', 'Paul Bert'),

    // Default country calling code (digits only, no "+") used to normalize
    // local guardian phone numbers into E.164-ish international form.
    'default_country_code' => env('SMS_DEFAULT_COUNTRY_CODE', '221'),

    // How the API key is sent to the provider: 'bearer' (Authorization:
    // Bearer <key>), 'header' (X-API-Key: <key>) or 'body' (key in payload).
    'auth_mode' => env('SMS_AUTH_MODE', 'bearer'),

    // Request timeout in seconds.
    'timeout' => (int) env('SMS_TIMEOUT', 15),

];
