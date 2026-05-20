<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Subject codes for École Paul Bert (e.g. Anglais → ANG-PB).
 */
class PaulBertSubjectCode
{
    public const SUFFIX = '-PB';

    /**
     * @param  callable(string): bool  $exists  Returns true when the full code is already taken.
     */
    public static function fromName(string $name, callable $exists): string
    {
        $base = self::prefixFromName($name);
        $code = $base.self::SUFFIX;
        $n = 2;
        while ($exists($code)) {
            $code = $base.self::SUFFIX.'-'.$n;
            $n++;
        }

        return $code;
    }

    public static function prefixFromName(string $name): string
    {
        $ascii = strtoupper(Str::ascii(trim($name)));
        $tokens = preg_split('/[\s\-\/&+,]+/u', $ascii, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if (count($tokens) > 1) {
            $prefix = '';
            foreach ($tokens as $token) {
                $letters = preg_replace('/[^A-Z0-9]/', '', $token) ?? '';
                if ($letters !== '') {
                    $prefix .= $letters[0];
                }
            }

            return $prefix !== '' ? $prefix : 'MAT';
        }

        $word = preg_replace('/[^A-Z0-9]/', '', $tokens[0] ?? '') ?? '';

        if ($word === '') {
            return 'MAT';
        }

        if (strlen($word) <= 4) {
            return $word;
        }

        if (str_starts_with($word, 'MATHEM')) {
            return 'MATH';
        }

        if (str_starts_with($word, 'FRANCAIS')) {
            return 'FR';
        }

        return substr($word, 0, 3);
    }
}
