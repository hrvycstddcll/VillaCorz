import {
    useCallback,
    useLayoutEffect,
    useRef,
    type ButtonHTMLAttributes,
    type CSSProperties,
    type MouseEvent,
    type ReactNode,
} from 'react'

type DirectionalButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode
    fillColor?: string
    textColor?: string
}

const DirectionalButton = ({
    children,
    className = '',
    fillColor = '#006dfc',
    textColor = '#ffffff',
    style,
    onMouseEnter,
    onMouseLeave,
    ...rest
}: DirectionalButtonProps) => {
    const buttonRef = useRef<HTMLButtonElement>(null)
    const fillRef = useRef<HTMLSpanElement>(null)

    useLayoutEffect(() => {
        const button = buttonRef.current
        if (!button) return
        const computed = getComputedStyle(button)
        button.style.setProperty('--btn-text', computed.color)
        button.style.setProperty('--btn-border', computed.borderTopColor)
    }, [])

    const placeFill = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const button = buttonRef.current
        const fill = fillRef.current
        if (!button || !fill) return null

        const rect = button.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        const radius = Math.hypot(
            Math.max(x, rect.width - x),
            Math.max(y, rect.height - y),
        )

        fill.style.width = `${radius * 2}px`
        fill.style.height = `${radius * 2}px`
        fill.style.setProperty('--x', `${x}`)
        fill.style.setProperty('--y', `${y}`)

        return fill
    }, [])

    const handleEnter = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const button = buttonRef.current
            const fill = placeFill(event)
            if (button && fill) {
                button.style.setProperty('--s', '0')
                void button.offsetWidth
                button.style.setProperty('--s', '1')
            }
            onMouseEnter?.(event)
        },
        [placeFill, onMouseEnter],
    )

    const handleLeave = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const button = buttonRef.current
            placeFill(event)
            if (button) button.style.setProperty('--s', '0')
            onMouseLeave?.(event)
        },
        [placeFill, onMouseLeave],
    )

    return (
        <button
            ref={buttonRef}
            className={`directional-button ${className}`}
            style={
                {
                    ...style,
                    '--btn-fill': fillColor,
                    '--btn-hover-text': textColor,
                } as CSSProperties
            }
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            {...rest}
        >
            <span
                ref={fillRef}
                className="directional-button__fill"
                aria-hidden="true"
            />
            <span className="directional-button__content">{children}</span>
        </button>
    )
}

export default DirectionalButton