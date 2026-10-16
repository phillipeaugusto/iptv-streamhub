import styles from './Spinner.module.css'

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <span>{label}</span>
    </div>
  )
}
