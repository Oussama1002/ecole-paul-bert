<?php

use App\Http\Controllers\Api\V1\AcademicTermController;
use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\AppSettingController;
use App\Http\Controllers\Api\V1\AttendanceRecordController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\EnrollmentController;
use App\Http\Controllers\Api\V1\EvaluationPeriodController;
use App\Http\Controllers\Api\V1\GradeController;
use App\Http\Controllers\Api\V1\GradeAnalyticsController;
use App\Http\Controllers\Api\V1\GuardianController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\InternalNotificationController;
use App\Http\Controllers\Api\V1\LevelController;
use App\Http\Controllers\Api\V1\ExpenseCategoryController;
use App\Http\Controllers\Api\V1\FeeTypeController;
use App\Http\Controllers\Api\V1\FeeAssignmentController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\FinanceReportController;
use App\Http\Controllers\Api\V1\FinanceBilanController;
use App\Http\Controllers\Api\V1\ReportCardController;
use App\Http\Controllers\Api\V1\ReportCardTemplateController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\RoomController;
use App\Http\Controllers\Api\V1\ScheduleEntryController;
use App\Http\Controllers\Api\V1\SchoolClassController;
use App\Http\Controllers\Api\V1\SchoolYearController;
use App\Http\Controllers\Api\V1\SimpleAttendanceController;
use App\Http\Controllers\Api\V1\SimpleFinanceController;
use App\Http\Controllers\Api\V1\SimpleSchoolSettingsController;
use App\Http\Controllers\Api\V1\TeacherObservationController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Controllers\Api\V1\SubjectController;
use App\Http\Controllers\Api\V1\TeacherAssignmentController;
use App\Http\Controllers\Api\V1\TeacherController;
use App\Http\Controllers\Api\V1\TeacherDocumentController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', HealthController::class);

    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:forgot-password');

    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:forgot-password');

    Route::middleware(['auth:sanctum', 'throttle:api', 'block_unready_portal_roles', 'audit.activity'])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

        // App-wide settings (simple/advanced mode). Read = any authenticated user.
        // Write = admin-role check inside controller.
        Route::get('/app-settings', [AppSettingController::class, 'index']);
        Route::patch('/app-settings', [AppSettingController::class, 'update']);

        Route::get('/simple-school-settings', [SimpleSchoolSettingsController::class, 'show']);
        Route::patch('/simple-school-settings', [SimpleSchoolSettingsController::class, 'update']);
        Route::post('/simple-school-settings/logo', [SimpleSchoolSettingsController::class, 'uploadLogo']);

        Route::middleware('permission:users.view')->get('/roles', [RoleController::class, 'index']);

        Route::get('/users/{user}', [UserController::class, 'show']);

        Route::middleware('permission:users.view')->get('/users', [UserController::class, 'index']);
        Route::middleware('permission:users.create')->post('/users', [UserController::class, 'store']);
        Route::middleware('permission:users.edit')->patch('/users/{user}', [UserController::class, 'update']);
        Route::middleware('permission:users.deactivate')->delete('/users/{user}', [UserController::class, 'destroy']);

        Route::middleware('permission:school_years.view')->get('/school-years', [SchoolYearController::class, 'index']);
        Route::middleware('permission:school_years.view')->get('/school-years/{schoolYear}', [SchoolYearController::class, 'show']);
        Route::middleware('permission:school_years.manage')->post('/school-years', [SchoolYearController::class, 'store']);
        Route::middleware('permission:school_years.manage')->patch('/school-years/{schoolYear}', [SchoolYearController::class, 'update']);
        Route::middleware('permission:school_years.manage')->delete('/school-years/{schoolYear}', [SchoolYearController::class, 'destroy']);
        Route::middleware('permission:school_years.manage')->post('/school-years/{schoolYear}/set-current', [SchoolYearController::class, 'setCurrent']);

        Route::middleware('permission:levels.view')->get('/levels', [LevelController::class, 'index']);
        Route::middleware('permission:levels.view')->get('/levels/{level}', [LevelController::class, 'show']);
        Route::middleware('permission:levels.manage')->post('/levels', [LevelController::class, 'store']);
        Route::middleware('permission:levels.manage')->patch('/levels/{level}', [LevelController::class, 'update']);
        Route::middleware('permission:levels.manage')->delete('/levels/{level}', [LevelController::class, 'destroy']);

        Route::middleware('permission:classes.view')->get('/classes', [SchoolClassController::class, 'index']);
        Route::middleware('permission:classes.view')->get('/classes/{schoolClass}', [SchoolClassController::class, 'show']);
        Route::middleware('permission:classes.manage')->post('/classes', [SchoolClassController::class, 'store']);
        Route::middleware('permission:classes.manage')->patch('/classes/{schoolClass}', [SchoolClassController::class, 'update']);
        Route::middleware('permission:classes.manage')->delete('/classes/{schoolClass}', [SchoolClassController::class, 'destroy']);

        Route::middleware('permission:subjects.view')->get('/subjects', [SubjectController::class, 'index']);
        Route::middleware('permission:subjects.view')->get('/subjects/{subject}', [SubjectController::class, 'show']);
        Route::middleware('permission:subjects.manage')->post('/subjects', [SubjectController::class, 'store']);
        Route::middleware('permission:subjects.manage')->patch('/subjects/{subject}', [SubjectController::class, 'update']);
        Route::middleware('permission:subjects.manage')->delete('/subjects/{subject}', [SubjectController::class, 'destroy']);

        Route::middleware('permission:academic_terms.view')->get('/academic-terms', [AcademicTermController::class, 'index']);
        Route::middleware('permission:academic_terms.view')->get('/academic-terms/{academicTerm}', [AcademicTermController::class, 'show']);
        Route::middleware('permission:academic_terms.manage')->post('/academic-terms', [AcademicTermController::class, 'store']);
        Route::middleware('permission:academic_terms.manage')->patch('/academic-terms/{academicTerm}', [AcademicTermController::class, 'update']);
        Route::middleware('permission:academic_terms.manage')->delete('/academic-terms/{academicTerm}', [AcademicTermController::class, 'destroy']);

        Route::middleware('permission:evaluation_periods.view')->get('/evaluation-periods', [EvaluationPeriodController::class, 'index']);
        Route::middleware('permission:evaluation_periods.view')->get('/evaluation-periods/{evaluationPeriod}', [EvaluationPeriodController::class, 'show']);
        Route::middleware('permission:evaluation_periods.manage')->post('/evaluation-periods', [EvaluationPeriodController::class, 'store']);
        Route::middleware('permission:evaluation_periods.manage')->patch('/evaluation-periods/{evaluationPeriod}', [EvaluationPeriodController::class, 'update']);
        Route::middleware('permission:evaluation_periods.manage')->delete('/evaluation-periods/{evaluationPeriod}', [EvaluationPeriodController::class, 'destroy']);

        Route::middleware('permission:rooms.view')->get('/rooms', [RoomController::class, 'index']);
        Route::middleware('permission:rooms.view')->get('/rooms/{room}', [RoomController::class, 'show']);
        Route::middleware('permission:rooms.manage')->post('/rooms', [RoomController::class, 'store']);
        Route::middleware('permission:rooms.manage')->patch('/rooms/{room}', [RoomController::class, 'update']);
        Route::middleware('permission:rooms.manage')->delete('/rooms/{room}', [RoomController::class, 'destroy']);

        Route::middleware('permission:schedule.view')->get('/schedule/weekly', [ScheduleEntryController::class, 'weekly']);
        Route::middleware('permission:schedule.view')->get('/schedule-entries', [ScheduleEntryController::class, 'index']);
        Route::middleware('permission:schedule.manage')->post('/schedule-entries', [ScheduleEntryController::class, 'store']);
        Route::middleware('permission:schedule.view')->get('/schedule-entries/{scheduleEntry}', [ScheduleEntryController::class, 'show']);
        Route::middleware('permission:schedule.manage')->patch('/schedule-entries/{scheduleEntry}', [ScheduleEntryController::class, 'update']);
        Route::middleware('permission:schedule.manage')->delete('/schedule-entries/{scheduleEntry}', [ScheduleEntryController::class, 'destroy']);
        Route::middleware('permission:schedule.view')->get('/classes/{schoolClass}/schedule-entries', [ScheduleEntryController::class, 'forClass']);
        Route::middleware('permission:schedule.view')->get('/rooms/{room}/schedule-entries', [ScheduleEntryController::class, 'forRoom']);

        Route::middleware('permission:students.export')->get('/students/export', [StudentController::class, 'export']);
        Route::middleware('permission:students.export')->get('/students/export.xlsx', [StudentController::class, 'exportExcel']);
        Route::middleware('permission:students.import')->post('/students/import', [StudentController::class, 'import']);
        Route::middleware('permission:students.manage')->get('/students/next-code', [StudentController::class, 'nextCode']);
        Route::middleware('permission:students.view')->get('/students', [StudentController::class, 'index']);
        Route::middleware('permission:students.manage')->post('/students', [StudentController::class, 'store']);
        Route::middleware('permission:students.view')->get('/students/{student}/history', [StudentController::class, 'history']);
        Route::middleware('permission:students.view')->get('/students/{student}/grades', [StudentController::class, 'grades']);
        Route::middleware('permission:students.view')->get('/students/{student}/attendance', [StudentController::class, 'attendance']);
        Route::middleware('permission:students.view')->get('/students/{student}/documents', [StudentController::class, 'documents']);
        Route::middleware('permission:students.view')->get('/students/{student}/finance', [StudentController::class, 'finance']);
        Route::middleware('permission:students.view')->get('/students/{student}', [StudentController::class, 'show']);
        Route::middleware('permission:students.manage')->patch('/students/{student}', [StudentController::class, 'update']);
        Route::middleware('permission:students.manage')->delete('/students/{student}', [StudentController::class, 'destroy']);
        Route::middleware('permission:students.manage')->delete('/students/{student}/force', [StudentController::class, 'forceDestroy']);

        Route::middleware('permission:guardians.view')->get('/guardians', [GuardianController::class, 'index']);
        Route::middleware('permission:guardians.view')->get('/guardians/{guardian}', [GuardianController::class, 'show']);
        Route::middleware('permission:guardians.manage')->post('/guardians', [GuardianController::class, 'store']);
        Route::middleware('permission:guardians.manage')->patch('/guardians/{guardian}', [GuardianController::class, 'update']);
        Route::middleware('permission:guardians.manage')->delete('/guardians/{guardian}', [GuardianController::class, 'destroy']);
        Route::middleware('permission:students.manage')->post('/students/{student}/guardians', [GuardianController::class, 'attach']);
        Route::middleware('permission:students.manage')->patch('/students/{student}/guardians/{guardian}', [GuardianController::class, 'updatePivot']);
        Route::middleware('permission:students.manage')->delete('/students/{student}/guardians/{guardian}', [GuardianController::class, 'detach']);

        Route::middleware('permission:enrollments.manage')->get('/enrollments/next-number', [EnrollmentController::class, 'nextNumber']);
        Route::middleware('permission:enrollments.view')->get('/enrollments', [EnrollmentController::class, 'index']);
        Route::middleware('permission:enrollments.view')->get('/enrollments/{enrollment}', [EnrollmentController::class, 'show']);
        Route::middleware('permission:enrollments.manage')->post('/enrollments', [EnrollmentController::class, 'store']);
        Route::middleware('permission:enrollments.manage')->patch('/enrollments/{enrollment}', [EnrollmentController::class, 'update']);

        Route::middleware('permission:teachers.view')->get('/teachers', [TeacherController::class, 'index']);
        Route::middleware('permission:teachers.manage')->post('/teachers', [TeacherController::class, 'store']);
        Route::middleware('permission:teachers.view')->get('/teachers/{teacher}', [TeacherController::class, 'show']);
        Route::middleware('permission:teachers.manage')->patch('/teachers/{teacher}', [TeacherController::class, 'update']);
        Route::middleware('permission:teachers.manage')->delete('/teachers/{teacher}', [TeacherController::class, 'destroy']);
        Route::middleware('permission:schedule.view')->get('/teachers/{teacher}/schedule', [ScheduleEntryController::class, 'forTeacher']);

        // Teacher observations journal (observation | complaint | note)
        Route::middleware('permission:teachers.view')->get('/teachers/{teacher}/observations', [TeacherObservationController::class, 'index']);
        Route::middleware('permission:teachers.manage')->post('/teachers/{teacher}/observations', [TeacherObservationController::class, 'store']);
        Route::middleware('permission:teachers.manage')->delete('/teachers/{teacher}/observations/{observation}', [TeacherObservationController::class, 'destroy']);

        Route::middleware('permission:attendance.view')->get('/attendance-records', [AttendanceRecordController::class, 'index']);
        Route::middleware('permission:attendance.view')->get('/attendance-records/export.xlsx', [AttendanceRecordController::class, 'exportExcel']);
        Route::middleware('permission:attendance.manage')->post('/attendance-records', [AttendanceRecordController::class, 'store']);
        Route::middleware('permission:attendance.view')->get('/attendance-records/{attendanceRecord}', [AttendanceRecordController::class, 'show']);
        Route::middleware('permission:attendance.manage')->patch('/attendance-records/{attendanceRecord}', [AttendanceRecordController::class, 'update']);
        Route::middleware('permission:attendance.manage')->delete('/attendance-records/{attendanceRecord}', [AttendanceRecordController::class, 'destroy']);
        Route::middleware('permission:attendance.manage')->post('/classes/{schoolClass}/attendance/bulk', [AttendanceRecordController::class, 'bulkMark']);
        Route::middleware('permission:attendance.justify')->post('/attendance-records/{attendanceRecord}/justify', [AttendanceRecordController::class, 'justify']);
        Route::middleware('permission:attendance.view')->get('/attendance/stats', [AttendanceRecordController::class, 'stats']);
        Route::middleware('permission:dashboard.view')->get('/dashboard', [DashboardController::class, 'index']);
        Route::middleware('permission:dashboard.view')->get('/dashboard/simple', [DashboardController::class, 'simple']);

        // Simple-mode attendance: monthly student totals + teacher daily tracking.
        Route::middleware('permission:attendance.view')->get('/simple/attendance/students', [SimpleAttendanceController::class, 'studentTotals']);
        Route::middleware('permission:attendance.view')->get('/simple/attendance/teachers', [SimpleAttendanceController::class, 'teacherList']);
        Route::middleware('permission:attendance.view')->get('/simple/attendance/teachers/day', [SimpleAttendanceController::class, 'teacherDay']);
        Route::middleware('permission:attendance.manage')->post('/simple/attendance/teachers', [SimpleAttendanceController::class, 'teacherUpsert']);
        Route::middleware('permission:attendance.manage')->delete('/simple/attendance/teachers/{teacherAttendance}', [SimpleAttendanceController::class, 'teacherDestroy']);

        // Simple finance journal — director's notebook, independent of payments/expenses.
        Route::middleware('permission:finance.view')->get('/simple/finance/journal', [SimpleFinanceController::class, 'index']);
        Route::middleware('permission:finance.view')->get('/simple/finance/summary', [SimpleFinanceController::class, 'summary']);
        Route::middleware('permission:finance.view')->get('/simple/finance/bilan', [SimpleFinanceController::class, 'bilan']);
        Route::middleware('permission:finance.view')->get('/simple/finance/journal/export.csv', [SimpleFinanceController::class, 'exportCsv']);
        Route::middleware('permission:finance.view')->get('/simple/finance/journal/{entry}/attachment', [SimpleFinanceController::class, 'downloadAttachment']);
        Route::middleware('permission:finance.manage')->post('/simple/finance/journal', [SimpleFinanceController::class, 'store']);
        Route::middleware('permission:finance.manage')->patch('/simple/finance/journal/{entry}', [SimpleFinanceController::class, 'update']);
        Route::middleware('permission:finance.manage')->delete('/simple/finance/journal/{entry}', [SimpleFinanceController::class, 'destroy']);
        Route::middleware('permission:notifications.view')->get('/dashboard/indicators', [InternalNotificationController::class, 'indicators']);
        Route::middleware('permission:notifications.view')->get('/internal-notifications', [InternalNotificationController::class, 'index']);
        Route::middleware('permission:notifications.view')->post('/internal-notifications/read-all', [InternalNotificationController::class, 'markAllRead']);
        Route::middleware('permission:notifications.view')->post('/internal-notifications/{internalNotification}/read', [InternalNotificationController::class, 'markRead']);

        Route::middleware('permission:announcements.view')->get('/announcements', [AnnouncementController::class, 'index']);
        Route::middleware('permission:announcements.view')->get('/announcements/{announcement}', [AnnouncementController::class, 'show']);
        Route::middleware('permission:announcements.manage')->post('/announcements', [AnnouncementController::class, 'store']);
        Route::middleware('permission:announcements.manage')->patch('/announcements/{announcement}', [AnnouncementController::class, 'update']);
        Route::middleware('permission:announcements.manage')->delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);
        Route::middleware('permission:announcements.manage')->post('/announcements/{announcement}/publish', [AnnouncementController::class, 'publish']);
        Route::middleware('permission:announcements.manage')->post('/announcements/{announcement}/archive', [AnnouncementController::class, 'archive']);

        Route::middleware('permission:audit_logs.view')->get('/audit-logs', [AuditLogController::class, 'index']);

        Route::middleware('permission:grades.view')->get('/grades', [GradeController::class, 'index']);
        Route::middleware('permission:grades.view')->get('/grades/export.xlsx', [GradeController::class, 'exportExcel']);
        Route::middleware('permission:grades.manage')->post('/grades', [GradeController::class, 'store']);
        Route::middleware('permission:grades.view')->get('/grades/{grade}', [GradeController::class, 'show']);
        Route::middleware('permission:grades.manage')->patch('/grades/{grade}', [GradeController::class, 'update']);
        Route::middleware('permission:grades.manage')->delete('/grades/{grade}', [GradeController::class, 'destroy']);
        Route::middleware('permission:grades.manage')->post('/grades/bulk', [GradeController::class, 'bulkStore']);
        Route::middleware('permission:grades.view')->get('/grades/class-ranking', [GradeAnalyticsController::class, 'classRanking']);
        Route::middleware('permission:grades.manage')->post('/grades/recalculate', [GradeAnalyticsController::class, 'recalculateWeightedScores']);

        Route::middleware('permission:report_cards.view')->get('/report-cards', [ReportCardController::class, 'index']);
        Route::middleware('permission:report_cards.view')->get('/report-cards/{reportCard}', [ReportCardController::class, 'show']);
        Route::middleware('permission:report_cards.manage')->post('/report-cards/generate', [ReportCardController::class, 'generate']);
        Route::middleware('permission:report_cards.publish')->post('/report-cards/{reportCard}/publish', [ReportCardController::class, 'publish']);
        Route::middleware('permission:report_cards.manage')->post('/report-cards/{reportCard}/archive', [ReportCardController::class, 'archive']);
        Route::middleware('permission:report_cards.view')->get('/report-cards/{reportCard}/pdf', [ReportCardController::class, 'download']);

        /**
         * Compatibility alias: "bulletins" endpoints.
         *
         * Canonical storage is `report_cards`. The legacy DB table `bulletins` is kept as-is
         * (read-only / unused by current app code). These routes exist so clients can use
         * a single concept name ("Bulletins") without introducing a second write path.
         */
        Route::middleware('permission:report_cards.view')->get('/bulletins', [ReportCardController::class, 'index']);
        Route::middleware('permission:report_cards.view')->get('/bulletins/{reportCard}', [ReportCardController::class, 'show']);
        Route::middleware('permission:report_cards.manage')->post('/bulletins/generate', [ReportCardController::class, 'generate']);
        Route::middleware('permission:report_cards.publish')->post('/bulletins/{reportCard}/publish', [ReportCardController::class, 'publish']);
        Route::middleware('permission:report_cards.manage')->post('/bulletins/{reportCard}/archive', [ReportCardController::class, 'archive']);
        Route::middleware('permission:report_cards.view')->get('/bulletins/{reportCard}/pdf', [ReportCardController::class, 'download']);

        Route::middleware('permission:report_cards.view')->get('/report-card-template', [ReportCardTemplateController::class, 'show']);
        Route::middleware('permission:report_cards.manage')->put('/report-card-template', [ReportCardTemplateController::class, 'update']);
        Route::middleware('permission:report_cards.manage')->post('/report-card-template/reset', [ReportCardTemplateController::class, 'reset']);

        Route::middleware('permission:finance.view')->get('/fee-types', [FeeTypeController::class, 'index']);
        Route::middleware('permission:finance.manage')->post('/fee-types', [FeeTypeController::class, 'store']);
        Route::middleware('permission:finance.view')->get('/fee-types/{feeType}', [FeeTypeController::class, 'show']);
        Route::middleware('permission:finance.manage')->patch('/fee-types/{feeType}', [FeeTypeController::class, 'update']);
        Route::middleware('permission:finance.manage')->delete('/fee-types/{feeType}', [FeeTypeController::class, 'destroy']);

        Route::middleware('permission:finance.view')->get('/expense-categories', [ExpenseCategoryController::class, 'index']);
        Route::middleware('permission:finance.manage')->post('/expense-categories', [ExpenseCategoryController::class, 'store']);
        Route::middleware('permission:finance.view')->get('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'show']);
        Route::middleware('permission:finance.manage')->patch('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update']);
        Route::middleware('permission:finance.manage')->delete('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy']);

        Route::middleware('permission:finance.view')->get('/fee-assignments', [FeeAssignmentController::class, 'index']);
        Route::middleware('permission:finance.manage')->post('/fee-assignments', [FeeAssignmentController::class, 'store']);
        Route::middleware('permission:finance.view')->get('/fee-assignments/{feeAssignment}', [FeeAssignmentController::class, 'show']);
        Route::middleware('permission:finance.manage')->patch('/fee-assignments/{feeAssignment}', [FeeAssignmentController::class, 'update']);
        Route::middleware('permission:finance.manage')->post('/fee-assignments/{feeAssignment}/cancel', [FeeAssignmentController::class, 'cancel']);

        Route::middleware('permission:finance.view')->get('/invoices', [InvoiceController::class, 'index']);
        Route::middleware('permission:finance.manage')->post('/invoices', [InvoiceController::class, 'store']);
        Route::middleware('permission:finance.view')->get('/invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::middleware('permission:finance.view')->get('/invoices/{invoice}/pdf', [InvoiceController::class, 'downloadPdf']);
        Route::middleware('permission:finance.manage')->post('/invoices/{invoice}/issue', [InvoiceController::class, 'issue']);
        Route::middleware('permission:finance.manage')->post('/invoices/{invoice}/cancel', [InvoiceController::class, 'cancel']);
        Route::middleware('permission:finance.manage')->patch('/invoices/{invoice}', [InvoiceController::class, 'update']);

        Route::middleware('permission:finance.view')->get('/payments', [PaymentController::class, 'index']);
        Route::middleware('permission:finance.manage')->post('/payments', [PaymentController::class, 'store']);
        Route::middleware('permission:finance.view')->get('/payments/{payment}', [PaymentController::class, 'show']);
        Route::middleware('permission:finance.manage')->patch('/payments/{payment}', [PaymentController::class, 'update']);
        Route::middleware('permission:finance.manage')->post('/payments/{payment}/cancel', [PaymentController::class, 'cancel']);
        Route::middleware('permission:finance.view')->get('/payments/{payment}/receipt', [PaymentController::class, 'receipt']);

        Route::middleware('permission:finance.manage')->get('/expenses/next-reference', [ExpenseController::class, 'nextReference']);
        Route::middleware('permission:finance.view')->get('/expenses', [ExpenseController::class, 'index']);
        Route::middleware('permission:finance.manage')->post('/expenses', [ExpenseController::class, 'store']);
        Route::middleware('permission:finance.view')->get('/expenses/{expense}', [ExpenseController::class, 'show']);
        Route::middleware('permission:finance.manage')->patch('/expenses/{expense}', [ExpenseController::class, 'update']);
        Route::middleware('permission:finance.manage')->delete('/expenses/{expense}', [ExpenseController::class, 'destroy']);
        Route::middleware('permission:finance.manage')->post('/expenses/{expense}/cancel', [ExpenseController::class, 'cancel']);
        Route::middleware('permission:finance.manage')->post('/expenses/{expense}/documents', [ExpenseController::class, 'addDocument']);
        Route::middleware('permission:finance.manage')->delete('/expense-documents/{document}', [ExpenseController::class, 'deleteDocument']);

        Route::middleware('permission:finance.view')->get('/finance/dashboard', [FinanceReportController::class, 'dashboard']);
        Route::middleware('permission:finance.view')->get('/finance/payments-by-period', [FinanceReportController::class, 'paymentsByPeriod']);
        Route::middleware('permission:finance.view')->get('/finance/payments/export.xlsx', [FinanceReportController::class, 'exportPaymentsExcel']);
        Route::middleware('permission:finance.view')->get('/finance/expenses/export.xlsx', [FinanceReportController::class, 'exportExpensesExcel']);
        Route::middleware('permission:finance.view')->get('/finance/summary/report.pdf', [FinanceReportController::class, 'downloadSummaryPdf']);
        Route::middleware('permission:finance.view')->get('/finance/expenses-by-category', [FinanceReportController::class, 'expensesByCategory']);
        Route::middleware('permission:finance.view')->get('/finance/expenses-by-cost-type', [FinanceReportController::class, 'expensesByCostType']);
        Route::middleware('permission:finance.view')->get('/finance/invoices/overdue', [FinanceReportController::class, 'overdueInvoices']);
        Route::middleware('permission:finance.view')->get('/finance/monthly-evolution', [FinanceReportController::class, 'monthlyEvolution']);
        Route::middleware('permission:finance.view')->get('/finance/bilan', [FinanceBilanController::class, 'show']);
        Route::middleware('permission:finance.view')->get('/finance/bilan/pdf', [FinanceBilanController::class, 'pdf']);
        Route::middleware('permission:finance.view')->get('/finance/bilan/export.xlsx', [FinanceBilanController::class, 'exportExcel']);

        Route::middleware('permission:documents.view')->get('/documents', [DocumentController::class, 'index']);
        Route::middleware('permission:documents.manage')->post('/documents', [DocumentController::class, 'store']);
        Route::middleware('permission:documents.view')->get('/documents/{document}', [DocumentController::class, 'show']);
        Route::middleware('permission:documents.view')->get('/documents/{document}/download', [DocumentController::class, 'download']);
        Route::middleware('permission:documents.manage')->delete('/documents/{document}', [DocumentController::class, 'destroy']);

        Route::middleware('permission:teachers.view')->get('/teachers/{teacher}/assignments', [TeacherAssignmentController::class, 'index']);
        Route::middleware('permission:teachers.manage')->post('/teachers/{teacher}/assignments', [TeacherAssignmentController::class, 'store']);
        Route::middleware('permission:teachers.manage')->patch('/teacher-class-subjects/{teacherClassSubject}', [TeacherAssignmentController::class, 'update']);
        Route::middleware('permission:teachers.manage')->delete('/teacher-class-subjects/{teacherClassSubject}', [TeacherAssignmentController::class, 'destroy']);

        Route::middleware('permission:teachers.view')->get('/teachers/{teacher}/documents', [TeacherDocumentController::class, 'index']);
        Route::middleware('permission:teachers.view')->get('/teacher-documents/{teacherDocument}/download', [TeacherDocumentController::class, 'download']);
        Route::middleware('permission:teachers.manage')->post('/teachers/{teacher}/documents', [TeacherDocumentController::class, 'store']);
        Route::middleware('permission:teachers.manage')->delete('/teacher-documents/{teacherDocument}', [TeacherDocumentController::class, 'destroy']);
    });
});
