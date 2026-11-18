/* eslint-disable react-hooks/refs */
import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'

type Side = 'top' | 'bottom' | 'left' | 'right'
type Size = 'sm' | 'md' | 'lg'

type WarmTooltipContextValue = {
    activeId: string | null
    setActiveId: (id: string | null) => void
    lastCloseAt: number
    setLastCloseAt: (t: number) => void
    warmWindow: number
    register: (id: string, rect: () => DOMRect) => void
    unregister: (id: string) => void
    triggers: Map<string, () => DOMRect>
}

const WarmTooltipContext = React.createContext<WarmTooltipContextValue | null>(null)

const sizeClasses: Record<Size, string> = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
}

export type WarmTooltipProps = {
    content: ReactNode
    shortcut?: ReactNode
    side?: Side
    delay?: number
    warmWindow?: number
    surfaceColor?: string
    inkColor?: string
    size?: Size
    arrow?: boolean
    showFuse?: boolean
    holdDuration?: number
    disabled?: boolean
    children: ReactNode
    className?: string
}

export type WarmTooltipGroupProps = {
    warmWindow?: number
    children: ReactNode
}

// Group provider
export const WarmTooltipGroup = ({ warmWindow = 300, children }: WarmTooltipGroupProps) => {
    const [activeId, setActiveId] = useState<string | null>(null)
    const [lastCloseAt, setLastCloseAt] = useState(0)
    const triggers = useRef(new Map<string, () => DOMRect>()).current

    const register = useCallback((id: string, rect: () => DOMRect) => {
        triggers.set(id, rect)
    }, [triggers])
    const unregister = useCallback((id: string) => {
        triggers.delete(id)
        if (activeId === id) setActiveId(null)
    }, [activeId, triggers])

    const value: WarmTooltipContextValue = {
        activeId,
        setActiveId,
        lastCloseAt,
        setLastCloseAt,
        warmWindow,
        register,
        unregister,
        triggers,
    }

    return (
        <WarmTooltipContext.Provider value={value}>
            {children}
        </WarmTooltipContext.Provider>
    )
}

// Single tooltip
let idCounter = 0

