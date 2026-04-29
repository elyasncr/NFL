import { useEffect, useRef, useState } from 'react'

interface Options {
  duration?: number  // ms
  decimals?: number
}

/**
 * Anima de 0 até `target` quando o elemento entra na viewport.
 * Retorna [valueAtual, ref] — coloca o ref no elemento que dispara.
 */
export function useCountUp(
  target: number,
  { duration = 700, decimals = 0 }: Options = {},
): [number, React.RefObject<HTMLDivElement>] {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const factor = Math.pow(10, decimals)

        const tick = (now: number) => {
          const elapsed = now - start
          const t = Math.min(elapsed / duration, 1)
          // ease-out cubic
          const eased = 1 - Math.pow(1 - t, 3)
          setValue(Math.round(target * eased * factor) / factor)
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        observer.disconnect()
      }
    }, { threshold: 0.4 })

    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration, decimals])

  return [value, ref]
}
