import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { safeErrorMessage } from '@/shared/utils/safeLog'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
  /** Título exibido quando um erro de renderização é capturado. */
  title?: string
}

interface State {
  error: Error | null
}

/**
 * Boundary de erro para rotas lazy e árvores de UI.
 * Em React 18, Error Boundaries continuam sendo class components.
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', safeErrorMessage(error), info.componentStack)
    }
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className={styles.wrap} role="alert">
        <h1 className={styles.title}>{this.props.title ?? 'Algo deu errado'}</h1>
        <p className={styles.message}>
          A interface encontrou um erro inesperado. Você pode tentar de novo ou recarregar o app.
        </p>
        {import.meta.env.DEV ? (
          <pre className={styles.detail}>{safeErrorMessage(error)}</pre>
        ) : null}
        <div className={styles.actions}>
          <Button onClick={this.handleRetry}>Tentar novamente</Button>
          <Button variant="secondary" onClick={this.handleReload}>
            Recarregar
          </Button>
        </div>
      </div>
    )
  }
}
