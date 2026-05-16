import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import * as studentsApi from '../../api/students'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import { QuickStudentForm } from './QuickStudentForm'
import { getApiErrorMessage } from '../../utils/apiError'

const NATIONALITIES = [
  'Marocaine', 'Française', 'Algérienne', 'Tunisienne', 'Sénégalaise',
  'Malienne', 'Ivoirienne', 'Guinéenne', 'Camerounaise', 'Congolaise',
  'Mauritanienne', 'Nigériane', 'Gabonaise', 'Burkinabée', 'Béninoise',
  'Togolaise', 'Rwandaise', 'Malgache', 'Comorienne', 'Djiboutienne',
  'Espagnole', 'Belge', 'Suisse', 'Canadienne', 'Américaine',
  'Britannique', 'Italienne', 'Allemande', 'Portugaise', 'Néerlandaise',
  'Libanaise', 'Syrienne', 'Égyptienne', 'Libérienne', 'Autre',
]

const VILLES_MAROC = [
  'Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Tanger', 'Agadir',
  'Meknès', 'Oujda', 'Kenitra', 'Tétouan', 'Salé', 'Mohammedia',
  'Khouribga', 'Béni Mellal', 'El Jadida', 'Nador', 'Settat',
  'Safi', 'Khémisset', 'Berkane', 'Larache', 'Ksar El Kébir',
  'Khénifra', 'Guelmim', 'Dakhla', 'Laâyoune', 'Errachidia',
  'Ouarzazate', 'Ifrane', 'Azrou', 'Taza', 'Al Hoceïma', 'Autre',
]

