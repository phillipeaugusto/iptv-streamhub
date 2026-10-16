import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import type { Category } from '@/shared/types/category'
import { Sheet, SheetBody, SheetContent, SheetHeader } from '@/shared/components/ui/Sheet'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { matchesSearch } from '@/shared/utils/search'
import { cn } from '@/shared/utils/cn'
import styles from './CategoryChips.module.css'

interface CategoryChipsProps {
  categories: Category[]
  selectedId?: string
  onSelect: (id: string) => void
  /**
   * `auto` — sheet no mobile, coluna no desktop
   * `list` — sempre lista (ex.: dentro de outro sheet)
   * `sheet` — sempre trigger + sheet
   */
  mode?: 'auto' | 'list' | 'sheet'
  /** Fecha o sheet externo ao escolher (útil quando embutido). */
  closeOnSelect?: boolean
}

export function CategoryChips({
  categories,
  selectedId = 'all',
  onSelect,
  mode = 'auto',
  closeOnSelect = true,
}: CategoryChipsProps) {
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const selectedRef = useRef<HTMLButtonElement | null>(null)

  const items = useMemo(
    () => [
      { id: 'all', name: 'Todos', kind: categories[0]?.kind ?? 'live', parentId: undefined },
      ...categories,
    ],
    [categories],
  )

  const filteredItems = useMemo(() => {
    const term = filter.trim()
    if (!term) return items
    return items.filter((item) => matchesSearch(item.name, term))
  }, [items, filter])

  const selectedName = items.find((item) => item.id === selectedId)?.name ?? 'Todos'
  const useSheet = mode === 'sheet' || (mode === 'auto' && isMobile)

  useEffect(() => {
    if (!sheetOpen && mode !== 'list') return
    const frame = requestAnimationFrame(() => {
      selectedRef.current?.scrollIntoView({ block: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [sheetOpen, selectedId, mode, filteredItems])

  const handleSelect = (id: string) => {
    onSelect(id)
    if (closeOnSelect) setSheetOpen(false)
    setFilter('')
  }

  const list = (
    <div className={styles.listWrap}>
      {items.length > 8 ? (
        <label className={styles.filter}>
          <Search size={16} aria-hidden />
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filtrar categorias…"
            enterKeyHint="search"
            autoComplete="off"
          />
        </label>
      ) : null}

      <div className={styles.column} role="listbox" aria-label="Categorias">
        {filteredItems.length === 0 ? (
          <p className={styles.empty}>Nenhuma categoria encontrada.</p>
        ) : (
          filteredItems.map((category) => {
            const active = selectedId === category.id
            return (
              <button
                key={category.id}
                ref={active ? selectedRef : undefined}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(styles.chip, active && styles.active)}
                onClick={() => handleSelect(category.id)}
              >
                {category.name}
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  if (mode === 'list' || !useSheet) {
    return list
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen(true)}
      >
        <span className={styles.triggerLabel}>
          <span className={styles.triggerHint}>Categoria</span>
          <strong>{selectedName}</strong>
        </span>
        <ChevronDown size={18} aria-hidden />
      </button>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setFilter('')
        }}
      >
        <SheetContent side="bottom" className={styles.sheetContent}>
          <SheetHeader title="Categorias" description="Escolha para filtrar a lista" />
          <SheetBody className={styles.sheetBody}>{list}</SheetBody>
        </SheetContent>
      </Sheet>
    </>
  )
}
