import * as teachersApi from '../../api/teachers'
import {
  TEACHER_DOC_UPLOAD_SLOTS,
  type PendingTeacherDocuments,
} from '../../utils/teacherDocumentTypes'

export async function uploadPendingTeacherDocuments(
  teacherId: number,
  pending: PendingTeacherDocuments
): Promise<void> {
  for (const slot of TEACHER_DOC_UPLOAD_SLOTS) {
    const file = pending[slot.type]
    if (file) {
      await teachersApi.uploadTeacherDocument(teacherId, file, slot.type, {
        title: slot.label,
      })
    }
  }
  for (const [type, file] of Object.entries(pending)) {
    if (!file || TEACHER_DOC_UPLOAD_SLOTS.some((s) => s.type === type)) continue
    await teachersApi.uploadTeacherDocument(teacherId, file, type)
  }
}

export function TeacherDocumentUploadFields({
  pending,
  onChange,
}: {
  pending: PendingTeacherDocuments
  onChange: (next: PendingTeacherDocuments) => void
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-school-mist text-lg">
          📎
        </span>
        <div>
          <h3 className="font-display text-lg font-semibold text-school-ink">
            Documents
          </h3>
          <p className="text-xs text-school-inkmuted">
            Formats acceptés : PDF, Word, JPG, PNG (max. 12 Mo)
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TEACHER_DOC_UPLOAD_SLOTS.map((slot) => {
          const file = pending[slot.type]
          return (
            <label
              key={slot.type}
              className="flex cursor-pointer flex-col rounded-2xl border-2 border-dashed border-school-line bg-school-canvas/40 px-4 py-3 transition hover:border-school-grape/40"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                {slot.label}
              </span>
              <span className="mt-1 text-sm text-school-ink">
                {file ? file.name : 'Choisir un fichier…'}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={(e) => {
                  const chosen = e.target.files?.[0]
                  const next = { ...pending }
                  if (chosen) next[slot.type] = chosen
                  else delete next[slot.type]
                  onChange(next)
                  e.target.value = ''
                }}
              />
            </label>
          )
        })}
      </div>
    </section>
  )
}
