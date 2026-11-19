import type { CSSProperties } from 'react'
import type { GalleryItem } from '../../../../services/types'

export type DriftWallProps = {
    items?: GalleryItem[]
    columns?: number
    tileWidth?: number
    tileHeight?: number
    gap?: number
    radius?: number
    tilt?: number
    turn?: number
    roll?: number
    perspective?: number
    depth?: number
    speed?: number
    direction?: 'up' | 'down'
    variance?: number
    parallax?: number
    pauseOnHover?: boolean
    lift?: number
    fade?: number
    dim?: number
    grayscale?: boolean
    overlayColor?: string
    ariaLabel?: string
    onSelect?: (item: GalleryItem, index: number) => void
    className?: string
    style?: CSSProperties
}

declare const DriftWall: (props: DriftWallProps) => JSX.Element
export default DriftWall
