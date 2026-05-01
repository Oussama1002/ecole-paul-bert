<?php

namespace App\Services;

use App\Models\Document;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentStorageService
{
    private const ALLOWED_EXTENSIONS = [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'odt', 'ods',
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
        'txt', 'csv',
    ];

    private const ALLOWED_MIMES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
        'text/plain',
        'text/csv',
    ];

    /**
     * Store a file in private local storage.
     * Validates extension and real MIME type before storing.
     */
    public function store(Document $doc, UploadedFile $file): void
    {
        $this->validateFile($file);

        $ext = strtolower($file->getClientOriginalExtension());
        $safeBase = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $filename = $safeBase.'_'.Str::uuid().'.'.$ext;

        $dir = $this->directoryFor($doc);
        $path = trim($dir, '/').'/'.$filename;

        Storage::disk('local')->putFileAs($dir, $file, $filename);

        $doc->file_name = $file->getClientOriginalName();
        $doc->file_path = $path;
        $doc->mime_type = $file->getMimeType();
        $doc->file_size = $file->getSize();
    }

    public function validateFile(UploadedFile $file): void
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: '');
        if (! in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
            abort(422, 'Type de fichier non autorisé. Extensions acceptées : '.implode(', ', self::ALLOWED_EXTENSIONS).'.');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $realMime = $finfo->file($file->getRealPath());
        if (! in_array($realMime, self::ALLOWED_MIMES, true)) {
            abort(422, 'Type de fichier invalide. Seuls les documents, images et tableurs sont acceptés.');
        }
    }

    private function directoryFor(Document $doc): string
    {
        $category = $doc->category ?: 'general';
        $type = $doc->document_type ?: 'file';

        $parts = ['documents', $category, $type];

        if ($doc->student_id) {
            $parts[] = 'student_'.$doc->student_id;
        } elseif ($doc->teacher_id) {
            $parts[] = 'teacher_'.$doc->teacher_id;
        } elseif ($doc->invoice_id) {
            $parts[] = 'invoice_'.$doc->invoice_id;
        } elseif ($doc->payment_id) {
            $parts[] = 'payment_'.$doc->payment_id;
        } elseif ($doc->expense_id) {
            $parts[] = 'expense_'.$doc->expense_id;
        }

        return implode('/', $parts);
    }
}

