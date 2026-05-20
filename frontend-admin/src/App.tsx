import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SimpleModeProvider } from './contexts/SimpleModeContext'
import { AdminLayout } from './layouts/AdminLayout'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { ProfilePage } from './pages/ProfilePage'
import { HomePage } from './routes/HomePage'
import { useSimpleMode } from './contexts/SimpleModeContext'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ClassDetailPage } from './pages/parametrage/ClassDetailPage'
import { ClassFormPage } from './pages/parametrage/ClassFormPage'
import { ClassesListPage } from './pages/parametrage/ClassesListPage'
import { LevelFormPage } from './pages/parametrage/LevelFormPage'
import { LevelsListPage } from './pages/parametrage/LevelsListPage'
import { ParametragePeriodsPage } from './pages/parametrage/ParametragePeriodsPage'
import { RoomFormPage } from './pages/parametrage/RoomFormPage'
import { RoomsListPage } from './pages/parametrage/RoomsListPage'
import { SchoolYearFormPage } from './pages/parametrage/SchoolYearFormPage'
import { SchoolYearsListPage } from './pages/parametrage/SchoolYearsListPage'
import { SubjectFormPage } from './pages/parametrage/SubjectFormPage'
import { SubjectsListPage } from './pages/parametrage/SubjectsListPage'
import { ReportCardTemplatePage } from './pages/parametrage/ReportCardTemplatePage'
import { StudentDetailPage } from './pages/eleves/StudentDetailPage'
import { StudentFormPage } from './pages/eleves/StudentFormPage'
import { StudentsListPage } from './pages/eleves/StudentsListPage'
import { TeacherDetailPage } from './pages/enseignants/TeacherDetailPage'
import { TeacherFormPage } from './pages/enseignants/TeacherFormPage'
import { ScheduleWeeklyPage } from './pages/emploi-du-temps/ScheduleWeeklyPage'
import { TeachersListPage } from './pages/enseignants/TeachersListPage'
import { AttendanceQuickClassPage } from './pages/assiduite/AttendanceQuickClassPage'
import { AttendanceStatsPage } from './pages/assiduite/AttendanceStatsPage'
import { SimpleAttendancePage } from './pages/assiduite/SimpleAttendancePage'
import { GradesBulkClassPage } from './pages/notes/GradesBulkClassPage'
import { ClassRankingPage } from './pages/notes/ClassRankingPage'
import { ReportCardsListPage } from './pages/bulletins/ReportCardsListPage'
import { ReportCardDetailPage } from './pages/bulletins/ReportCardDetailPage'
import { FinanceDashboardPage } from './pages/finance/FinanceDashboardPage'
import { SimpleFinancePage } from './pages/finance/SimpleFinancePage'
import { SimpleSchoolSettingsPage } from './pages/settings/SimpleSchoolSettingsPage'
import { PaymentsListPage } from './pages/finance/PaymentsListPage'
import { ExpensesListPage } from './pages/finance/ExpensesListPage'
import { InvoicesListPage } from './pages/finance/InvoicesListPage'
import { FinanceBilanPage } from './pages/finance/FinanceBilanPage'
import { FeeTypesPage } from './pages/finance/FeeTypesPage'
import { DocumentsPage } from './pages/documents/DocumentsPage'
import { AnnouncementFormPage } from './pages/communications/AnnouncementFormPage'
import { AnnouncementsListPage } from './pages/communications/AnnouncementsListPage'
import { AuditLogsPage } from './pages/communications/AuditLogsPage'
import { NotificationsCenterPage } from './pages/communications/NotificationsCenterPage'
import { UserFormPage } from './pages/UserFormPage'
import { UsersListPage } from './pages/UsersListPage'
import { RolloverWizardPage } from './pages/admin/RolloverWizardPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { RequireAdvancedMode } from './routes/RequireAdvancedMode'
import {
  RequireAnyPermission,
  RequirePermission,
} from './routes/RequirePermission'

function AttendanceMarkingHome() {
  const { simpleMode } = useSimpleMode()
  return simpleMode ? <SimpleAttendancePage /> : <AttendanceQuickClassPage />
}

