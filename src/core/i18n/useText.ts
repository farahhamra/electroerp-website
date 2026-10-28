import { useStore } from '../../context/StoreContext'
export function useText() {
  return useStore().t
}
