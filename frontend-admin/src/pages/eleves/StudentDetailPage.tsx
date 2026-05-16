import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import * as attendanceApi from '../../api/attendance'
import * as classesApi from '../../api/classes'
import * as documentsApi from '../../api/documents'
import * as enrollmentsApi from '../../api/enrollments'
import { fetchNextEnrollmentNumber } from '../../api/enrollments'
import * as evaluationPeriodsApi from '../../api/evaluationPeriods'
import * as financeApi from '../../api/finance'
import * as gradesApi from '../../api/grades'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import * as subjectsApi from '../../api/subjects'
import { useAuth } from '../../contexts/AuthContext'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StudentAvatar } from '../../components/ui/StudentAvatar'
import { getApiErrorMessage } from '../../utils/apiError'

type Tab = 'infos' | 'inscription' | 'historique' | 'documents' | 'notes' | 'absences' | 'finance'
type TabDef = { id: Tab; label: string; emoji: string; simple: boolean }

const allTabs: TabDef[] = [
  { id: 'infos',       label: 'Infos générales', emoji: '🪪',  simple: true  },
  { id: 'inscription', label: 'Inscription',      emoji: '📝',  simple: true  },
  { id: 'historique',  label: 'Historique',        emoji: '🕰️', simple: false },
  { id: 'documents',   label: 'Documents',         emoji: '📁',  simple: true  },
  { id: 'notes',       label: 'Notes',             emoji: '📊',  simple: false },
  { id: 'absences',    label: 'Absences',          emoji: '🗓️', simple: true  },
  { id: 'finance',     label: 'Finance',           emoji: '💰',  simple: false },
]

const STATUS_PILL: Record<string, string> = {
  pending: 'school-pill-sun', active: 'school-pill-green', transferred: 'school-pill-sky',
  graduated: 'school-pill-grape', suspended: 'school-pill-coral', withdrawn: 'school-pill-muted',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente', active: 'Actif', transferred: 'Transféré',
  graduated: 'Diplômé', suspended: 'Suspendu', withdrawn: 'Retiré',
}
const ACADEMIC_STATUS_LABEL: Record<string, string> = {
  enrolled: 'Inscrit', re_enrolled: 'Réinscrit', transferred_in: 'Transféré entrant',
  transferred_out: 'Transféré sortant', completed: 'Terminé', cancelled: 'Annulé',
}
const REGISTRATION_STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon', submitted: 'Soumis', validated: 'Validé', rejected: 'Rejeté',
}
const DOC_TYPES = [
  ['bulletin', 'Bulletin'], ['certificat', 'Certificat de scolarité'],
  ['attestation', 'Attestation'], ['medical', 'Document médical'],
  ['identite', 'Pièce d\'identité'], ['photo', 'Photo'], ['autre', 'Autre'],
]
const PAYMENT_METHODS = [
  ['cash', 'Espèces'], ['cheque', 'Chèque'], ['virement', 'Virement bancaire'],
  ['carte', 'Carte bancaire'], ['mobile', 'Paiement mobile'],
]

