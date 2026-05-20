import { useQuery } from '@tanstack/react-query'
import * as studentsApi from '../../api/students'
import { QuickStudentForm } from './QuickStudentForm'

export function StudentEditModal({
  studentId,
  onClose,
}: {
  studentId: number
  onClose: () => void
}) {
  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentsApi.fetchStudent(studentId),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl rounded-3xl border-2 border-school-line bg-school-bg shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b-2 border-school-line bg-school-bg px-6 py-4">
          <h2 className="font-display text-xl font-bold text-school-ink">
            Modifier l'élève
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-school-line px-3 py-1 text-sm font-semibold text-school-inkmuted hover:bg-school-cream"
          >
            ✕ Fermer
          </button>
        </div>
        <div className="p-6">
          {isLoading && <p className="text-sm text-school-inkmuted">Chargement…</p>}
          {error && (
            <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
              Impossible de charger l'élève.
            </p>
          )}
          {student && (
            <QuickStudentForm
              existing={student}
              studentId={studentId}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}
