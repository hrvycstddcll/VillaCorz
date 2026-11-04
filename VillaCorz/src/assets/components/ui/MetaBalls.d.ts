import type { CSSProperties, ComponentType } from 'react'

type MetaBallsProps = {
    className?: string
    color?: string
    cursorBallColor?: string
    speed?: number
    enableMouseInteraction?: boolean
    hoverSmoothness?: number
    animationSize?: number
    ballCount?: number
    clumpFactor?: number
    cursorBallSize?: number
    enableTransparency?: boolean
    variant?: 'solid' | 'outline' | 'contour'
    motion?: 'orbit' | 'attract' | 'swirl'
    gooeyness?: number
    stickiness?: number
    stretch?: number
    wobble?: number
    lineWidth?: number
    rings?: number
    clickBurst?: boolean
    intro?: boolean
    paused?: boolean
    dpr?: number
    style?: CSSProperties
}

declare const MetaBalls: ComponentType<MetaBallsProps>

export default MetaBalls