function ageOf(dob?: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age >= 0 ? age : null
}
function formatDate(d?: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function StudentDetailPage() {
  const { id } = useParams()
  const numericId = id ? parseInt(id, 10) : NaN
  const { simpleMode } = useSimpleMode()
  const tabs = simpleMode ? allTabs.filter((t) => t.simple) : allTabs
  const [tab, setTab] = useState<Tab>('infos')
  const { hasPermission } = useAuth()
  const canManage   = hasPermission('students.manage')
  const canEnroll   = hasPermission('enrollments.manage')
  const canJustify  = hasPermission('attendance.justify')
  const canDocs     = hasPermission('documents.manage')
  const canGrades   = hasPermission('grades.manage')
  const canFinance  = hasPermission('finance.manage')
  const queryClient = useQueryClient()
  const location    = useLocation()
  const navigate    = useNavigate()

  const flash = (location.state as { flash?: string } | null)?.flash ?? null
  const [flashMsg, setFlashMsg] = useState<string | null>(flash)
  useEffect(() => {
    if (!flash) return
    setFlashMsg(flash)
    navigate(location.pathname, { replace: true, state: null })
    const t = window.setTimeout(() => setFlashMsg(null), 5000)
    return () => window.clearTimeout(t)
  }, [flash, location.pathname, navigate])

  // ── Inscription state ──────────────────────────────────────────────────────
  const [syEnrollment, setSyEnrollment] = useState<number>(0)
  const [classId, setClassId] = useState<number>(0)
  const [enrollmentNumber, setEnrollmentNumber] = useState('')
  const [enrollmentNumberManual, setEnrollmentNumberManual] = useState(false)
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().slice(0, 10))
  const [enrollErr, setEnrollErr] = useState<string | null>(null)
  const [editEnrollId, setEditEnrollId] = useState<number | null>(null)
  const [editEnrollClassId, setEditEnrollClassId] = useState<number>(0)
  const [editEnrollAcStatus, setEditEnrollAcStatus] = useState('')
  const [editEnrollRegStatus, setEditEnrollRegStatus] = useState('')
  const [editEnrollErr, setEditEnrollErr] = useState<string | null>(null)

  // ── Documents state ────────────────────────────────────────────────────────
  const docFileRef = useRef<HTMLInputElement>(null)
  const [docTitle, setDocTitle] = useState('')
  const [docType, setDocType] = useState('autre')
  const [docErr, setDocErr] = useState<string | null>(null)

  // ── Notes state ────────────────────────────────────────────────────────────
  const [newGradeSubjectId, setNewGradeSubjectId] = useState<number>(0)
  const [newGradeEvalId, setNewGradeEvalId] = useState<number>(0)
  const [newGradeScore, setNewGradeScore] = useState('')
  const [newGradeMaxScore, setNewGradeMaxScore] = useState('20')
  const [newGradeAppreciation, setNewGradeAppreciation] = useState('')
  const [newGradeErr, setNewGradeErr] = useState<string | null>(null)
  const [editGradeId, setEditGradeId] = useState<number | null>(null)
  const [editGradeScore, setEditGradeScore] = useState('')
  const [editGradeErr, setEditGradeErr] = useState<string | null>(null)

  // ── Finance state ──────────────────────────────────────────────────────────
  const [newPayAmount, setNewPayAmount] = useState('')
  const [newPayDate, setNewPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [newPayMethod, setNewPayMethod] = useState('cash')
  const [newPayNote, setNewPayNote] = useState('')
  const [newPayErr, setNewPayErr] = useState<string | null>(null)
  const [newFeeTypeId, setNewFeeTypeId] = useState<number>(0)
  const [newFeeAmount, setNewFeeAmount] = useState('')
  const [newFeeDueDate, setNewFeeDueDate] = useState('')
  const [newFeeErr, setNewFeeErr] = useState<string | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: student, isLoading, isError, error } = useQuery({
    queryKey: ['student', numericId],
    queryFn: () => studentsApi.fetchStudent(numericId),
    enabled: !Number.isNaN(numericId),
  })

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments-student', numericId],
    queryFn: () => enrollmentsApi.fetchEnrollments({ student_id: numericId, per_page: 50 }),
    enabled: !Number.isNaN(numericId),
  })

  // Context: most recent active enrollment (used across notes/absences tabs)
  const currentEnrollment = enrollments?.items?.find(
    (e) => e.academic_status === 'enrolled' || e.academic_status === 're_enrolled'
  ) ?? enrollments?.items?.[0]

  const { data: history } = useQuery({
    queryKey: ['student-history', numericId],
    queryFn: () => studentsApi.fetchStudentHistory(numericId),
    enabled: !Number.isNaN(numericId) && tab === 'historique',
  })

  const { data: grades, refetch: refetchGrades } = useQuery({
    queryKey: ['student-grades', numericId],
    queryFn: () => studentsApi.fetchStudentGrades(numericId, { per_page: 100 }),
    enabled: !Number.isNaN(numericId) && tab === 'notes',
  })

  const { data: attendance } = useQuery({
    queryKey: ['attendance-records-student', numericId],
    queryFn: () => attendanceApi.fetchAttendanceRecords({ student_id: numericId, per_page: 100 }),
    enabled: !Number.isNaN(numericId) && tab === 'absences',
  })

  const justifyMutation = useMutation({
    mutationFn: (p: { id: number; note?: string }) =>
      attendanceApi.justifyAttendance(p.id, { is_justified: true, justification_note: p.note ?? null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-records-student', numericId] }),
  })

  const { data: documents } = useQuery({
    queryKey: ['student-documents', numericId],
    queryFn: () => studentsApi.fetchStudentDocuments(numericId),
    enabled: !Number.isNaN(numericId) && tab === 'documents',
  })

  const { data: years } = useQuery({
    queryKey: ['school-years-all'],
    queryFn: () => schoolYearsApi.fetchSchoolYears({ per_page: 100, sort_by: 'start_date', sort_order: 'desc' }),
    enabled: tab === 'inscription' && canEnroll,
  })

  const { data: classesForYear } = useQuery({
    queryKey: ['classes-enroll', syEnrollment],
    queryFn: () => classesApi.fetchClasses({ per_page: 100, school_year_id: syEnrollment, sort_by: 'name', sort_order: 'asc' }),
    enabled: (tab === 'inscription') && syEnrollment > 0,
  })

  const { data: suggestedNumber, refetch: refetchNumber } = useQuery({
    queryKey: ['next-enrollment-number'],
    queryFn: fetchNextEnrollmentNumber,
    enabled: tab === 'inscription' && canEnroll && !enrollmentNumberManual,
    staleTime: 0,
  })

  useEffect(() => {
    if (suggestedNumber && !enrollmentNumberManual) setEnrollmentNumber(suggestedNumber)
  }, [suggestedNumber, enrollmentNumberManual])

  useEffect(() => {
    if (tab === 'inscription' && years?.items) {
      const current = years.items.find((y) => y.is_current)
      if (current && syEnrollment === 0) setSyEnrollment(current.id)
    }
  }, [tab, years, syEnrollment])

  // Notes tab: subjects + eval periods
  const { data: subjects } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: () => subjectsApi.fetchSubjects({ per_page: 200, sort_by: 'name', sort_order: 'asc' }),
    enabled: tab === 'notes' && canGrades,
  })

  const { data: evalPeriods } = useQuery({
    queryKey: ['eval-periods', currentEnrollment?.school_year_id],
    queryFn: () => evaluationPeriodsApi.fetchEvaluationPeriods({
      per_page: 50,
      school_year_id: currentEnrollment?.school_year_id,
      sort_by: 'sort_order',
      sort_order: 'asc',
    }),
    enabled: tab === 'notes' && !!currentEnrollment?.school_year_id,
  })

  // Finance tab
  const { data: feeAssignments, refetch: refetchFees } = useQuery({
    queryKey: ['fee-assignments-student', numericId],
    queryFn: () => financeApi.fetchFeeAssignments({ student_id: numericId, per_page: 50 }),
    enabled: !Number.isNaN(numericId) && tab === 'finance',
  })

  const { data: paymentsData, refetch: refetchPayments } = useQuery({
    queryKey: ['payments-student', numericId],
    queryFn: () => financeApi.fetchPayments({ student_id: numericId, per_page: 50 }),
    enabled: !Number.isNaN(numericId) && tab === 'finance',
  })

  const { data: feeTypes } = useQuery({
    queryKey: ['fee-types-active'],
    queryFn: () => financeApi.fetchFeeTypes({ is_active: true, per_page: 100 }),
    enabled: tab === 'finance' && canFinance,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createEnrollment = useMutation({
    mutationFn: () => enrollmentsApi.createEnrollment({
      student_id: numericId, school_year_id: syEnrollment, class_id: classId,
      enrollment_number: enrollmentNumber, enrollment_date: enrollmentDate,
      registration_status: 'validated', academic_status: 'enrolled', admission_type: 'new',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments-student'] })
      queryClient.invalidateQueries({ queryKey: ['student', numericId] })
      setEnrollErr(null); setEnrollmentNumber(''); setEnrollmentNumberManual(false); refetchNumber()
    },
    onError: (e) => setEnrollErr(getApiErrorMessage(e, "Impossible d'enregistrer l'inscription.")),
  })

  const updateEnrollment = useMutation({
    mutationFn: () => enrollmentsApi.updateEnrollment(editEnrollId!, {
      class_id: editEnrollClassId || undefined,
      academic_status: editEnrollAcStatus || undefined,
      registration_status: editEnrollRegStatus || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments-student'] })
      setEditEnrollId(null); setEditEnrollErr(null)
    },
    onError: (e) => setEditEnrollErr(getApiErrorMessage(e, "Impossible de modifier l'inscription.")),
  })

  const uploadDoc = useMutation({
    mutationFn: (file: File) => documentsApi.uploadDocument({
      file, title: docTitle || file.name, document_type: docType, student_id: numericId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-documents', numericId] })
      setDocTitle(''); setDocType('autre'); setDocErr(null)
      if (docFileRef.current) docFileRef.current.value = ''
    },
    onError: (e) => setDocErr(getApiErrorMessage(e, 'Impossible de téléverser le document.')),
  })

  const deleteDoc = useMutation({
    mutationFn: (docId: number) => documentsApi.deleteDocument(docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student-documents', numericId] }),
  })

  const addGrade = useMutation({
    mutationFn: () => gradesApi.createGrade({
      school_year_id: currentEnrollment!.school_year_id,
      evaluation_period_id: newGradeEvalId,
      class_id: currentEnrollment!.class_id,
      student_id: numericId,
      subject_id: newGradeSubjectId,
      score: parseFloat(newGradeScore),
      max_score: parseFloat(newGradeMaxScore),
      appreciation: newGradeAppreciation || undefined,
    }),
    onSuccess: () => {
      void refetchGrades()
      setNewGradeScore(''); setNewGradeAppreciation(''); setNewGradeErr(null)
    },
    onError: (e) => setNewGradeErr(getApiErrorMessage(e, 'Impossible d\'enregistrer la note.')),
  })

  const editGrade = useMutation({
    mutationFn: () => gradesApi.updateGrade(editGradeId!, { score: parseFloat(editGradeScore) }),
    onSuccess: () => { void refetchGrades(); setEditGradeId(null); setEditGradeErr(null) },
    onError: (e) => setEditGradeErr(getApiErrorMessage(e, 'Impossible de modifier la note.')),
  })

  const addPayment = useMutation({
    mutationFn: () => financeApi.createPayment({
      student_id: numericId,
      school_year_id: currentEnrollment?.school_year_id ?? 0,
      payment_date: newPayDate,
      amount: parseFloat(newPayAmount),
      payment_method: newPayMethod,
      note: newPayNote || null,
    }),
    onSuccess: () => {
      void refetchPayments(); void refetchFees()
      setNewPayAmount(''); setNewPayNote(''); setNewPayErr(null)
    },
    onError: (e) => setNewPayErr(getApiErrorMessage(e, 'Impossible d\'enregistrer le paiement.')),
  })

  const addFeeAssignment = useMutation({
    mutationFn: () => financeApi.createFeeAssignment({
      student_id: numericId,
      school_year_id: currentEnrollment?.school_year_id ?? 0,
      fee_type_id: newFeeTypeId,
      amount_due: parseFloat(newFeeAmount),
      due_date: newFeeDueDate || null,
    }),
    onSuccess: () => {
      void refetchFees()
      setNewFeeAmount(''); setNewFeeDueDate(''); setNewFeeErr(null)
    },
    onError: (e) => setNewFeeErr(getApiErrorMessage(e, 'Impossible d\'assigner les frais.')),
  })

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (Number.isNaN(numericId)) {
    return <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">Identifiant invalide.</p>
  }
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-3xl border-2 border-school-line bg-white/70" />
        <div className="h-12 animate-pulse rounded-2xl border-2 border-school-line bg-white/70" />
        <div className="h-64 animate-pulse rounded-3xl border-2 border-school-line bg-white/70" />
      </div>
    )
  }
  if (isError) {
    return <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">{(error as Error).message}</p>
  }
  if (!student) return null

  const age = ageOf(student.date_of_birth)
  const statusPill = STATUS_PILL[student.status] ?? 'school-pill-muted'
  const statusLabel = STATUS_LABEL[student.status] ?? student.status

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <Link to="/eleves" className="inline-flex items-center gap-1 text-sm font-bold text-school-grape hover:underline">
        ← Retour aux élèves
      </Link>

      {flashMsg && (
        <div role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✅ {flashMsg}
        </div>
      )}

      {/* Hero */}
      <section className="school-hero">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-white/15 p-1 backdrop-blur ring-2 ring-white/30">
              <StudentAvatar firstName={student.first_name} lastName={student.last_name} seed={student.id} size="lg" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">Fiche élève</p>
              <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{student.first_name} {student.last_name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="school-chip-on-dark"><span aria-hidden>🪪</span>{student.student_code}</span>
                {age != null && <span className="school-chip-on-dark"><span aria-hidden>🎂</span>{age} ans</span>}
                <span className={`${statusPill} !bg-white/90`}>{statusLabel}</span>
              </div>
            </div>
          </div>
          {canManage && (
            <Link to={`/eleves/${student.id}/editer`} className="rounded-2xl border-2 border-white/60 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25">
              ✏️ Modifier
            </Link>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-3xl border-2 border-school-line bg-white p-1.5 shadow-school" role="tablist">
        {tabs.map((t) => {
          const active = tab === t.id
          return (
            <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(t.id)}
              className={['school-tab-pill flex items-center gap-1.5', active ? 'school-tab-pill-active' : 'school-tab-pill-idle hover:bg-school-cream'].join(' ')}>
              <span aria-hidden>{t.emoji}</span><span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── INFOS ─────────────────────────────────────────────────────────── */}
      {tab === 'infos' && (
        <section className="school-section space-y-4">
          <SectionTitle emoji="🪪" title="Infos générales" iconClassName="bg-school-mist text-school-skydeep" />
          <dl className="school-dl">
            <div><dt>Statut</dt><dd><span className={statusPill}>{statusLabel}</span></dd></div>
            <div><dt>Date de naissance</dt><dd>{formatDate(student.date_of_birth)}</dd></div>
            {!simpleMode && <>
              <div><dt>Lieu de naissance</dt><dd>{student.place_of_birth ?? '—'}</dd></div>
              <div><dt>Nationalité</dt><dd>{student.nationality ?? '—'}</dd></div>
            </>}
            <div><dt>Ville</dt><dd>{student.city ?? '—'}</dd></div>
            {!simpleMode && <div><dt>Adresse</dt><dd>{student.address ?? '—'}</dd></div>}
            <div><dt>Contact urgence</dt><dd>{student.emergency_contact_name ?? '—'}{student.emergency_contact_phone ? ` · ${student.emergency_contact_phone}` : ''}</dd></div>
            <div><dt>Téléphone parents</dt><dd>{[student.parent_phone_1, student.parent_phone_2, student.parent_phone_3].filter(Boolean).join(' · ') || '—'}</dd></div>
          </dl>
        </section>
      )}

      {/* ── INSCRIPTION ───────────────────────────────────────────────────── */}
      {tab === 'inscription' && (
        <div className="space-y-4">
          <section className="school-section">
            <SectionTitle emoji="📝" title="Inscriptions enregistrées" iconClassName="bg-school-grape/10 text-school-grape" />
            {enrollments?.items?.length ? (
              <ul className="space-y-2">
                {enrollments.items.map((e) => (
                  <li key={e.id} className="rounded-2xl border-2 border-school-line bg-white px-4 py-3 text-sm space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-school-inkmuted">{e.enrollment_number}</span>
                      <span className="school-chip">{e.school_year_name ?? e.school_year?.name ?? 'Non défini'}</span>
                      <span className="school-pill-sky">{e.class_name ?? e.school_class?.name ?? 'Non défini'}</span>
                      {!simpleMode && (
                        <span className="ml-auto text-xs font-semibold text-school-inkmuted">
                          {ACADEMIC_STATUS_LABEL[e.academic_status] ?? e.academic_status}
                          {' · '}
                          {REGISTRATION_STATUS_LABEL[e.registration_status] ?? e.registration_status}
                        </span>
                      )}
                      {canEnroll && (
                        <button type="button" onClick={() => {
                          setEditEnrollId(e.id)
                          setEditEnrollClassId(e.class_id)
                          setEditEnrollAcStatus(e.academic_status)
                          setEditEnrollRegStatus(e.registration_status)
                          setEditEnrollErr(null)
                        }} className="text-xs font-bold text-school-skydeep hover:underline">
                          Modifier
                        </button>
                      )}
                    </div>
                    {editEnrollId === e.id && (
                      <div className="mt-2 rounded-xl border border-school-line bg-school-cream p-3 space-y-2">
                        {editEnrollErr && <p className="text-xs text-red-600">{editEnrollErr}</p>}
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Field label="Classe">
                            <select value={editEnrollClassId} onChange={(ev) => setEditEnrollClassId(Number(ev.target.value))} className="school-select text-xs">
                              <option value={e.class_id}>{e.class_name ?? e.school_class?.name ?? 'Actuelle'}</option>
                              {classesForYear?.items.filter((c) => c.id !== e.class_id).map((c) => (
                                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Statut académique">
                            <select value={editEnrollAcStatus} onChange={(ev) => setEditEnrollAcStatus(ev.target.value)} className="school-select text-xs">
                              {Object.entries(ACADEMIC_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </Field>
                          <Field label="Statut inscription">
                            <select value={editEnrollRegStatus} onChange={(ev) => setEditEnrollRegStatus(ev.target.value)} className="school-select text-xs">
                              {Object.entries(REGISTRATION_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </Field>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={() => setEditEnrollId(null)} className="school-btn-secondary text-xs">Annuler</button>
                          <button type="button" disabled={updateEnrollment.isPending} onClick={() => updateEnrollment.mutate()} className="school-btn-primary text-xs disabled:opacity-60">
                            {updateEnrollment.isPending ? 'Enregistrement…' : 'Enregistrer'}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState emoji="🪶" title="Aucune inscription" hint="Les inscriptions enregistrées s'afficheront ici." />
            )}
          </section>

          {canEnroll && (
            <form className="school-section space-y-3" onSubmit={(e) => {
              e.preventDefault(); setEnrollErr(null)
              if (!syEnrollment || !classId || !enrollmentNumber.trim()) {
                setEnrollErr("Renseignez année, classe et numéro d'inscription."); return
              }
              createEnrollment.mutate()
            }}>
              <SectionTitle emoji="➕" title="Nouvelle inscription" iconClassName="bg-school-leaf/15 text-school-leafdeep" />
              {enrollErr && <p className="rounded-2xl border-2 border-school-coral/40 bg-school-coral/10 px-4 py-2.5 text-sm font-semibold text-[#B23A2E]">{enrollErr}</p>}
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Année scolaire">
                  <select required value={syEnrollment || ''} onChange={(e) => { setSyEnrollment(Number(e.target.value)); setClassId(0) }} className="school-select">
                    <option value="">—</option>
                    {years?.items.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </Field>
                <Field label="Classe">
                  <select required value={classId || ''} onChange={(e) => setClassId(Number(e.target.value))} className="school-select">
                    <option value="">—</option>
                    {classesForYear?.items.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </Field>
                <Field label="N° inscription (généré automatiquement)">
                  <div className="flex gap-2">
                    <input value={enrollmentNumber} onChange={(e) => { setEnrollmentNumberManual(true); setEnrollmentNumber(e.target.value) }} className="school-input font-mono" placeholder="INS-2026-0001" />
                    <button type="button" title="Regénérer" onClick={() => { setEnrollmentNumberManual(false); refetchNumber() }} className="shrink-0 rounded-xl border-2 border-school-line px-2 text-school-inkmuted hover:bg-school-cream">↻</button>
                  </div>
                </Field>
                <Field label="Date">
                  <input type="date" value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} className="school-input" />
                </Field>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={createEnrollment.isPending} className="school-btn-primary disabled:opacity-60">
                  {createEnrollment.isPending ? 'Enregistrement…' : "Enregistrer l'inscription"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── HISTORIQUE ────────────────────────────────────────────────────── */}
      {tab === 'historique' && (
        <section className="school-section">
          <SectionTitle emoji="🕰️" title="Chronologie" iconClassName="bg-school-lilac/20 text-[#5b3fa0]" />
          {history && (history.timeline as { date?: string; label?: string }[]).length ? (
            <ul className="space-y-2">
              {(history.timeline as { date?: string; label?: string }[]).map((ev, i) => (
                <li key={i} className="flex items-start gap-3 rounded-2xl border-2 border-school-line bg-white px-4 py-3">
                  <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-school-grape" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">{ev.date}</p>
                    <p className="text-sm font-semibold text-school-ink">{ev.label}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState emoji="🌱" title="Pas encore d'historique" hint="Les évènements liés à cet élève apparaîtront ici." />
          )}
        </section>
      )}

      {/* ── DOCUMENTS ─────────────────────────────────────────────────────── */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <section className="school-section">
            <SectionTitle emoji="📁" title="Documents" iconClassName="bg-school-sunsoft text-[#8A6A00]" />
            {documents && (documents as Array<unknown>).length ? (
              <ul className="space-y-2">
                {(documents as { id: number; title: string; document_type: string; status: string }[]).map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-school-line bg-white px-4 py-3 text-sm">
                    <span className="font-semibold text-school-ink flex-1">{d.title}</span>
                    <span className="school-chip text-xs">{d.document_type}</span>
                    <span className="school-pill-sky">{d.status}</span>
                    <button type="button" onClick={() => documentsApi.downloadDocument(d.id)} className="text-xs font-bold text-school-grape hover:underline">
                      Télécharger
                    </button>
                    {canDocs && (
                      <button type="button" onClick={() => { if (window.confirm('Supprimer ce document ?')) deleteDoc.mutate(d.id) }} className="text-xs font-bold text-[#B23A2E] hover:underline">
                        Supprimer
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState emoji="📂" title="Aucun document" hint="Les documents importés apparaîtront ici." />
            )}
          </section>

          {canDocs && (
            <section className="school-section space-y-3">
              <SectionTitle emoji="⬆️" title="Ajouter un document" iconClassName="bg-school-leaf/15 text-school-leafdeep" />
              {docErr && <p className="text-sm text-red-600">{docErr}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Titre">
                  <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Ex. Bulletin S1" className="school-input" />
                </Field>
                <Field label="Type de document">
                  <select value={docType} onChange={(e) => setDocType(e.target.value)} className="school-select">
                    {DOC_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <input ref={docFileRef} type="file" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) { uploadDoc.mutate(f); e.target.value = '' }
              }} />
              <button type="button" disabled={uploadDoc.isPending} onClick={() => docFileRef.current?.click()} className="school-btn-primary disabled:opacity-60">
                {uploadDoc.isPending ? 'Envoi…' : 'Choisir un fichier et envoyer'}
              </button>
            </section>
          )}
        </div>
      )}

      {/* ── NOTES ─────────────────────────────────────────────────────────── */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <section className="school-section">
            <SectionTitle emoji="📊" title="Notes" iconClassName="bg-school-grape/10 text-school-grape" />
            {grades && (grades.items as Array<unknown>).length ? (
              <ul className="divide-y divide-school-line">
                {(grades.items as { id: number; score?: string | number; subject?: { name?: string } }[]).map((g) => (
                  <li key={g.id} className="flex items-center justify-between py-2.5 text-sm gap-3">
                    <span className="font-semibold text-school-ink flex-1">{g.subject?.name ?? '—'}</span>
                    {editGradeId === g.id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} step={0.25} value={editGradeScore} onChange={(e) => setEditGradeScore(e.target.value)} className="school-input w-20 text-center font-mono" autoFocus />
                        {editGradeErr && <span className="text-xs text-red-600">{editGradeErr}</span>}
                        <button type="button" onClick={() => editGrade.mutate()} disabled={editGrade.isPending} className="school-btn-primary text-xs px-2 py-1 disabled:opacity-60">✓</button>
                        <button type="button" onClick={() => setEditGradeId(null)} className="school-btn-secondary text-xs px-2 py-1">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-bold text-school-grape tabular-nums">{g.score ?? '—'}</span>
                        {canGrades && (
                          <button type="button" onClick={() => { setEditGradeId(g.id); setEditGradeScore(String(g.score ?? '')) }} className="text-xs text-school-inkmuted hover:text-school-grape">✏️</button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState emoji="📐" title="Pas encore de notes" hint="Les notes apparaîtront ici une fois saisies." />
            )}
          </section>

          {canGrades && currentEnrollment ? (
            <form className="school-section space-y-3" onSubmit={(e) => {
              e.preventDefault(); setNewGradeErr(null)
              if (!newGradeSubjectId || !newGradeEvalId || !newGradeScore) {
                setNewGradeErr('Indiquez la matière, la période et la note.'); return
              }
              addGrade.mutate()
            }}>
              <SectionTitle emoji="➕" title="Ajouter une note" iconClassName="bg-school-leaf/15 text-school-leafdeep" />
              {newGradeErr && <p className="text-sm text-red-600">{newGradeErr}</p>}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Matière">
                  <select required value={newGradeSubjectId || ''} onChange={(e) => setNewGradeSubjectId(Number(e.target.value))} className="school-select">
                    <option value="">—</option>
                    {subjects?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Période d'évaluation">
                  <select required value={newGradeEvalId || ''} onChange={(e) => setNewGradeEvalId(Number(e.target.value))} className="school-select">
                    <option value="">—</option>
                    {evalPeriods?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Note">
                  <input required type="number" min={0} step={0.25} value={newGradeScore} onChange={(e) => setNewGradeScore(e.target.value)} className="school-input" placeholder="12.5" />
                </Field>
                <Field label="Note max">
                  <input required type="number" min={1} value={newGradeMaxScore} onChange={(e) => setNewGradeMaxScore(e.target.value)} className="school-input" placeholder="20" />
                </Field>
              </div>
              <Field label="Appréciation (optionnel)">
                <input value={newGradeAppreciation} onChange={(e) => setNewGradeAppreciation(e.target.value)} className="school-input" placeholder="Très bon travail…" />
              </Field>
              <div className="flex justify-end">
                <button type="submit" disabled={addGrade.isPending} className="school-btn-primary disabled:opacity-60">
                  {addGrade.isPending ? 'Enregistrement…' : 'Enregistrer la note'}
                </button>
              </div>
            </form>
          ) : canGrades && !currentEnrollment ? (
            <p className="text-sm text-school-inkmuted italic">L'élève doit être inscrit dans une classe pour saisir des notes.</p>
          ) : null}
        </div>
      )}

      {/* ── ABSENCES ──────────────────────────────────────────────────────── */}
      {tab === 'absences' && (
        <div className="space-y-4">
          <section className="school-section">
            <SectionTitle emoji="🗓️" title="Absences & retards" iconClassName="bg-school-coral/15 text-[#B23A2E]" />
            {attendance && (attendance.items as attendanceApi.AttendanceRecord[]).length ? (
              <div className="school-table-wrap">
                <table className="school-table">
                  <thead><tr><th>Date</th><th>Statut</th><th>Justifié</th><th /></tr></thead>
                  <tbody>
                    {(attendance.items as attendanceApi.AttendanceRecord[]).map((a) => (
                      <tr key={a.id}>
                        <td className="text-school-inkmuted">{formatDate(a.attendance_date)}</td>
                        <td>
                          {a.attendance_status === 'absent' ? <span className="school-pill-coral">Absent</span>
                            : a.attendance_status === 'late' ? <span className="school-pill-sun">Retard{a.minutes_late != null ? ` · ${a.minutes_late} min` : ''}</span>
                            : <span className="school-pill-green">Présent</span>}
                        </td>
                        <td>{a.is_justified ? <span className="school-pill-green">Oui</span> : <span className="school-pill-muted">Non</span>}</td>
                        <td className="text-right">
                          {canJustify && a.attendance_status === 'absent' && !a.is_justified && (
                            <button type="button" onClick={() => justifyMutation.mutate({ id: a.id })} disabled={justifyMutation.isPending} className="text-xs font-bold text-school-grape hover:underline disabled:opacity-60">
                              Justifier
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState emoji="🌤️" title="Aucune absence enregistrée" hint="Bonne nouvelle ! Aucun retard ni absence à signaler." />
            )}
          </section>

        </div>
      )}

      {/* ── FINANCE ───────────────────────────────────────────────────────── */}
      {tab === 'finance' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Fee assignments */}
            <section className="school-section space-y-3">
              <SectionTitle emoji="💼" title="Frais scolaires" iconClassName="bg-school-sunsoft text-[#8A6A00]" />
              {feeAssignments?.items.length ? (
                <ul className="space-y-2 text-sm">
                  {feeAssignments.items.map((f) => (
                    <li key={f.id} className="flex items-center justify-between rounded-2xl border-2 border-school-line bg-white px-4 py-2.5">
                      <span className="font-semibold text-school-ink flex-1">{(f as unknown as { fee_type?: { name?: string } }).fee_type?.name ?? `Frais #${f.id}`}</span>
                      <span className="school-pill-sky">{f.status}</span>
                      <span className="font-bold tabular-nums text-school-ink ml-2">Dû: {f.balance}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-school-inkmuted">Aucun frais assigné.</p>}

              {canFinance && currentEnrollment && (
                <form onSubmit={(e) => {
                  e.preventDefault(); setNewFeeErr(null)
                  if (!newFeeTypeId || !newFeeAmount) { setNewFeeErr('Sélectionnez un type de frais et indiquez le montant.'); return }
                  addFeeAssignment.mutate()
                }} className="border-t-2 border-school-line pt-3 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-school-inkmuted">Assigner des frais</p>
                  {newFeeErr && <p className="text-xs text-red-600">{newFeeErr}</p>}
                  <Field label="Type de frais">
                    <select required value={newFeeTypeId || ''} onChange={(e) => setNewFeeTypeId(Number(e.target.value))} className="school-select text-sm">
                      <option value="">—</option>
                      {feeTypes?.items.map((ft) => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                    </select>
                  </Field>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Montant dû (MAD)">
                      <input required type="number" min={0} step={0.01} value={newFeeAmount} onChange={(e) => setNewFeeAmount(e.target.value)} className="school-input" placeholder="1500.00" />
                    </Field>
                    <Field label="Date limite">
                      <input type="date" value={newFeeDueDate} onChange={(e) => setNewFeeDueDate(e.target.value)} className="school-input" />
                    </Field>
                  </div>
                  <button type="submit" disabled={addFeeAssignment.isPending} className="school-btn-primary text-sm disabled:opacity-60">
                    {addFeeAssignment.isPending ? 'Assignation…' : 'Assigner'}
                  </button>
                </form>
              )}
            </section>

            {/* Payments */}
            <section className="school-section space-y-3">
              <SectionTitle emoji="💰" title="Paiements" iconClassName="bg-school-leaf/15 text-school-leafdeep" />
              {paymentsData?.items.length ? (
                <ul className="space-y-2 text-sm">
                  {paymentsData.items.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-2xl border-2 border-school-line bg-white px-4 py-2.5">
                      <span className="text-school-inkmuted">{formatDate(p.payment_date)}</span>
                      <span className="school-chip text-xs">{PAYMENT_METHODS.find(([k]) => k === p.payment_method)?.[1] ?? p.payment_method}</span>
                      <span className="font-bold tabular-nums text-school-leafdeep">+{p.amount} MAD</span>
                      {p.has_receipt && (
                        <button type="button" onClick={() => financeApi.downloadReceipt(p.id)} className="text-xs font-bold text-school-grape hover:underline ml-1">Reçu</button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-school-inkmuted">Aucun paiement.</p>}

              {canFinance && currentEnrollment && (
                <form onSubmit={(e) => {
                  e.preventDefault(); setNewPayErr(null)
                  if (!newPayAmount) { setNewPayErr('Indiquez le montant.'); return }
                  addPayment.mutate()
                }} className="border-t-2 border-school-line pt-3 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-school-inkmuted">Enregistrer un paiement</p>
                  {newPayErr && <p className="text-xs text-red-600">{newPayErr}</p>}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Montant (MAD)">
                      <input required type="number" min={0.01} step={0.01} value={newPayAmount} onChange={(e) => setNewPayAmount(e.target.value)} className="school-input" placeholder="500.00" />
                    </Field>
                    <Field label="Date">
                      <input required type="date" value={newPayDate} onChange={(e) => setNewPayDate(e.target.value)} className="school-input" />
                    </Field>
                  </div>
                  <Field label="Mode de paiement">
                    <select value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)} className="school-select">
                      {PAYMENT_METHODS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Note (optionnel)">
                    <input value={newPayNote} onChange={(e) => setNewPayNote(e.target.value)} className="school-input" placeholder="Paiement partiel, avance…" />
                  </Field>
                  <button type="submit" disabled={addPayment.isPending} className="school-btn-primary text-sm disabled:opacity-60">
                    {addPayment.isPending ? 'Enregistrement…' : 'Enregistrer le paiement'}
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">{label}</span>
      {children}
    </label>
  )
}
