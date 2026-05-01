<?php

return [
    'upload' => [
        'max_kb' => env('DOCUMENTS_MAX_KB', 10240), // 10MB
        'allowed_mimes' => explode(',', env('DOCUMENTS_ALLOWED_MIMES', 'application/pdf,image/jpeg,image/png')),
    ],
    'visibility_scopes' => [
        // In this admin app we keep it simple; can be extended later.
        'staff',
        'admin',
        'private',
    ],
];

