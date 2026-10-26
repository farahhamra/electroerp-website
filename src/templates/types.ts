import type { ComponentType } from 'react'
import type { Section } from '../core/schema'

export type HeroSection = Extract<Section, { type: 'hero' }>
export type ProductsSection = Extract<Section, { type: 'products' }>
export type CategoriesSection = Extract<Section, { type: 'categories' }>
export type BannerSection = Extract<Section, { type: 'banner' }>
export interface HeaderProps {
  onSearch: () => void
  menuOpen: boolean
  onMenuToggle: () => void
}
export interface StorefrontTemplate {
  Header: ComponentType<HeaderProps>
  Footer: ComponentType
  Hero: ComponentType<{ section: HeroSection }>
  Products: ComponentType<{ section: ProductsSection }>
  Categories: ComponentType<{ section: CategoriesSection }>
  Banner: ComponentType<{ section: BannerSection }>
  Benefits: ComponentType
}
