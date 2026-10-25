import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CartLine, DataProvider, Product, StoreData } from '../core/schema'
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
  const [products, setProducts] = useState(data.products)
  const registerProduct = useCallback(
    (product: Product) =>
      setProducts((previous) =>
        previous.some((p) => p.id === product.id)
          ? previous.map((p) => (p.id === product.id ? product : p))
          : [...previous, product],
      ),
    [],
  )
  const key = `electroerp:cart:${data.config.storeId}`
  const [cart, setCart] = useState(() => reconcileCart(readCart(key), data.products))
  const [notice, setNotice] = useState('')
  useEffect(() => {
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
  const addToCart = (productId: string, variantId: string, quantity = 1) => {
    const product = products.find((p) => p.id === productId)
    const variant = product?.variants.find((v) => v.id === variantId)
    const inCart =
      cart.find((l) => l.productId === productId && l.variantId === variantId)?.quantity ?? 0
    if (!variant || variant.stock <= inCart) {
      setNotice('You already have all available stock in your bag.')
      return
    }
    setCart((previous) =>
      reconcileCart([...previous, { productId, variantId, quantity }], products),
    )
    setNotice(`${product!.name} added to your bag`)
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
    products,
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
