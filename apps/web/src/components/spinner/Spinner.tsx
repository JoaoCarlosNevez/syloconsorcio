// Spinner — bolinha girando pra "salvando…" em botões pequenos (ex: o check
// de concluir tarefa). Usa a cor do texto em volta.

import styles from './Spinner.module.css'

export function Spinner({ size = 14, label }: { size?: number; label?: string }) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}
