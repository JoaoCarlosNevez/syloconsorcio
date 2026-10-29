// Peças compartilhadas das telas do celular: folha que sobe de baixo,
// aviso rápido (toast) e a barra "voltar".

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Mobile.module.css'
import { BackIcon } from './icons'

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <button type="button" className={styles.scrim} aria-label="Fechar" onClick={onClose} />
      <dialog open className={styles.sheet} aria-modal="true">
        <div className={styles.grab} />
        {children}
      </dialog>
    </>
  )
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  const show = useCallback((text: string) => {
    setMessage(text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2600)
  }, [])
  const node = message ? <output className={styles.toast}>{message}</output> : null
  return { show, node }
}

export function BackBar({
  label = 'Voltar',
  fallback = '/m',
}: { label?: string; fallback?: string }) {
  const navigate = useNavigate()
  return (
    <div className={styles.backBar}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(fallback))}
      >
        <BackIcon />
        {label}
      </button>
    </div>
  )
}

/** Reconta a cada segundo — pra contagens regressivas. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
