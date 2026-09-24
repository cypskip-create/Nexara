import { useEffect, useRef, useState } from 'react'

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

/** Finite scene progression. Only ticks on screen, in a visible tab, with motion enabled. */
export function useSequence(count: number, delay = 2000) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  // A complete scene is visible immediately when automatic motion is disabled.
  const [step, setStep] = useState(() => reduced ? count - 1 : 0)
  const [playing, setPlaying] = useState(true)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(!document.hidden)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {threshold:.3})
    if (ref.current) observer.observe(ref.current)
    const update = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])
  useEffect(() => {
    if (reduced || !playing || !visible || !pageVisible || step >= count - 1) return
    const timer = setTimeout(() => setStep(s => s + 1), delay)
    return () => clearTimeout(timer)
  }, [count,delay,playing,visible,pageVisible,reduced,step])
  return {ref, step, reduced, playing, setPlaying, choose:(index:number) => {setPlaying(false);setStep(index)}, replay:() => {setStep(0);setPlaying(true)}}
}

export function useLandingMotion() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const root = ref.current
    if (!root || reduced) return
    const targets = root.querySelectorAll<HTMLElement>('[data-enter]')
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {entry.target.classList.add('lf-visible');observer.unobserve(entry.target)}
    }),{threshold:.08})
    targets.forEach(target => { target.classList.add('lf-pending'); observer.observe(target) })
    return () => { observer.disconnect();targets.forEach(t => t.classList.remove('lf-pending')) }
  },[reduced])
  return ref
}
