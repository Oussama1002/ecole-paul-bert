import { useQuery } from '@tanstack/react-query'
import * as schoolYearsApi from '../api/schoolYears'
import * as simpleSettingsApi from '../api/simpleSchoolSettings'
import { useAuth } from '../contexts/AuthContext'

/**
 * Resolves the active school year for banners and schedule.
 * Teachers lack school_years.view — use /simple-school-settings instead.
 */
export function useCurrentSchoolYear() {
  const { hasPermission } = useAuth()
  const canListYears = hasPermission('school_years.view')

  const yearsQuery = useQuery({
    queryKey: ['school-year-current', 'list'],
    queryFn: async () => {
      const flagged = await schoolYearsApi.fetchSchoolYears({
        per_page: 10,
        is_current: true,
      })
      if (flagged.items.length > 0) {
        return flagged
      }
      return schoolYearsApi.fetchSchoolYears({
        per_page: 20,
        sort_by: 'start_date',
        sort_order: 'desc',
      })
    },
    enabled: canListYears,
    staleTime: 2 * 60 * 1000,
  })

  const settingsQuery = useQuery({
    queryKey: ['school-year-current', 'settings'],
    queryFn: simpleSettingsApi.fetchSimpleSchoolSettings,
    enabled: !canListYears,
    staleTime: 2 * 60 * 1000,
  })

  if (canListYears) {
    const items = yearsQuery.data?.items ?? []
    const current = items.find((y) => y.is_current) ?? items[0]
    return {
      id: current?.id ?? null,
      name: current?.name ?? null,
      isLoading: yearsQuery.isLoading,
      hasCurrentYear: Boolean(current),
    }
  }

  const sy = settingsQuery.data?.current_school_year
  const fromOptions =
    sy?.options?.find((o) => o.is_current) ?? sy?.options?.[0]
  const id = sy?.id ?? fromOptions?.id ?? null
  const name = sy?.name ?? fromOptions?.name ?? null

  return {
    id: id != null ? Number(id) : null,
    name: name ?? null,
    isLoading: settingsQuery.isLoading,
    hasCurrentYear: id != null,
  }
}
