import { useEffect, useRef, useState } from 'react'

/**
 * Measures a container's width so SVG charts can render in real pixel
 * coordinates (no viewBox distortion of text/strokes) and stay responsive.
 */
export function useChartWidth(fallback = 600) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => setWidth(el.clientWidth || fallback)
    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fallback])

  return { ref, width }
}