export function StudentFormPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { simpleMode } = useSimpleMode()
  const isNew = !!matchPath('/eleves/nouveau', pathname)
  const editMatch = matchPath('/eleves/:id/editer', pathname)
  const id = editMatch?.params?.id ? parseInt(editMatch.params.id, 10) : NaN

  const { data: existing, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.fetchStudent(id),
    enabled: !isNew && !Number.isNaN(id),
  })

  const [studentCode, setStudentCode] = useState('')
  const [codeManual, setCodeManual] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [placeOfBirth, setPlaceOfBirth] = useState('')
  const [nationality, setNationality] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [status, setStatus] = useState('pending')
  const [admissionDate, setAdmissionDate] = useState('')
  const [registrationDate, setRegistrationDate] = useState('')
  const [previousSchool, setPreviousSchool] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')
  const [specialNeeds, setSpecialNeeds] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [parentPhone1, setParentPhone1] = useState('')
  const [parentPhone2, setParentPhone2] = useState('')
  const [parentPhone3, setParentPhone3] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: suggestedCode, refetch: refetchCode } = useQuery({
    queryKey: ['next-student-code'],
    queryFn: studentsApi.fetchNextStudentCode,
    enabled: isNew && !codeManual,
    staleTime: 0,
  })

  useEffect(() => {
    if (isNew && suggestedCode && !codeManual) {
      setStudentCode(suggestedCode)
    }
  }, [isNew, suggestedCode, codeManual])

  useEffect(() => {
    if (!existing) return
    setStudentCode(existing.student_code)
    setCodeManual(true)
    setFirstName(existing.first_name)
    setLastName(existing.last_name)
    setGender(existing.gender ?? '')
    setDateOfBirth(existing.date_of_birth)
    setPlaceOfBirth(existing.place_of_birth ?? '')
    setNationality(existing.nationality ?? '')
    setAddress(existing.address ?? '')
    setCity(existing.city ?? '')
    setStatus(existing.status)
    setAdmissionDate(existing.admission_date ?? '')
    setRegistrationDate(existing.registration_date ?? '')
    setPreviousSchool(existing.previous_school ?? '')
    setBloodGroup(existing.blood_group ?? '')
    setMedicalNotes(existing.medical_notes ?? '')
    setSpecialNeeds(existing.special_needs ?? '')
    setEmergencyName(existing.emergency_contact_name ?? '')
    setEmergencyPhone(existing.emergency_contact_phone ?? '')
    setParentPhone1(existing.parent_phone_1 ?? '')
    setParentPhone2(existing.parent_phone_2 ?? '')
    setParentPhone3(existing.parent_phone_3 ?? '')
    setNotes(existing.notes ?? '')
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      const payload: studentsApi.StudentPayload = {
        student_code: studentCode,
        first_name: firstName,
        last_name: lastName,
        gender: gender || null,
        date_of_birth: dateOfBirth,
        place_of_birth: placeOfBirth || null,
        nationality: nationality || null,
        address: address || null,
        city: city || null,
        status,
        admission_date: admissionDate || null,
        registration_date: registrationDate || null,
        previous_school: previousSchool || null,
        blood_group: bloodGroup || null,
        medical_notes: medicalNotes || null,
        special_needs: specialNeeds || null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        parent_phone_1: parentPhone1 || null,
        parent_phone_2: parentPhone2 || null,
        parent_phone_3: parentPhone3 || null,
        notes: notes || null,
      }
      if (isNew) {
        return studentsApi.createStudent(payload)
      }
      return studentsApi.updateStudent(id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      navigate('/eleves')
    },
    onError: (e: Error) => setError(getApiErrorMessage(e, 'Erreur lors de l\'enregistrement.')),
  })

  if (simpleMode) {
    if (!isNew && isLoading) {
      return <p className="text-sm text-school-inkmuted">Chargement…</p>
    }
    return (
      <QuickStudentForm
        existing={existing}
        studentId={Number.isNaN(id) ? undefined : id}
      />
    )
  }

  if (!isNew && isLoading) {
    return <p className="text-sm text-slate-500">Chargement…</p>
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/eleves" className="text-sm text-indigo-600 hover:underline">
          ← Élèves
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">
          {isNew ? 'Nouvel élève' : "Modifier l'élève"}
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">
              Code élève{isNew && !codeManual && ' (généré automatiquement)'}
            </span>
            <div className="flex gap-2">
              <input
                required
                value={studentCode}
                onChange={(e) => { setCodeManual(true); setStudentCode(e.target.value) }}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono"
                placeholder="EPB-2026-0001"
              />
              {isNew && (
                <button
                  type="button"
                  title="Regénérer le code"
                  onClick={() => { setCodeManual(false); refetchCode() }}
                  className="shrink-0 rounded border border-slate-300 px-2 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                >
                  ↻
                </button>
              )}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Statut</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="pending">En attente</option>
              <option value="active">Actif</option>
              <option value="transferred">Transféré</option>
              <option value="graduated">Diplômé</option>
              <option value="suspended">Suspendu</option>
              <option value="withdrawn">Retiré</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Nom</span>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Prénom</span>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Sexe</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="male">Masculin</option>
              <option value="female">Féminin</option>
              <option value="other">Autre</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">
              Date de naissance
            </span>
            <input
              type="date"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs text-slate-500">Lieu de naissance</span>
            <input
              value={placeOfBirth}
              onChange={(e) => setPlaceOfBirth(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Nationalité</span>
            <select
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {NATIONALITIES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Ville</span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {VILLES_MAROC.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs text-slate-500">Adresse</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Date d'admission</span>
            <input
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Date d'inscription</span>
            <input
              type="date"
              value={registrationDate}
              onChange={(e) => setRegistrationDate(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs text-slate-500">Établissement précédent</span>
            <input
              value={previousSchool}
              onChange={(e) => setPreviousSchool(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Groupe sanguin</span>
            <input
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs text-slate-500">Notes médicales</span>
            <textarea
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs text-slate-500">Besoins particuliers</span>
            <textarea
              value={specialNeeds}
              onChange={(e) => setSpecialNeeds(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Contact urgence (nom)</span>
            <input
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Contact urgence (tél.)</span>
            <input
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Téléphone parent 1</span>
            <input
              type="tel"
              inputMode="tel"
              value={parentPhone1}
              onChange={(e) => setParentPhone1(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Téléphone parent 2</span>
            <input
              type="tel"
              inputMode="tel"
              value={parentPhone2}
              onChange={(e) => setParentPhone2(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Téléphone parent 3</span>
            <input
              type="tel"
              inputMode="tel"
              value={parentPhone3}
              onChange={(e) => setParentPhone3(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs text-slate-500">Remarques</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Enregistrer
          </button>
          <Link
            to="/eleves"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
