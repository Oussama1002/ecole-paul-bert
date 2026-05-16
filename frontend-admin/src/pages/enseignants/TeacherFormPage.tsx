import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import * as teachersApi from '../../api/teachers'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import { QuickTeacherForm } from './QuickTeacherForm'

export function TeacherFormPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { simpleMode } = useSimpleMode()
  const isNew = !!matchPath('/enseignants/nouveau', pathname)
  const editMatch = matchPath('/enseignants/:id/editer', pathname)
  const id = editMatch?.params?.id ? parseInt(editMatch.params.id, 10) : NaN

  const { data: existing, isLoading } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => teachersApi.fetchTeacher(id),
    enabled: !isNew && !Number.isNaN(id),
  })

  if (simpleMode) {
    if (!isNew && isLoading) {
      return <p className="text-sm text-school-inkmuted">Chargement…</p>
    }
    return (
      <QuickTeacherForm
        existing={existing}
        teacherId={Number.isNaN(id) ? undefined : id}
      />
    )
  }

  const [userId, setUserId] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setUserId(existing.user_id != null ? String(existing.user_id) : '')
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
    setYearsExperience(
      existing.years_experience != null ? String(existing.years_experience) : ''
    )
    setSalaryBase(existing.salary_base ?? '')
    setStatus(existing.status)
    setEmergencyName(existing.emergency_contact_name ?? '')
    setEmergencyPhone(existing.emergency_contact_phone ?? '')
    setNotes(existing.notes ?? '')
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      const uid = userId.trim()
      const payload: teachersApi.TeacherPayload = {
        user_id: uid ? parseInt(uid, 10) : null,
        employee_code: employeeCode,
        first_name: firstName,
        last_name: lastName,
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
        return teachersApi.createTeacher(payload)
      }
      return teachersApi.updateTeacher(id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      navigate('/enseignants')
    },
    onError: (e: Error) => setError(e.message),
  })

  if (!isNew && isLoading) {
    return <p className="text-sm text-slate-500">Chargement…</p>
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/enseignants"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Enseignants
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">
          {isNew ? 'Nouvel enseignant' : "Modifier l'enseignant"}
        </h2>
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          setError(null)
          save.mutate()
        }}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              ID utilisateur (compte) — optionnel
            </label>
            <input
              type="number"
              min={1}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Lier à un compte existant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Matricule *
            </label>
            <input
              required
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Statut
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
              <option value="suspended">Suspendu</option>
              <option value="left">Parti</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Prénom *
            </label>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nom *
            </label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Téléphone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Genre</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
              <option value="other">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Date de naissance
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Date d'embauche
            </label>
            <input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Adresse
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Diplôme / qualification
            </label>
            <input
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Spécialisation
            </label>
            <input
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Type de contrat
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="full_time">Temps plein</option>
              <option value="part_time">Temps partiel</option>
              <option value="contract">Contrat</option>
              <option value="temporary">Intérim</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Années d'expérience
            </label>
            <input
              type="number"
              min={0}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Salaire de base
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={salaryBase}
              onChange={(e) => setSalaryBase(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Contact urgence — nom
            </label>
            <input
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Contact urgence — téléphone
            </label>
            <input
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Enregistrer
          </button>
          <Link
            to="/enseignants"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
