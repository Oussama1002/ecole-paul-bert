<?php

return [
    'ranking' => [
        // competition: 1,1,3... ; dense: 1,1,2...
        'strategy' => env('GRADES_RANKING_STRATEGY', 'competition'),
    ],
];

