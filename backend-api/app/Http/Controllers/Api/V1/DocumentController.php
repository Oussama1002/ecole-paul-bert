<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Documents\StoreDocumentRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Document;
use App\Models\DocumentAccessLog;
use App\Models\Student;
use App\Services\AuditLogger;
use App\Services\DocumentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DocumentController extends Controller
{
    public function __construct(
        private DocumentStorageService $storage,
        private AuditLogger $audit
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'category' => ['nullable', 'string'],
            'document_type' => ['nullable', 'string'],
            'search' => ['nullable', 'string', 'max:120'],
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
            'teacher_id' => ['nullable', 'integer', 'exists:teachers,id'],
            'invoice_id' => ['nullable', 'integer', 'exists:invoices,id'],
            'payment_id' => ['nullable', 'integer', 'exists:payments,id'],
            'expense_id' => ['nullable', 'integer', 'exists:expenses,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = Document::query()
            ->with([
                'student:id,first_name,last_name,student_code',
                'payment.student:id,first_name,last_name,student_code',
                'invoice.student:id,first_name,last_name,student_code',
            ])
            ->orderByDesc('created_at');
        foreach (['category', 'document_type'] as $k) {
            if ($request->filled($k)) {
                $q->where($k, (string) $request->input($k));
            }
        }
        foreach (['student_id', 'teacher_id', 'invoice_id', 'payment_id', 'expense_id'] as $k) {
            if ($request->filled($k)) {
                $q->where($k, (int) $request->input($k));
            }
        }
        if ($request->filled('search')) {
            $term = '%'.Str::lower(trim((string) $request->input('search'))).'%';
            $q->where(function ($w) use ($term) {
                foreach (['title', 'description', 'file_name', 'category', 'document_type'] as $col) {
                    $w->orWhereRaw("LOWER({$col}) LIKE ?", [$term]);
                }
                $studentMatch = function ($s) use ($term) {
                    $s->where(function ($q) use ($term) {
                        $q->whereRaw('LOWER(first_name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(last_name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(student_code) LIKE ?', [$term])
                            ->orWhereRaw("LOWER(CONCAT(last_name, ' ', first_name)) LIKE ?", [$term])
                            ->orWhereRaw("LOWER(CONCAT(first_name, ' ', last_name)) LIKE ?", [$term]);
                    });
                };
                $w->orWhereHas('student', $studentMatch)
                    ->orWhereHas('payment.student', $studentMatch)
                    ->orWhereHas('invoice.student', $studentMatch);
            });
        }

        $p = $q->paginate(min((int) $request->input('per_page', 30), 100))->withQueryString();

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (Document $d) => $this->toDto($d)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Documents.');
    }

    public function show(Request $request, Document $document): JsonResponse
    {
        $this->assertCanAccessDocument($request, $document);
        $this->logAccess($request, $document, 'view');
        return ApiResponse::success($this->toDto($document), 'Document.');
    }

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $data = $request->validated();

        $linkCount = 0;
        foreach (['student_id', 'teacher_id', 'invoice_id', 'payment_id', 'expense_id'] as $k) {
            if (! empty($data[$k])) {
                $linkCount++;
            }
        }
        if ($linkCount > 1) {
            throw ValidationException::withMessages([
                'link' => ['Le document ne peut être lié qu’à une seule entité (élève/enseignant/facture/paiement/dépense).'],
            ]);
        }

        $file = $request->file('file');

        $doc = new Document();
        $doc->fill([
            'category' => $data['category'] ?? 'general',
            'document_type' => $data['document_type'] ?? 'file',
            'title' => $data['title'] ?? $file->getClientOriginalName(),
            'description' => $data['description'] ?? null,
            'visibility_scope' => $data['visibility_scope'] ?? 'staff',
            'is_confidential' => (bool) ($data['is_confidential'] ?? false),
            'student_id' => $data['student_id'] ?? null,
            'teacher_id' => $data['teacher_id'] ?? null,
            'invoice_id' => $data['invoice_id'] ?? null,
            'payment_id' => $data['payment_id'] ?? null,
            'expense_id' => $data['expense_id'] ?? null,
            'uploaded_by' => $request->user()?->id,
            'status' => 'active',
        ]);

        try {
            $doc->save();
            $this->storage->store($doc, $file);
            $doc->save();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('document.store failed: '.$e->getMessage().' | '.$e->getFile().':'.$e->getLine());
            if ($doc->exists) {
                $doc->forceDelete();
            }
            return ApiResponse::error('Erreur upload: '.$e->getMessage(), [], 500);
        }

        try {
            $this->logAccess($request, $doc, 'upload');
            $this->audit->log(
                $request->user(),
                'document.created',
                $doc,
                null,
                $doc->only(['category', 'document_type', 'title', 'status', 'visibility_scope', 'is_confidential'])
            );
        } catch (\Throwable) {}

        return ApiResponse::success($this->toDto($doc->fresh()), 'Document uploadé.', 201);
    }

    public function download(Request $request, Document $document)
    {
        $this->assertCanAccessDocument($request, $document);
        $this->logAccess($request, $document, 'download');
        $this->audit->log(
            $request->user(),
            'document.downloaded',
            $document,
            null,
            $document->only(['id', 'title', 'category', 'document_type', 'status'])
        );

        if (! $document->file_path || ! Storage::disk('local')->exists($document->file_path)) {
            return ApiResponse::error('Fichier introuvable.', [], 404);
        }

        return Storage::disk('local')->download($document->file_path, $document->file_name ?: ('document_'.$document->id), [
            'Content-Type' => $document->mime_type ?: 'application/octet-stream',
        ]);
    }

    public function destroy(Request $request, Document $document): JsonResponse
    {
        $this->logAccess($request, $document, 'delete');
        $before = $document->only(['status', 'title', 'category', 'document_type']);

        $document->status = 'deleted';
        $document->save();
        $document->delete(); // soft delete
        $this->audit->log(
            $request->user(),
            'document.archived',
            $document,
            $before,
            ['status' => 'deleted', 'deleted' => true]
        );

        return ApiResponse::success(null, 'Document supprimé.');
    }

    /**
     * Confidentiality + scope gate. Confidential documents and documents with
     * `visibility_scope = staff` require `documents.manage`. The `documents.view`
     * permission alone is not enough for these.
     */
    private function assertCanAccessDocument(Request $request, Document $document): void
    {
        $user = $request->user();
        if (! $user) {
            abort(403, 'Accès refusé.');
        }

        $canManage = $user->hasPermission('documents.manage');
        $confidential = (bool) $document->is_confidential;
        $scope = (string) ($document->visibility_scope ?? 'staff');

        if (($confidential || $scope === 'staff') && ! $canManage) {
            abort(403, 'Document confidentiel : autorisation insuffisante.');
        }
    }

    private function logAccess(Request $request, Document $document, string $action): void
    {
        DocumentAccessLog::writeAccess(
            (int) $document->id,
            $request->user()?->id ? (int) $request->user()?->id : null,
            $action,
            $request->ip(),
            substr((string) $request->userAgent(), 0, 500),
            now()
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function toDto(Document $d): array
    {
        $student = $this->resolveLinkedStudent($d);

        return [
            'id' => $d->id,
            'category' => $d->category,
            'document_type' => $d->document_type,
            'title' => $d->title,
            'description' => $d->description,
            'file_name' => $d->file_name,
            'mime_type' => $d->mime_type,
            'file_size' => $d->file_size,
            'visibility_scope' => $d->visibility_scope,
            'is_confidential' => (bool) $d->is_confidential,
            'status' => $d->status,
            'student_id' => $student?->id ?? ($d->student_id ? (int) $d->student_id : null),
            'student_name' => $student
                ? trim($student->last_name.' '.$student->first_name)
                : null,
            'teacher_id' => $d->teacher_id ? (int) $d->teacher_id : null,
            'invoice_id' => $d->invoice_id ? (int) $d->invoice_id : null,
            'payment_id' => $d->payment_id ? (int) $d->payment_id : null,
            'expense_id' => $d->expense_id ? (int) $d->expense_id : null,
            'uploaded_by' => $d->uploaded_by ? (int) $d->uploaded_by : null,
            'created_at' => $d->created_at?->toIso8601String(),
        ];
    }

    private function resolveLinkedStudent(Document $d): ?Student
    {
        if ($d->relationLoaded('student') && $d->student) {
            return $d->student;
        }
        if ($d->relationLoaded('payment') && $d->payment?->relationLoaded('student') && $d->payment->student) {
            return $d->payment->student;
        }
        if ($d->relationLoaded('invoice') && $d->invoice?->relationLoaded('student') && $d->invoice->student) {
            return $d->invoice->student;
        }

        return null;
    }
}

