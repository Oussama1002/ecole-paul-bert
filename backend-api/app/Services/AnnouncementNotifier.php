<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Guardian;
use App\Models\User;
use App\Notifications\AnnouncementBroadcast;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Broadcasts a published announcement to parents (guardians) and/or staff
 * (users) via the email/SMS/in-app notification pipeline.
 *
 * Recipients are processed in chunks so a school-wide announcement does not
 * load every guardian into memory at once. All sending is best-effort.
 */
class AnnouncementNotifier
{
    public function broadcast(Announcement $announcement, bool $notifyParents, bool $notifyStaff): void
    {
        if (! $notifyParents && ! $notifyStaff) {
            return;
        }

        $notification = new AnnouncementBroadcast(
            title: (string) $announcement->title,
            content: (string) $announcement->content,
            announcementId: (int) $announcement->id,
        );

        if ($notifyParents) {
            $this->notifyGuardians($notification);
        }

        if ($notifyStaff) {
            $this->notifyStaff($notification);
        }
    }

    private function notifyGuardians(AnnouncementBroadcast $notification): void
    {
        Guardian::query()
            ->where(function ($q) {
                $q->whereNotNull('email')->where('email', '!=', '')
                    ->orWhereNotNull('phone')->where('phone', '!=', '');
            })
            ->chunkById(200, function ($guardians) use ($notification) {
                try {
                    Notification::send($guardians, $notification);
                } catch (\Throwable $e) {
                    Log::error('announcement.notify_guardians failed: '.$e->getMessage());
                }
            });
    }

    private function notifyStaff(AnnouncementBroadcast $notification): void
    {
        User::query()
            ->where('status', 'active')
            ->chunkById(200, function ($users) use ($notification) {
                try {
                    Notification::send($users, $notification);
                } catch (\Throwable $e) {
                    Log::error('announcement.notify_staff failed: '.$e->getMessage());
                }
            });
    }
}
