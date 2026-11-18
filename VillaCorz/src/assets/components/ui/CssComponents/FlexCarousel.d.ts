import type { ComponentType, CSSProperties, Ref } from 'react'

export type FlexCarouselItem = {
    src: string
    alt?: string
    title?: string
    subtitle?: string
    quote?: string
    author?: string
    service?: string
    rating?: number
}

export type FlexCarouselPreset = 'liquid' | 'ribbon' | 'vortex' | 'arch'

export type FlexCarouselIntro = 'rise' | 'bloom' | 'spin' | 'deal' | 'none'

export type FlexCarouselHandle = {
    next: () => void
    previous: () => void
    goTo: (index: number) => void
}

type FlexCarouselProps = {
    items?: FlexCarouselItem[]
    preset?: FlexCarouselPreset
    intro?: FlexCarouselIntro
    cardHeight?: number
    gap?: number
    radius?: number
    fit?: 'natural' | 'portrait' | 'square' | 'landscape'
    lensWidth?: number
    lensHeight?: number
    tilt?: number
    roundness?: number
    bend?: number
    reach?: number
    curl?: 'twist' | 'rise' | 'fall'
    dispersion?: number
    liquid?: number
    followCursor?: boolean
    squeeze?: number
    focusOnClick?: boolean
    autoplay?: boolean
    interval?: number
    captions?: boolean
    captureWheel?: boolean
    ariaLabel?: string
    onChange?: (index: number, item: FlexCarouselItem) => void
    onSelect?: (index: number, item: FlexCarouselItem) => void
    className?: string
    style?: CSSProperties
    ref?: Ref<FlexCarouselHandle>
}

declare const FlexCarousel: ComponentType<FlexCarouselProps>

export default FlexCarousel