function FinanceHome() {
  const { simpleMode } = useSimpleMode()
  return simpleMode ? <SimpleFinancePage /> : <FinanceDashboardPage />
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SimpleModeProvider>
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
            <Route
              path="/reinitialiser-mot-de-passe"
              element={<ResetPasswordPage />}
            />
            <Route path="/acces-refuse" element={<ForbiddenPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="ecole/parametres" element={<SimpleSchoolSettingsPage />} />
              <Route
                path="ecole/parametres/niveaux"
                element={
                  <RequirePermission permission="levels.view">
                    <LevelsListPage />
                  </RequirePermission>
                }
              />
              <Route
                path="ecole/parametres/niveaux/nouveau"
                element={
                  <RequirePermission permission="levels.manage">
                    <LevelFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="ecole/parametres/niveaux/:id/editer"
                element={
                  <RequirePermission permission="levels.manage">
                    <LevelFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="ecole/parametres/classes"
                element={
                  <RequirePermission permission="classes.view">
                    <ClassesListPage />
                  </RequirePermission>
                }
              />
              <Route
                path="ecole/parametres/classes/nouveau"
                element={
                  <RequirePermission permission="classes.manage">
                    <ClassFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="ecole/parametres/classes/:id"
                element={
                  <RequirePermission permission="classes.view">
                    <ClassDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="ecole/parametres/classes/:id/editer"
                element={
                  <RequirePermission permission="classes.manage">
                    <ClassFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="ecole/parametres/matieres"
                element={
                  <RequirePermission permission="subjects.view">
                    <SubjectsListPage />
                  </RequirePermission>
                }
              />
              <Route
                path="ecole/parametres/matieres/nouveau"
                element={
                  <RequirePermission permission="subjects.manage">
                    <SubjectFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="ecole/parametres/matieres/:id/editer"
                element={
                  <RequirePermission permission="subjects.manage">
                    <SubjectFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="assiduite/marquage"
                element={
                  <RequirePermission permission="attendance.view">
                    <AttendanceMarkingHome />
                  </RequirePermission>
                }
              />
              <Route
                path="assiduite/stats"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="attendance.view">
                      <AttendanceStatsPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="notes/saisie-classe"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="grades.view">
                      <GradesBulkClassPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="notes/classement"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="grades.view">
                      <ClassRankingPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="bulletins"
                element={
                  <RequirePermission permission="report_cards.view">
                    <ReportCardsListPage />
                  </RequirePermission>
                }
              />
              <Route
                path="bulletins/:id"
                element={
                  <RequirePermission permission="report_cards.view">
                    <ReportCardDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="finance"
                element={
                  <RequirePermission permission="finance.view">
                    <FinanceHome />
                  </RequirePermission>
                }
              />
              <Route
                path="finance/paiements"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="finance.view">
                      <PaymentsListPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="finance/depenses"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="finance.view">
                      <ExpensesListPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="finance/factures"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="finance.view">
                      <InvoicesListPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="finance/bilan"
                element={
                  <RequirePermission permission="finance.view">
                    <FinanceBilanPage />
                  </RequirePermission>
                }
              />
              <Route
                path="finance/types-de-frais"
                element={
                  <RequirePermission permission="finance.view">
                    <FeeTypesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="documents"
                element={
                  <RequirePermission permission="documents.view">
                    <DocumentsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="communications/annonces"
                element={
                  <RequirePermission permission="announcements.view">
                    <AnnouncementsListPage />
                  </RequirePermission>
                }
              />
              <Route
                path="communications/annonces/nouveau"
                element={
                  <RequirePermission permission="announcements.manage">
                    <AnnouncementFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="communications/annonces/:id/editer"
                element={
                  <RequirePermission permission="announcements.manage">
                    <AnnouncementFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="communications/notifications"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="notifications.view">
                      <NotificationsCenterPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="communications/audit"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="audit_logs.view">
                      <AuditLogsPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="eleves"
                element={
                  <RequirePermission permission="students.view">
                    <StudentsListPage />
                  </RequirePermission>
                }
              />
              <Route
                path="eleves/nouveau"
                element={
                  <RequirePermission permission="students.manage">
                    <StudentFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="eleves/:id/editer"
                element={
                  <RequirePermission permission="students.manage">
                    <StudentFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="eleves/:id"
                element={
                  <RequirePermission permission="students.view">
                    <StudentDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="enseignants"
                element={
                  <RequirePermission permission="teachers.view">
                    <TeachersListPage />
                  </RequirePermission>
                }
              />
              <Route
                path="enseignants/nouveau"
                element={
                  <RequirePermission permission="teachers.manage">
                    <TeacherFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="enseignants/:id/editer"
                element={
                  <RequirePermission permission="teachers.manage">
                    <TeacherFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="enseignants/:id"
                element={
                  <RequirePermission permission="teachers.view">
                    <TeacherDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="emploi-du-temps"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="schedule.view">
                      <ScheduleWeeklyPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="utilisateurs"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="users.view">
                      <UsersListPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="utilisateurs/nouveau"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="users.create">
                      <UserFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="utilisateurs/:id/editer"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="users.edit">
                      <UserFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />

              <Route
                path="parametrage/annees-scolaires"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="school_years.view">
                      <SchoolYearsListPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/annees-scolaires/nouveau"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="school_years.manage">
                      <SchoolYearFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/annees-scolaires/:id/editer"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="school_years.manage">
                      <SchoolYearFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/passage-annee"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="school_years.manage">
                      <RolloverWizardPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />

              <Route
                path="parametrage/niveaux"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="levels.view">
                      <LevelsListPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/niveaux/nouveau"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="levels.manage">
                      <LevelFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/niveaux/:id/editer"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="levels.manage">
                      <LevelFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />

              <Route
                path="parametrage/classes"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="classes.view">
                      <ClassesListPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/classes/nouveau"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="classes.manage">
                      <ClassFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/classes/:id"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="classes.view">
                      <ClassDetailPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/classes/:id/editer"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="classes.manage">
                      <ClassFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />

              <Route
                path="parametrage/matieres"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="subjects.view">
                      <SubjectsListPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/matieres/nouveau"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="subjects.manage">
                      <SubjectFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/matieres/:id/editer"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="subjects.manage">
                      <SubjectFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />

              <Route
                path="parametrage/periodes"
                element={
                  <RequireAdvancedMode>
                    <RequireAnyPermission
                      permissions={[
                        'academic_terms.view',
                        'evaluation_periods.view',
                      ]}
                    >
                      <ParametragePeriodsPage />
                    </RequireAnyPermission>
                  </RequireAdvancedMode>
                }
              />

              <Route
                path="parametrage/salles"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="rooms.view">
                      <RoomsListPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/salles/nouveau"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="rooms.manage">
                      <RoomFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />
              <Route
                path="parametrage/salles/:id/editer"
                element={
                  <RequireAdvancedMode>
                    <RequirePermission permission="rooms.manage">
                      <RoomFormPage />
                    </RequirePermission>
                  </RequireAdvancedMode>
                }
              />

              <Route
                path="parametrage/bulletin-template"
                element={
                  <RequirePermission permission="report_cards.view">
                    <ReportCardTemplatePage />
                  </RequirePermission>
                }
              />

              <Route path="mot-de-passe" element={<ChangePasswordPage />} />
              <Route path="profil" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </SimpleModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
