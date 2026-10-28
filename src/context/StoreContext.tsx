import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from 'react'
import type { CartLine, DataProvider, Product, StoreData } from '../core/schema'
import { translate } from '../core/i18n/translate'
import { cartTotals, reconcileCart } from '../core/cart'
import { createProductSearch } from '../core/search'

function readCart(key: string): CartLine[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(data)
      ? data.filter(
          (v): v is CartLine =>
            v &&
            typeof v.productId === 'string' &&
            typeof v.variantId === 'string' &&
            Number.isInteger(v.quantity),
        )
      : []
  } catch {
    return []
  }
}

function useStoreValue(data: StoreData, provider: DataProvider) {
  const [sourceProducts, setProducts] = useState(data.products)
  const products = useMemo(
    () =>
      sourceProducts.map((p) =>
        p.translations?.[data.config.locale] ? { ...p, ...p.translations[data.config.locale] } : p,
      ),
    [sourceProducts, data.config.locale],
  )
  const [categories, setCategories] = useState(data.categories)
  const registerCategory = useCallback(
    (category: StoreData['categories'][number]) =>
      setCategories((previous) =>
        previous.some((c) => c.id === category.id)
          ? previous.map((c) => (c.id === category.id ? category : c))
          : [...previous, category],
      ),
    [],
  )
  useEffect(() => {
    setProducts((previous) =>
      previous === data.products
        ? previous
        : [
            ...data.products,
            ...previous.filter((p) => !data.products.some((item) => item.id === p.id)),
          ],
    )
  }, [data.products])
  useEffect(() => {
    setCategories((previous) =>
      previous === data.categories
        ? previous
        : [
            ...data.categories,
            ...previous.filter((c) => !data.categories.some((item) => item.id === c.id)),
          ],
    )
  }, [data.categories])
  const registerProduct = useCallback(
    (product: Product) =>
      setProducts((previous) =>
        previous.some((p) => p === product)
          ? previous
          : previous.some((p) => p.id === product.id)
            ? previous.map((p) => (p.id === product.id ? product : p))
            : [...previous, product],
      ),
    [],
  )
  const t = useCallback(
    (key: string, values: Record<string, string | number> = {}) =>
      translate(
        data.config.locale,
        key,
        values,
        data.config.engine?.i18n.messages[data.config.locale],
      ),
    [data.config],
  )
  const key = `electroerp:cart:${data.config.storeId}`
  const [cart, setCart] = useState(() =>
    data.snapshot ? [] : reconcileCart(readCart(key), data.products),
  )
  const restored = useRef(!data.snapshot)
  useEffect(() => {
    setCart((previous) => {
      const next = reconcileCart(previous, products)
      return JSON.stringify(next) === JSON.stringify(previous) ? previous : next
    })
  }, [products])
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!restored.current) {
      restored.current = true
      setCart(reconcileCart(readCart(key), data.products))
      return
    }
    try {
      localStorage.setItem(key, JSON.stringify(cart))
    } catch {
      /* Shopping still works when storage is unavailable. */
    }
  }, [cart, key])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])
  const search = useMemo(() => createProductSearch(products), [products])
  const addToCart = (
    productId: string,
    variantId: string,
    quantity = 1,
    sourceProduct?: Product,
  ) => {
    const product = sourceProduct ?? products.find((p) => p.id === productId)
    const availableProducts = sourceProduct
      ? [...products.filter((p) => p.id !== sourceProduct.id), sourceProduct]
      : products
    const variant = product?.variants.find((v) => v.id === variantId)
    const inCart =
      cart.find((l) => l.productId === productId && l.variantId === variantId)?.quantity ?? 0
    if (!variant || variant.stock <= inCart) {
      setNotice(t('cart.stock'))
      return
    }
    setCart((previous) =>
      reconcileCart([...previous, { productId, variantId, quantity }], availableProducts),
    )
    if (sourceProduct) registerProduct(sourceProduct)
    setNotice(t('cart.added', { name: product!.name }))
  }
  const updateQuantity = (productId: string, variantId: string, quantity: number) =>
    setCart((previous) =>
      reconcileCart(
        previous.map((line) =>
          line.productId === productId && line.variantId === variantId
            ? { ...line, quantity }
            : line,
        ),
        products,
      ),
    )
  return {
    ...data,
    t,
    products,
    categories,
    registerCategory,
    registerProduct,
    provider,
    cart,
    addToCart,
    updateQuantity,
    clearCart: () => setCart([]),
    search,
    notice,
    totals: cartTotals(cart, products, data.config.checkout),
    count: cart.reduce((sum, item) => sum + item.quantity, 0),
  }
}
const StoreContext = createContext<ReturnType<typeof useStoreValue> | null>(null)
export function StoreProvider({
  data,
  provider,
  children,
}: {
  data: StoreData
  provider: DataProvider
  children: ReactNode
}) {
  const value = useStoreValue(data, provider)
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('StoreProvider is missing')
  return context
}
