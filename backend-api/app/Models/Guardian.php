<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;

class Guardian extends Model
{
    use Notifiable;

    protected $fillable = [
        'first_name',
        'last_name',
        'relationship_type',
        'phone',
        'alternate_phone',
        'email',
        'profession',
        'national_id',
        'address',
        'city',
        'is_primary_contact',
    ];

    protected function casts(): array
    {
        return [
            'is_primary_contact' => 'boolean',
        ];
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'student_guardians')
            ->using(StudentGuardian::class)
            ->withPivot([
                'is_legal_guardian',
                'can_receive_notifications',
                'can_pickup_student',
                'is_primary_contact',
            ])
            ->withTimestamps(false);
    }

    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(NotificationPreference::class);
    }

    /**
     * Route mail notifications to the guardian's email address.
     */
    public function routeNotificationForMail(): ?string
    {
        $email = trim((string) $this->email);

        return $email !== '' ? $email : null;
    }

    /**
     * Route SMS notifications to the guardian's phone, normalized to
     * international form using the configured default country code.
     */
    public function routeNotificationForSms(): ?string
    {
        return self::normalizePhone(
            (string) $this->phone,
            (string) config('sms.default_country_code', '')
        );
    }

    /**
     * Best-effort normalization of a local phone number into an international
     * "+<cc><number>" string. Returns null when there is nothing to send to.
     */
    public static function normalizePhone(string $raw, string $countryCode): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        // Already international.
        if (str_starts_with($raw, '+')) {
            $digits = preg_replace('/\D/', '', $raw);

            return $digits !== '' ? '+'.$digits : null;
        }

        $digits = preg_replace('/\D/', '', $raw);
        if ($digits === null || $digits === '') {
            return null;
        }

        // Handle "00" international prefix.
        if (str_starts_with($digits, '00')) {
            return '+'.substr($digits, 2);
        }

        $cc = preg_replace('/\D/', '', $countryCode);
        if ($cc === null || $cc === '') {
            return '+'.$digits;
        }

        // Drop a leading national trunk "0" before prefixing the country code.
        $local = ltrim($digits, '0');
        if ($local === '') {
            $local = $digits;
        }

        // Avoid double country code when the number already includes it.
        if (str_starts_with($digits, $cc)) {
            return '+'.$digits;
        }

        return '+'.$cc.$local;
    }
}
