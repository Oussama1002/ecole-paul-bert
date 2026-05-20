<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Announcements\IndexAnnouncementRequest;
use App\Http\Requests\Api\V1\Announcements\StoreAnnouncementRequest;
use App\Http\Requests\Api\V1\Announcements\UpdateAnnouncementRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Announcement;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\SystemNotificationDispatcher;
use App\Services\TeacherScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Schema;

class AnnouncementController extends Controller
{
    public function __construct(
        private AuditLogger $audit,
        private SystemNotificationDispatcher $notify,
        private TeacherScopeService $teacherScope
    ) {}

    public function index(IndexAnnouncementRequest $request): JsonResponse
    {
        $q = Announcement::query()->orderByDesc('id');

        /** @var User|null $user */
        $user = $request->user();
        $portalReader = $user && $this->teacherScope->isStrictTeacher($user);

        if ($portalReader && Schema::hasColumn('announcements', 'status')) {
            $q->where('status', 'published');
            $q->whereIn('audience_type', ['all', 'teachers', 'staff']);
        } elseif ($s = $request->validated('status')) {
            if (Schema::hasColumn('announcements', 'status')) {
                $q->where('status', $s);
            }
        }
        if ($a = $request->validated('audience_type')) {
            $q->where('audience_type', $a);
        }
        if ($cid = $request->validated('class_id')) {
            $q->where('class_id', $cid);
        }

        $per = min((int) $request->input('per_page', 30), 100);
        $p = $q->paginate($per)->withQueryString();

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (Announcement $x) => $this->toDto($x)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Annonces.');
    }

    public function show(Announcement $announcement, \Illuminate\Http\Request $request): JsonResponse
    {
        $this->assertAnnouncementReadable($request->user(), $announcement);

        return ApiResponse::success($this->toDto($announcement), 'Annonce.');
    }

    private function assertAnnouncementReadable(?User $user, Announcement $announcement): void
    {
        if (! $user || ! $this->teacherScope->isStrictTeacher($user)) {
            return;
        }
        if (! Schema::hasColumn('announcements', 'status')) {
            return;
        }
        if ($announcement->status !== 'published') {
            throw new \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException('Annonce non publiée.');
        }
        if (! in_array($announcement->audience_type, ['all', 'teachers', 'staff'], true)) {
            throw new \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException('Annonce non destinée aux enseignants.');
        }
    }

    public function store(StoreAnnouncementRequest $request): JsonResponse
    {
        $data = $request->validated();
        if (! Schema::hasColumn('announcements', 'status')) {
            unset($data['status']);
        } else {
            $data['status'] = $data['status'] ?? 'draft';
        }
        $data['priority'] = $data['priority'] ?? 'normal';
        if (($data['audience_type'] ?? '') !== 'class_specific') {
            $data['class_id'] = null;
        }
        if (Schema::hasColumn('announcements', 'published_by')) {
            $data['published_by'] = $request->user()?->id;
        }

        $ann = Announcement::query()->create($data);

        $this->audit->log($request->user(), 'announcement.created', $ann, null, $ann->only(array_keys($data)));

        if (($ann->status ?? '') === 'published') {
            $this->broadcastPublished($ann);
        }

        return ApiResponse::success($this->toDto($ann), 'Annonce créée.', 201);
    }

    public function update(UpdateAnnouncementRequest $request, Announcement $announcement): JsonResponse
    {
        $before = $announcement->getAttributes();
        $data = $request->validated();
        if (array_key_exists('audience_type', $data) && ($data['audience_type'] ?? '') !== 'class_specific') {
            $data['class_id'] = null;
        }

        $announcement->fill($data);
        $announcement->save();

        $this->audit->log(
            $request->user(),
            'announcement.updated',
            $announcement,
            $before,
            $announcement->getChanges()
        );

        if ($announcement->wasChanged('status') && $announcement->status === 'published') {
            $this->broadcastPublished($announcement);
        }

        return ApiResponse::success($this->toDto($announcement->fresh()), 'Annonce mise à jour.');
    }

    public function destroy(Announcement $announcement, \Illuminate\Http\Request $request): JsonResponse
    {
        $id = $announcement->id;
        $announcement->delete();

        $this->audit->log($request->user(), 'announcement.deleted', null, ['id' => $id], null);

        return ApiResponse::success(null, 'Annonce supprimée.');
    }

    public function publish(Announcement $announcement, \Illuminate\Http\Request $request): JsonResponse
    {
        if (Schema::hasColumn('announcements', 'status')) {
            $announcement->status = 'published';
            if (Schema::hasColumn('announcements', 'published_by')) {
                $announcement->published_by = $request->user()?->id;
            }
            $announcement->save();
        }

        $this->audit->log($request->user(), 'announcement.published', $announcement, null, ['status' => 'published']);
        $this->broadcastPublished($announcement);

        return ApiResponse::success($this->toDto($announcement->fresh()), 'Annonce publiée.');
    }

    public function archive(Announcement $announcement, \Illuminate\Http\Request $request): JsonResponse
    {
        if (Schema::hasColumn('announcements', 'status')) {
            $announcement->status = 'archived';
            $announcement->save();
        }

        $this->audit->log($request->user(), 'announcement.archived', $announcement, null, ['status' => 'archived']);

        return ApiResponse::success($this->toDto($announcement->fresh()), 'Annonce archivée.');
    }

    /**
     * @return array<string, mixed>
     */
    private function toDto(Announcement $a): array
    {
        return [
            'id' => $a->id,
            'title' => $a->title,
            'content' => $a->content,
            'audience_type' => $a->audience_type,
            'class_id' => $a->class_id,
            'start_date' => $a->start_date?->format('Y-m-d'),
            'end_date' => $a->end_date?->format('Y-m-d'),
            'priority' => $a->priority,
            'published_by' => $a->published_by ?? null,
            'status' => Schema::hasColumn('announcements', 'status') ? $a->status : 'published',
            'created_at' => $a->created_at?->toIso8601String(),
            'updated_at' => $a->updated_at?->toIso8601String(),
        ];
    }

    private function broadcastPublished(Announcement $announcement): void
    {
        $this->notify->notifyUsersWithPermission(
            'notifications.view',
            'announcement.published',
            'Nouvelle annonce : '.$announcement->title,
            null,
            ['announcement_id' => $announcement->id]
        );
    }
}
