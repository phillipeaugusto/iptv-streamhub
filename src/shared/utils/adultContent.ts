/**
 * Heurísticas para identificar conteúdo adulto em metadados do servidor.
 * Não depende de inventar categorias — usa nomes reais retornados pela API.
 */

const ADULT_PATTERN =
  /\b(adult|adulto|adulta|adultas|adultos|xxx|xx+|porn|porno|pornô|erotic|erotica|erótico|erótica|nsfw|18\+|21\+|16\+|hot\s*xxx|onlyfans|playboy|sex|sexo|sexual|nude|nudes|hustler|brazzers|fansly)\b|[+＋]?18\b|\bxxx\b/i

export function isAdultLabel(...parts: Array<string | undefined | null>): boolean {
  const text = parts.filter(Boolean).join(' ').trim()
  if (!text) return false
  return ADULT_PATTERN.test(text)
}

export function isAdultCategory(category: { name: string; id?: string }): boolean {
  return isAdultLabel(category.name, category.id)
}

export function filterAdultCategories<T extends { name: string; id: string }>(
  categories: T[],
  showAdult: boolean,
): T[] {
  if (showAdult) return categories
  return categories.filter((category) => !isAdultCategory(category))
}

export function getAdultCategoryIds(categories: Array<{ id: string; name: string }>): Set<string> {
  return new Set(categories.filter((category) => isAdultCategory(category)).map((c) => c.id))
}

export function isAdultContent(
  item: {
    name?: string
    title?: string
    categoryIds?: string[]
  },
  adultCategoryIds?: Set<string>,
): boolean {
  if (isAdultLabel(item.name, item.title)) return true
  if (!adultCategoryIds || adultCategoryIds.size === 0) return false
  return (item.categoryIds ?? []).some((id) => adultCategoryIds.has(id))
}

export function filterAdultContent<T extends { name?: string; title?: string; categoryIds?: string[] }>(
  items: T[],
  showAdult: boolean,
  adultCategoryIds?: Set<string>,
): T[] {
  if (showAdult) return items
  return items.filter((item) => !isAdultContent(item, adultCategoryIds))
}

export function scrubAdultHistoryItems<T extends { title: string }>(items: T[]): T[] {
  return items.filter((item) => !isAdultLabel(item.title))
}
