import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as classesApi from '../api/classes'
import * as evaluationPeriodsApi from '../api/evaluationPeriods'
import * as schoolYearsApi from '../api/schoolYears'

/**
 * Fetches all school years and auto-selects the current one.
 * Returns [schoolYearId, setSchoolYearId, years, isLoading].
 */
export function useSchoolYearSelector() {
  const [schoolYearId, setSchoolYearId] = useState<number>(0)

  const { data: years, isLoading } = useQuery({
    queryKey: ['school-years-selector'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!years?.items.length || schoolYearId > 0) return
    const current = years.items.find((y) => y.is_current) ?? years.items[0]
    setSchoolYearId(current.id)
  }, [years, schoolYearId])

  return { schoolYearId, setSchoolYearId, years: years?.items ?? [], isLoading }
}

/**
 * Fetches classes for a given school year.
 * Returns class list and options for SearchSelect / <select>.
 */
export function useClassSelector(schoolYearId: number) {
  const { data, isLoading } = useQuery({
    queryKey: ['classes-selector', schoolYearId],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 200,
        school_year_id: schoolYearId > 0 ? schoolYearId : undefined,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    staleTime: 2 * 60 * 1000,
  })

  const options = useMemo(
    () => (data?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    [data?.items]
  )

  return { classes: data?.items ?? [], options, isLoading }
}

/**
 * Fetches evaluation periods for a given school year.
 * Returns period list and options for SearchSelect / <select>.
 */
export function usePeriodSelector(schoolYearId: number) {
  const { data, isLoading } = useQuery({
    queryKey: ['periods-selector', schoolYearId],
    queryFn: () =>
      evaluationPeriodsApi.fetchEvaluationPeriods({
        per_page: 100,
        school_year_id: schoolYearId,
        sort_by: 'sort_order',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
    staleTime: 2 * 60 * 1000,
  })

  const options = useMemo(
    () =>
      (data?.items ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        hint: p.is_closed ? '🔒 Clôturée' : undefined,
      })),
    [data?.items]
  )

  return { periods: data?.items ?? [], options, isLoading }
}
