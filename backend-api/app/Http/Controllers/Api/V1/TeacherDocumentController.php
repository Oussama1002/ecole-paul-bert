<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Teachers\StoreTeacherDocumentRequest;
use App\Http\Resources\TeacherDocumentResource;
use App\Http\Responses\ApiResponse;
use App\Models\Teacher;
use App\Models\TeacherDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TeacherDocumentController extends Controller
{
    public function index(Teacher $teacher): JsonResponse
    {
        $items = TeacherDocument::query()
            ->where('teacher_id', $teacher->id)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success(
            TeacherDocumentResource::collection($items)->resolve(),
            'Documents.'
        );
    }

    public function store(StoreTeacherDocumentRequest $request, Teacher $teacher): JsonResponse
    {
        $file = $request->file('file');
        $ext = $file->getClientOriginalExtension() ?: 'bin';
        $safe = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $filename = $safe.'_'.Str::uuid().'.'.$ext;
        $dir = 'teacher_documents/'.$teacher->id;
        $path = $file->storeAs($dir, $filename, 'local');

        $title = $request->validated('title') ?: $file->getClientOriginalName();

        $doc = TeacherDocument::query()->create([
            'teacher_id' => $teacher->id,
            'document_type' => $request->validated('document_type'),
            'title' => $title,
            'file_path' => $path,
            'uploaded_by' => $request->user()?->id,
            'issued_at' => $request->validated('issued_at'),
            'expires_at' => $request->validated('expires_at'),
            'notes' => $request->validated('notes'),
        ]);

        return ApiResponse::success(
            (new TeacherDocumentResource($doc))->resolve(),
            'Document enregistré.',
            201
        );
    }

    public function destroy(TeacherDocument $teacherDocument): JsonResponse
    {
        if ($teacherDocument->file_path && Storage::disk('local')->exists($teacherDocument->file_path)) {
            Storage::disk('local')->delete($teacherDocument->file_path);
        }
        $teacherDocument->delete();

        return ApiResponse::success(null, 'Document supprimé.');
    }

    public function download(\Illuminate\Http\Request $request, TeacherDocument $teacherDocument)
    {
        if (! $teacherDocument->file_path || ! Storage::disk('local')->exists($teacherDocument->file_path)) {
            return ApiResponse::error('Fichier introuvable.', [], 404);
        }
        $name = basename($teacherDocument->file_path);

        return Storage::disk('local')->download($teacherDocument->file_path, $name);
    }
}
