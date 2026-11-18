import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'motion/react'

type CountUpProps = {
    from?: number
    to: number
    duration?: number
    trigger?: 'view' | 'mount'
    mode?: 'roll' | 'count'
    easing?: 'expo' | 'linear' | 'easeOut'
    replayOnHover?: boolean
    prefix?: string
    suffix?: string
    className?: string
}

const easingMap: Record<string, (t: number) => number> = {
    expo: (t) => (t === 0 ? 0 : t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    linear: (t) => t,
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
}

const CountUp = ({
    from = 0,
    to,
    duration = 1.8,
    trigger = 'view',
    mode = 'count',
    easing = 'expo',
    replayOnHover = false,
    prefix = '',
    suffix = '',
    className = '',
}: CountUpProps) => {
    const ref = useRef<HTMLSpanElement>(null)
    const inView = useInView(ref, { once: false, amount: 0.4 })
    const [value, setValue] = useState(from)
    const controlsRef = useRef<ReturnType<typeof animate> | null>(null)

    const run = () => {
        controlsRef.current?.stop()
        setValue(from)
        controlsRef.current = animate(from, to, {
            duration,
            ease: easingMap[easing] ?? easingMap.expo,
            onUpdate: (v) => setValue(mode === 'roll' ? Math.round(v) : v),
        })
    }

    useEffect(() => {
        if (trigger === 'view' && inView) run()
        if (trigger === 'mount') run()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView, trigger])

    const handleHover = () => {
        if (replayOnHover) run()
    }

    return (
        <span ref={ref} className={className} onMouseEnter={handleHover}>
            {prefix}
            {Math.round(value)}
            {suffix}
        </span>
    )
}

export default CountUp