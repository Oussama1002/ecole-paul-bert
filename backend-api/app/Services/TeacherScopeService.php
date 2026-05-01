<?php

namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\Grade;
use App\Models\ScheduleEntry;
use App\Models\TeacherClassSubject;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

/**
 * Restricts grades and attendance for users with the "teacher" role to
 * classes / subjects / sessions they are assigned to (teacher_class_subjects, schedule_entries).
 */
class TeacherScopeService
{
    public function isStrictTeacher(User $user): bool
    {
        $user->loadMissing('role');

        return $user->role?->code === 'teacher';
    }

    public function resolveTeacherId(User $user): ?int
    {
        $user->loadMissing('teacher');

        return $user->teacher?->id;
    }

    /** @param  Builder<Grade>  $query */
    public function restrictGradesQuery(User $user, Builder $query): void
    {
        if (! $this->isStrictTeacher($user)) {
            return;
        }

        $tid = $this->resolveTeacherId($user);
        if ($tid === null) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereExists(function ($sub) use ($tid): void {
            $sub->selectRaw('1')
                ->from('teacher_class_subjects as tcs')
                ->whereColumn('tcs.class_id', 'grades.class_id')
                ->whereColumn('tcs.subject_id', 'grades.subject_id')
                ->whereColumn('tcs.school_year_id', 'grades.school_year_id')
                ->where('tcs.teacher_id', $tid)
                ->where(function ($q): void {
                    $q->whereNull('tcs.status')->orWhere('tcs.status', 'active');
                });
        });
    }

    public function assertGradeRowScope(User $user, Grade $grade): void
    {
        if (! $this->isStrictTeacher($user)) {
            return;
        }

        $this->assertTeacherTeachesClassSubject(
            $user,
            (int) $grade->school_year_id,
            (int) $grade->class_id,
            (int) $grade->subject_id
        );
    }

    /** @param  Builder<AttendanceRecord>  $query */
    public function restrictAttendanceQuery(User $user, Builder $query): void
    {
        if (! $this->isStrictTeacher($user)) {
            return;
        }

        $tid = $this->resolveTeacherId($user);
        if ($tid === null) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereExists(function ($sub) use ($tid): void {
            $sub->selectRaw('1')
                ->from('teacher_class_subjects as tcs')
                ->whereColumn('tcs.class_id', 'attendance_records.class_id')
                ->whereColumn('tcs.school_year_id', 'attendance_records.school_year_id')
                ->where('tcs.teacher_id', $tid)
                ->where(function ($q): void {
                    $q->whereNull('tcs.status')->orWhere('tcs.status', 'active');
                });
        });
    }

    public function assertTeacherTeachesClassSubject(User $user, int $schoolYearId, int $classId, int $subjectId): void
    {
        if (! $this->isStrictTeacher($user)) {
            return;
        }

        $tid = $this->requireTeacherProfile($user);

        if (! $this->teacherTeachesClassSubject($tid, $schoolYearId, $classId, $subjectId)) {
            throw ValidationException::withMessages([
                'scope' => ['Vous n’êtes pas affecté à cette matière pour cette classe.'],
            ]);
        }
    }

    public function assertTeacherTeachesClass(User $user, int $schoolYearId, int $classId): void
    {
        if (! $this->isStrictTeacher($user)) {
            return;
        }

        $tid = $this->requireTeacherProfile($user);

        if (! $this->teacherTeachesClass($tid, $schoolYearId, $classId)) {
            throw ValidationException::withMessages([
                'class_id' => ['Vous n’êtes pas affecté à cette classe pour cette année.'],
            ]);
        }
    }

    public function assertAttendanceWriteScope(
        User $user,
        int $schoolYearId,
        int $classId,
        ?int $subjectId,
        ?int $scheduleEntryId
    ): void {
        if (! $this->isStrictTeacher($user)) {
            return;
        }

        $tid = $this->requireTeacherProfile($user);

        if ($scheduleEntryId !== null) {
            $entry = ScheduleEntry::query()->find($scheduleEntryId);
            if (! $entry || (int) $entry->teacher_id !== $tid) {
                throw ValidationException::withMessages([
                    'schedule_entry_id' => ['Vous ne pouvez pas saisir la présence pour ce créneau.'],
                ]);
            }
            if ((int) $entry->school_year_id !== $schoolYearId || (int) $entry->class_id !== $classId) {
                throw ValidationException::withMessages([
                    'schedule_entry_id' => ['Le créneau ne correspond pas à la classe ou à l’année.'],
                ]);
            }

            return;
        }

        if ($subjectId !== null) {
            $this->assertTeacherTeachesClassSubject($user, $schoolYearId, $classId, $subjectId);

            return;
        }

        $this->assertTeacherTeachesClass($user, $schoolYearId, $classId);
    }

    private function requireTeacherProfile(User $user): int
    {
        $tid = $this->resolveTeacherId($user);
        if ($tid === null) {
            throw ValidationException::withMessages([
                'teacher' => ['Compte enseignant sans fiche professeur : contactez la direction.'],
            ]);
        }

        return $tid;
    }

    private function teacherTeachesClassSubject(int $teacherId, int $schoolYearId, int $classId, int $subjectId): bool
    {
        return TeacherClassSubject::query()
            ->where('teacher_id', $teacherId)
            ->where('school_year_id', $schoolYearId)
            ->where('class_id', $classId)
            ->where('subject_id', $subjectId)
            ->where(function ($q): void {
                $q->whereNull('status')->orWhere('status', 'active');
            })
            ->exists();
    }

    private function teacherTeachesClass(int $teacherId, int $schoolYearId, int $classId): bool
    {
        return TeacherClassSubject::query()
            ->where('teacher_id', $teacherId)
            ->where('school_year_id', $schoolYearId)
            ->where('class_id', $classId)
            ->where(function ($q): void {
                $q->whereNull('status')->orWhere('status', 'active');
            })
            ->exists();
    }
}
