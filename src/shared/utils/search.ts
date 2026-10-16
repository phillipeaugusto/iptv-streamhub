/** Normaliza texto para busca: minúsculas e sem acentos. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const rows = a.length + 1
  const cols = b.length + 1
  const prev = new Array<number>(cols)
  const curr = new Array<number>(cols)

  for (let j = 0; j < cols; j += 1) prev[j] = j

  for (let i = 1; i < rows; i += 1) {
    curr[0] = i
    const ca = a.charCodeAt(i - 1)
    for (let j = 1; j < cols; j += 1) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j < cols; j += 1) prev[j] = curr[j]
  }

  return prev[b.length]
}

/**
 * Compara título com o termo digitado.
 * Aceita substring exata (após normalizar) e até 1 erro de digitação em palavras ≥ 4 letras
 * (ex.: "prision" encontra "Prison Break").
 */
export function matchesSearch(haystack: string, needle: string): boolean {
  const term = normalizeSearchText(needle)
  if (!term) return true

  const text = normalizeSearchText(haystack)
  if (text.includes(term)) return true

  if (term.length < 4) return false

  const words = text.split(/[^a-z0-9]+/).filter(Boolean)
  for (const word of words) {
    if (Math.abs(word.length - term.length) > 1) {
      if (word.length > term.length) {
        for (let i = 0; i <= word.length - term.length; i += 1) {
          if (levenshtein(word.slice(i, i + term.length), term) <= 1) return true
        }
      }
      continue
    }
    if (levenshtein(word, term) <= 1) return true
  }

  return false
}

export function filterByName<T extends { name: string }>(items: T[], search: string): T[] {
  const term = search.trim()
  if (!term) return items
  return items.filter((item) => matchesSearch(item.name, term))
}
