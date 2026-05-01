<?php

return [
    'alerts' => [
        // Sliding window size for alerts
        'window_days' => env('ATTENDANCE_ALERT_WINDOW_DAYS', 30),

        // Unjustified absences count threshold
        'unjustified_absences_threshold' => env('ATTENDANCE_ALERT_UNJUSTIFIED_ABSENCES_THRESHOLD', 3),

        // Late events count threshold
        'late_count_threshold' => env('ATTENDANCE_ALERT_LATE_COUNT_THRESHOLD', 5),
    ],
];

