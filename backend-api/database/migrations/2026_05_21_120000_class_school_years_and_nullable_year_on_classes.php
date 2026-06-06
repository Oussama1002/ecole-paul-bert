<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const CLASS_FK_TABLES = [
        'announcements',
        'attendance_records',
        'bulletins',
        'enrollments',
        'grades',
        'grade_rankings',
        'schedule_entries',
        'student_class_assignments',
        'teacher_class_subjects',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('class_school_year')) {
            Schema::create('class_school_year', function (Blueprint $table) {
                $table->id();
                $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
                $table->foreignId('school_year_id')->constrained('school_years')->cascadeOnDelete();
                $table->unique(['class_id', 'school_year_id'], 'uq_class_school_year');
            });
        }

        if (Schema::hasColumn('classes', 'school_year_id')) {
            $existing = DB::table('classes')
                ->whereNotNull('school_year_id')
                ->select('id as class_id', 'school_year_id')
                ->get();

            foreach ($existing as $row) {
                DB::table('class_school_year')->insertOrIgnore([
                    'class_id' => $row->class_id,
                    'school_year_id' => $row->school_year_id,
                ]);
            }

            $this->mergeDuplicateClasses();

            try {
                Schema::table('classes', function (Blueprint $table) {
                    $table->dropUnique('uq_class_code_year');
                });
            } catch (\Throwable) {
                // Index may already be absent on some environments.
            }

            DB::table('classes')->update(['school_year_id' => null]);

            Schema::table('classes', function (Blueprint $table) {
                $table->unsignedBigInteger('school_year_id')->nullable()->change();
                if (! Schema::hasIndex('classes', 'uq_class_code')) {
                    $table->unique('code', 'uq_class_code');
                }
            });

            $this->attachAllSchoolYearsToEveryClass();
        }
    }

    private function attachAllSchoolYearsToEveryClass(): void
    {
        $yearIds = DB::table('school_years')->orderBy('start_date')->pluck('id')->all();
        if ($yearIds === []) {
            return;
        }

        $classIds = DB::table('classes')->pluck('id')->all();
        foreach ($classIds as $classId) {
            foreach ($yearIds as $yearId) {
                DB::table('class_school_year')->insertOrIgnore([
                    'class_id' => $classId,
                    'school_year_id' => $yearId,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            if (Schema::hasIndex('classes', 'uq_class_code')) {
                $table->dropUnique('uq_class_code');
            }
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->unsignedBigInteger('school_year_id')->nullable(false)->change();
            $table->unique(['school_year_id', 'code'], 'uq_class_code_year');
        });

        Schema::dropIfExists('class_school_year');
    }

    private function mergeDuplicateClasses(): void
    {
        $groups = DB::table('classes')
            ->select('level_id', 'name', DB::raw('MIN(id) as keep_id'))
            ->groupBy('level_id', 'name')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($groups as $group) {
            $keepId = (int) $group->keep_id;
            $dropIds = DB::table('classes')
                ->where('level_id', $group->level_id)
                ->where('name', $group->name)
                ->where('id', '!=', $keepId)
                ->pluck('id')
                ->all();

            foreach ($dropIds as $dropId) {
                $dropId = (int) $dropId;

                foreach (self::CLASS_FK_TABLES as $table) {
                    if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'class_id')) {
                        continue;
                    }
                    DB::table($table)->where('class_id', $dropId)->update(['class_id' => $keepId]);
                }

                $yearIds = DB::table('class_school_year')
                    ->where('class_id', $dropId)
                    ->pluck('school_year_id');

                foreach ($yearIds as $yearId) {
                    DB::table('class_school_year')->insertOrIgnore([
                        'class_id' => $keepId,
                        'school_year_id' => $yearId,
                    ]);
                }

                DB::table('class_school_year')->where('class_id', $dropId)->delete();
                DB::table('classes')->where('id', $dropId)->delete();
            }
        }
    }
};
