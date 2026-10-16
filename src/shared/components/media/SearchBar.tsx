import { Search, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { cn } from '@/shared/utils/cn'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
}: SearchBarProps) {
  return (
    <label className={cn(styles.wrap, className)}>
      <Search size={16} aria-hidden />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        className={styles.input}
        aria-label={placeholder}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Limpar busca"
          className={styles.clear}
          onClick={() => onChange('')}
        >
          <X size={16} />
        </Button>
      ) : null}
    </label>
  )
}
