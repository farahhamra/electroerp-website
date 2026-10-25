import type { CartLine, Product, StoreConfig } from './schema'

export function reconcileCart(lines: CartLine[], products: Product[]): CartLine[] {
  const merged = new Map<string, CartLine>()
  for (const line of lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) continue
    const variant = products
      .find((p) => p.id === line.productId)
      ?.variants.find((v) => v.id === line.variantId)
    if (!variant || variant.stock < 1) continue
    const key = JSON.stringify([line.productId, line.variantId])
    const previous = merged.get(key)?.quantity ?? 0
    merged.set(key, { ...line, quantity: Math.min(previous + line.quantity, variant.stock) })
  }
  return [...merged.values()]
}

export function cartTotals(
  lines: CartLine[],
  products: Product[],
  checkout: StoreConfig['checkout'],
) {
  const subtotal = reconcileCart(lines, products).reduce((sum, line) => {
    const variant = products
      .find((p) => p.id === line.productId)!
      .variants.find((v) => v.id === line.variantId)!
    return sum + variant.price * line.quantity
  }, 0)
  const shipping =
    !subtotal ||
    (checkout.freeShippingThreshold !== undefined && subtotal >= checkout.freeShippingThreshold)
      ? 0
      : checkout.shippingFee
  return { subtotal, shipping, total: subtotal + shipping }
}

export function formatMoney(
  amount: number,
  config: Pick<StoreConfig, 'locale' | 'currency' | 'currencyDecimals'>,
) {
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.currencyDecimals,
  }).format(amount / 10 ** config.currencyDecimals)
}
