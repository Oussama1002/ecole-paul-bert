import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import * as teachersApi from '../../api/teachers'
import { getApiErrorMessage } from '../../utils/apiError'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import type { PendingTeacherDocuments } from '../../utils/teacherDocumentTypes'
import {
  TeacherDocumentUploadFields,
  uploadPendingTeacherDocuments,
} from './TeacherDocumentUploadFields'

function suggestEmployeeCode(): string {
  const y = new Date().getFullYear()
  const r = Math.floor(Math.random() * 9000 + 1000)
  return `ENS-${y}-${r}`
}

export function TeacherFormModal({
  teacherId,
  onClose,
}: {
  teacherId: number | null
  onClose: () => void
}) {
  const isNew = teacherId === null
  const queryClient = useQueryClient()
  const { simpleMode } = useSimpleMode()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['teacher', teacherId],
    queryFn: () => teachersApi.fetchTeacher(teacherId as number),
    enabled: !isNew && teacherId != null,
  })

  const [employeeCode, setEmployeeCode] = useState(isNew ? suggestEmployeeCode() : '')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [qualification, setQualification] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [employmentType, setEmploymentType] = useState('full_time')
  const [yearsExperience, setYearsExperience] = useState('')
  const [salaryBase, setSalaryBase] = useState('')
  const [status, setStatus] = useState('active')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [pendingDocs, setPendingDocs] = useState<PendingTeacherDocuments>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setEmployeeCode(existing.employee_code)
    setFirstName(existing.first_name)
    setLastName(existing.last_name)
    setEmail(existing.email ?? '')
    setPhone(existing.phone ?? '')
    setAddress(existing.address ?? '')
    setGender(existing.gender ?? '')
    setDateOfBirth(existing.date_of_birth ?? '')
    setHireDate(existing.hire_date ?? '')
    setQualification(existing.qualification ?? '')
    setSpecialization(existing.specialization ?? '')
    setEmploymentType(existing.employment_type)
    setYearsExperience(existing.years_experience != null ? String(existing.years_experience) : '')
    setSalaryBase(existing.salary_base ?? '')
    setStatus(existing.status)
    setEmergencyName(existing.emergency_contact_name ?? '')
    setEmergencyPhone(existing.emergency_contact_phone ?? '')
    setNotes(existing.notes ?? '')
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      const payload: teachersApi.TeacherPayload = {
        employee_code: employeeCode.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email || null,
        phone: phone || null,
        address: address || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        hire_date: hireDate || null,
        qualification: qualification || null,
        specialization: specialization || null,
        employment_type: employmentType,
        years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
        salary_base: salaryBase ? parseFloat(salaryBase) : null,
        status,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        notes: notes || null,
      }
      if (isNew) {
        const teacher = await teachersApi.createTeacher(payload)
        if (Object.keys(pendingDocs).length > 0) {
          await uploadPendingTeacherDocuments(teacher.id, pendingDocs)
        }
        return teacher
      }
      return teachersApi.updateTeacher(teacherId as number, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      onClose()
    },
    onError: (e: unknown) =>
      setError(getApiErrorMessage(e, 'Enregistrement impossible.')),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
          <h3 className="font-display text-lg font-bold text-school-ink">
            {isNew ? 'Nouvel enseignant' : "Modifier l'enseignant"}
          </h3>
          <button type="button" onClick={onClose} className="text-xl leading-none text-school-inkmuted hover:text-school-ink">✕</button>
        </div>

        {!isNew && isLoading ? (
          <p className="p-6 text-sm text-school-inkmuted">Chargement…</p>
        ) : (
          <form
            onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); save.mutate() }}
            className="space-y-4 p-6"
          >
            {error && (
              <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">{error}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom *">
                <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="school-input" />
              </Field>
              <Field label="Nom *">
                <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="school-input" />
              </Field>

              <Field label="Matricule *" className="sm:col-span-2">
                <div className="flex gap-2">
                  <input required value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} className="school-input flex-1 font-mono" />
                  {isNew && (
                    <button
                      type="button"
                      onClick={() => setEmployeeCode(suggestEmployeeCode())}
                      className="rounded-2xl border-2 border-school-grape/30 bg-white px-3 py-2 text-xs font-bold text-school-grape hover:bg-school-grape/5"
                    >
                      Auto
                    </button>
                  )}
                </div>
              </Field>

              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="school-input" />
              </Field>
              <Field label="Téléphone">
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="school-input" />
              </Field>

              {!simpleMode && (
                <>
                  <Field label="Statut">
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="school-select">
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                      <option value="suspended">Suspendu</option>
                      <option value="left">Parti</option>
                    </select>
                  </Field>
                  <Field label="Type de contrat">
                    <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="school-select">
                      <option value="full_time">Temps plein</option>
                      <option value="part_time">Temps partiel</option>
                      <option value="contract">Contrat</option>
                      <option value="temporary">Intérim</option>
                    </select>
                  </Field>
                  <Field label="Genre">
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="school-select">
                      <option value="">—</option>
                      <option value="male">Homme</option>
                      <option value="female">Femme</option>
                      <option value="other">Autre</option>
                    </select>
                  </Field>
                  <Field label="Date de naissance">
                    <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="school-input" />
                  </Field>
                  <Field label="Date d'embauche">
                    <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} className="school-input" />
                  </Field>
                  <Field label="Adresse" className="sm:col-span-2">
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="school-input" />
                  </Field>
                  <Field label="Diplôme / qualification">
                    <input value={qualification} onChange={(e) => setQualification(e.target.value)} className="school-input" />
                  </Field>
                  <Field label="Spécialisation">
                    <input value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="school-input" />
                  </Field>
                  <Field label="Années d'expérience">
                    <input type="number" min={0} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} className="school-input" />
                  </Field>
                  <Field label="Salaire de base">
                    <input type="number" step="0.01" min={0} value={salaryBase} onChange={(e) => setSalaryBase(e.target.value)} className="school-input" />
                  </Field>
                  <Field label="Contact urgence — nom">
                    <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="school-input" />
                  </Field>
                  <Field label="Contact urgence — téléphone">
                    <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="school-input" />
                  </Field>
                  <Field label="Notes" className="sm:col-span-2">
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="school-input" />
                  </Field>
                </>
              )}
            </div>

            {isNew && (
              <TeacherDocumentUploadFields
                pending={pendingDocs}
                onChange={setPendingDocs}
              />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="school-btn-secondary">Annuler</button>
              <button type="submit" disabled={save.isPending} className="school-btn-primary disabled:opacity-60">
                {save.isPending ? 'Enregistrement…' : isNew ? "Enregistrer l'enseignant" : 'Mettre à jour'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">{label}</span>
      {children}
    </label>
  )
}
