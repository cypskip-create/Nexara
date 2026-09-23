import { useEffect } from 'react'

/** Pointer animation stays outside React rendering; disabled for touch/reduced motion. */
export function useMotion(view: string) {
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return
    const targets = document.querySelectorAll<HTMLElement>('.feature,.price-card,.flow-step,.hero-product')
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target) }
    }), { threshold: .12 })
    targets.forEach((el, index) => { el.classList.add('reveal'); el.style.setProperty('--delay', `${index % 3 * 90}ms`); observer.observe(el) })
    let frame = 0
    let current: HTMLElement | null = null
    const reset = () => { if (current) { current.style.removeProperty('transform'); current.classList.remove('tracking'); current = null } }
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || media.matches) return
      const target = (event.target as Element).closest<HTMLElement>('.hero-product,.feature,.price-card')
      if (target !== current) reset()
      if (!target) return
      current = target
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width - .5
        const y = (event.clientY - rect.top) / rect.height - .5
        target.classList.add('tracking')
        target.style.setProperty('--pointer-x', `${(x + .5) * 100}%`)
        target.style.setProperty('--pointer-y', `${(y + .5) * 100}%`)
        target.style.transform = `perspective(1100px) rotateX(${-y * 7}deg) rotateY(${x * 9}deg) translateY(-5px)`
      })
    }
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', reset)
    return () => { cancelAnimationFrame(frame); reset(); observer.disconnect(); targets.forEach(el => el.classList.remove('reveal')); document.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', reset) }
  }, [view])
}
