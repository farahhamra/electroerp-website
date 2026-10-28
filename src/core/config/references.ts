export function entityReferences(input: unknown): { kind: 'product' | 'category'; id: string }[] {
  const refs = new Map<string, { kind: 'product' | 'category'; id: string }>()
  function visit(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!value || typeof value !== 'object') return
    const obj = value as Record<string, unknown>
    if (obj.kind === 'product' && typeof obj.productId === 'string')
      refs.set('product:' + obj.productId, { kind: 'product', id: obj.productId })
    if (obj.kind === 'category' && typeof obj.categoryId === 'string')
      refs.set('category:' + obj.categoryId, { kind: 'category', id: obj.categoryId })
    Object.values(obj).forEach(visit)
  }
  visit(input)
  return [...refs.values()]
}