export const WarmTooltip = ({
    content,
    shortcut,
    side = 'top',
    delay = 400,
    warmWindow: warmWindowProp,
    surfaceColor = '#0f172a',
    inkColor = '#e2e8f0',
    size = 'md',
    arrow = true,
    showFuse = false,
    holdDuration = 500,
    disabled = false,
    children,
    className,
}: WarmTooltipProps) => {
    const ctx = useContext(WarmTooltipContext)
    const warmWindow = warmWindowProp ?? ctx?.warmWindow ?? 300

    const [id] = useState(() => `wt-${++idCounter}`)
    const triggerRef = useRef<HTMLElement | null>(null)
    const openTimer = useRef<number | null>(null)
    const holdTimer = useRef<number | null>(null)
    const fuseTimer = useRef<number | null>(null)

    const [open, setOpen] = useState(false)
    const [fuseProgress, setFuseProgress] = useState(0)
    const [pos, setPos] = useState({ x: 0, y: 0, side })

    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const springX = useSpring(x, { stiffness: 400, damping: 30 })
    const springY = useSpring(y, { stiffness: 400, damping: 30 })
    const tilt = useTransform(springX, (v) => {
        const center = window.innerWidth / 2
        return ((v - center) / center) * 4
    })

    const isActive = ctx ? ctx.activeId === id : open

    const computePosition = useCallback(() => {
        const el = triggerRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const bubbleW = 220
        const bubbleH = 48
        const gap = 8
        let s: Side = side
        let top = 0
        let left = 0

        if (s === 'top') {
            top = rect.top - bubbleH - gap
            left = rect.left + rect.width / 2 - bubbleW / 2
            if (top < 8) { s = 'bottom'; top = rect.bottom + gap }
        } else if (s === 'bottom') {
            top = rect.bottom + gap
            left = rect.left + rect.width / 2 - bubbleW / 2
            if (top + bubbleH > window.innerHeight - 8) { s = 'top'; top = rect.top - bubbleH - gap }
        } else if (s === 'left') {
            top = rect.top + rect.height / 2 - bubbleH / 2
            left = rect.left - bubbleW - gap
            if (left < 8) { s = 'right'; left = rect.right + gap }
        } else {
            top = rect.top + rect.height / 2 - bubbleH / 2
            left = rect.right + gap
            if (left + bubbleW > window.innerWidth - 8) { s = 'left'; left = rect.left - bubbleW - gap }
        }
        // clamp
        left = Math.max(8, Math.min(left, window.innerWidth - bubbleW - 8))
        top = Math.max(8, Math.min(top, window.innerHeight - bubbleH - 8))

        setPos({ x: left, y: top, side: s })
        x.set(left)
        y.set(top)
    }, [side, x, y])

    const isWarm = useCallback(() => {
        if (!ctx) return false
        return Date.now() - ctx.lastCloseAt < (warmWindow ?? ctx.warmWindow)
    }, [ctx, warmWindow])

    const openTooltip = useCallback(() => {
        if (disabled) return
        computePosition()
        if (ctx) ctx.setActiveId(id)
        else setOpen(true)
    }, [disabled, computePosition, ctx, id])

    const closeTooltip = useCallback(() => {
        if (ctx) {
            if (ctx.activeId === id) {
                ctx.setActiveId(null)
                ctx.setLastCloseAt(Date.now())
            }
        } else {
            setOpen(false)
        }
        if (openTimer.current) window.clearTimeout(openTimer.current)
        if (holdTimer.current) window.clearTimeout(holdTimer.current)
        if (fuseTimer.current) window.clearInterval(fuseTimer.current)
        setFuseProgress(0)
    }, [ctx, id])

    const scheduleOpen = useCallback(() => {
        if (disabled) return
        const warm = isWarm()
        const d = warm ? 0 : delay
        // fuse
        if (showFuse) {
            setFuseProgress(0)
            const start = Date.now()
            fuseTimer.current = window.setInterval(() => {
                const p = Math.min(1, (Date.now() - start) / Math.max(1, d))
                setFuseProgress(p)
                if (p >= 1 && fuseTimer.current) window.clearInterval(fuseTimer.current)
            }, 16)
        }
        if (openTimer.current) window.clearTimeout(openTimer.current)
        openTimer.current = window.setTimeout(() => {
            openTooltip()
            if (fuseTimer.current) window.clearInterval(fuseTimer.current)
            setFuseProgress(0)
        }, d)
    }, [disabled, isWarm, delay, showFuse, openTooltip])

    // register trigger rect
    useEffect(() => {
        if (!triggerRef.current) return
        const getRect = () => triggerRef.current!.getBoundingClientRect()
        ctx?.register(id, getRect)
        return () => ctx?.unregister(id)
    }, [ctx, id])

    // recompute on active change / scroll
    useEffect(() => {
        if (!(ctx ? ctx.activeId === id : open)) return
        computePosition()
        const onScroll = () => computePosition()
        window.addEventListener('scroll', onScroll, true)
        window.addEventListener('resize', onScroll)
        return () => {
            window.removeEventListener('scroll', onScroll, true)
            window.removeEventListener('resize', onScroll)
        }
    }, [ctx, id, open, computePosition])

    // cleanup timers
    useEffect(() => {
        return () => {
            if (openTimer.current) window.clearTimeout(openTimer.current)
            if (holdTimer.current) window.clearTimeout(holdTimer.current)
            if (fuseTimer.current) window.clearInterval(fuseTimer.current)
        }
    }, [])

    const handleMouseEnter = () => scheduleOpen()
    const handleMouseLeave = () => closeTooltip()
    const handleFocus = () => scheduleOpen()
    const handleBlur = () => closeTooltip()

    const handleTouchStart = () => {
        if (disabled) return
        if (showFuse) {
            setFuseProgress(0)
            const start = Date.now()
            fuseTimer.current = window.setInterval(() => {
                const p = Math.min(1, (Date.now() - start) / holdDuration)
                setFuseProgress(p)
                if (p >= 1 && fuseTimer.current) window.clearInterval(fuseTimer.current)
            }, 16)
        }
        holdTimer.current = window.setTimeout(() => {
            openTooltip()
            if (fuseTimer.current) window.clearInterval(fuseTimer.current)
            setFuseProgress(0)
        }, holdDuration)
    }
    const handleTouchEnd = () => {
        if (holdTimer.current) window.clearTimeout(holdTimer.current)
        if (fuseTimer.current) window.clearInterval(fuseTimer.current)
        setFuseProgress(0)
        closeTooltip()
    }

    // clone child to attach ref + handlers + aria-describedby
    const trigger = (
        <span
            ref={(el) => { triggerRef.current = el as HTMLElement }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            aria-describedby={isActive ? `wt-bubble-${id}` : undefined}
            className="relative inline-flex"
        >
            {children}
            {showFuse && fuseProgress > 0 && fuseProgress < 1 && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-[#006dfc] transition-none"
                    style={{ width: `${fuseProgress * 100}%` }}
                />
            )}
        </span>
    )

    const bubble = (
        <motion.div
            id={`wt-bubble-${id}`}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
                position: 'fixed',
                left: springX,
                top: springY,
                zIndex: 9999,
                rotate: tilt,
                backgroundColor: surfaceColor,
                color: inkColor,
            }}
            className={`pointer-events-none max-w-xs rounded-lg shadow-lg ${sizeClasses[size]} ${className ?? ''}`}
        >
            <span className="block">{content}</span>
            {shortcut && (
                <span
                    className="ml-2 inline-flex items-center rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
                    style={{ color: inkColor }}
                >
                    {shortcut}
                </span>
            )}
            {arrow && (
                <span
                    aria-hidden="true"
                    className="absolute size-2 rotate-45"
                    style={{
                        backgroundColor: surfaceColor,
                        ...(pos.side === 'top' && { bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }),
                        ...(pos.side === 'bottom' && { top: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }),
                        ...(pos.side === 'left' && { right: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }),
                        ...(pos.side === 'right' && { left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }),
                    }}
                />
            )}
        </motion.div>
    )

    const visible = ctx ? ctx.activeId === id : open

    return (
        <>
            {trigger}
            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {visible && bubble}
                    </AnimatePresence>,
                    document.body,
                )}
        </>
    )
}