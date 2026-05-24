import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'

/**
 * SiteInitializer — mounts once at app root.
 * Validates the ?site= URL param against the Supabase sites table.
 * Known sites (in the static SITES dict) are pre-validated and skipped.
 * Unknown slugs are checked server-side; invalid ones set siteStatus = 'invalid'.
 */
export function SiteInitializer() {
  const siteKey = useAppStore((s) => s.siteKey)
  const siteStatus = useAppStore((s) => s.siteStatus)
  const setSiteStatus = useAppStore((s) => s.setSiteStatus)
  const setSiteInfo = useAppStore((s) => s.setSiteInfo)

  useEffect(() => {
    if (siteStatus !== 'resolving') return

    supabase
      .from('sites')
      .select('id, name, address')
      .eq('id', siteKey)
      .eq('active', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setSiteStatus('invalid')
          return
        }
        setSiteInfo({ key: data.id, name: data.name, addr: data.address ?? '' })
      })
  }, [siteKey, siteStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
