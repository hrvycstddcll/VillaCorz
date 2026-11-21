import type { ComponentType, ReactNode } from 'react'

type SlideCommitProps = {
    label?: ReactNode
    doneLabel?: ReactNode
    errorLabel?: ReactNode
    onConfirm?: () => void | Promise<unknown>
    onDone?: () => void
    onError?: (reason: unknown) => void
    trackColor?: string
    handleColor?: string
    successColor?: string
    dangerColor?: string
    width?: number
    height?: number
    radius?: number
    speed?: number
    returnBounce?: number
    landingDip?: number
    holdMs?: number
    disabled?: boolean
    icon?: ReactNode
    className?: string
}

declare const SlideCommit: ComponentType<SlideCommitProps>

export default SlideCommit
