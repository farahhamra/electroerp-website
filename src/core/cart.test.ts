import { describe, expect, it } from 'vitest'
import { cartTotals, formatMoney, reconcileCart } from './cart'
import { productSchema } from './schema'

const product = productSchema.parse({
  id: 'one',
  slug: 'one',
  name: 'One',
  brand: 'Orbit',
  model: 'H1',
  categoryId: 'audio',
  categoryName: 'Audio',
  description: '',
  details: [],
  images: ['one.svg'],
  variants: [
    { id: 'black', sku: 'H1-B', options: { Color: 'Black' }, price: 12999, stock: 3 },
    { id: 'white', sku: 'H1-W', options: { Color: 'White' }, price: 15000, stock: 0 },
  ],
})
const shipping = {
  countries: ['United States'],
  shippingFee: 1000,
  freeShippingThreshold: 15000,
  notice: 'Demo',
}
describe('cart integrity', () => {
  it('merges duplicates and clamps quantity to available stock', () =>
    expect(
      reconcileCart(
        [
          { productId: 'one', variantId: 'black', quantity: 2 },
          { productId: 'one', variantId: 'black', quantity: 2 },
        ],
        [product],
      ),
    ).toEqual([{ productId: 'one', variantId: 'black', quantity: 3 }]))
  it('discards unavailable, unknown, and invalid quantities', () =>
    expect(
      reconcileCart(
        [
          { productId: 'one', variantId: 'white', quantity: 1 },
          { productId: 'missing', variantId: 'black', quantity: 1 },
          { productId: 'one', variantId: 'black', quantity: -1 },
          { productId: 'one', variantId: 'black', quantity: 1.5 },
        ],
        [product],
      ),
    ).toEqual([]))
  it('uses integer minor units and applies shipping thresholds', () => {
    expect(
      cartTotals([{ productId: 'one', variantId: 'black', quantity: 1 }], [product], shipping),
    ).toEqual({ subtotal: 12999, shipping: 1000, total: 13999 })
    expect(
      cartTotals([{ productId: 'one', variantId: 'black', quantity: 2 }], [product], shipping),
    ).toEqual({ subtotal: 25998, shipping: 0, total: 25998 })
    expect(cartTotals([], [product], shipping)).toEqual({ subtotal: 0, shipping: 0, total: 0 })
  })
  it('formats currencies with the configured minor-unit precision', () => {
    expect(formatMoney(12999, { locale: 'en-US', currency: 'USD', currencyDecimals: 2 })).toBe(
      '$129.99',
    )
    expect(formatMoney(1500, { locale: 'en-US', currency: 'JPY', currencyDecimals: 0 })).toBe(
      '¥1,500',
    )
  })
})
