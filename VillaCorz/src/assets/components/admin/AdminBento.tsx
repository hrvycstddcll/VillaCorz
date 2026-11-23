import { Children, useEffect, useState, type ReactNode } from 'react'
import MagicBento from './MagicBento'

type AdminBentoProps = {
    children: ReactNode
    className?: string
    gap?: number
    ariaBusy?: boolean
}

const narrowQuery = '(max-width: 1023px)'

// Admin-only presentation wrapper. The dashboard keeps rendering its own data
// cards; MagicBento only adds the cursor glow, spotlight and click wave around
// them. A lone card spans both columns, pairs sit side by side on wide screens
// and stack on narrow ones (matching the dashboard's existing lg:grid-cols-2).
const AdminBento = ({
    children,
    className = '',
    gap = 24,
    ariaBusy,
}: AdminBentoProps) => {
    const [narrow, setNarrow] = useState(
        () =>
            typeof window !== 'undefined' &&
            window.matchMedia(narrowQuery).matches,
    )

    useEffect(() => {
        const media = window.matchMedia(narrowQuery)
        const sync = () => setNarrow(media.matches)
        sync()
        media.addEventListener('change', sync)
        return () => media.removeEventListener('change', sync)
    }, [])

    const cards = Children.toArray(children)
    const items = cards.map((content) => ({
        content,
        colSpan: cards.length === 1 ? 2 : 1,
    }))

    return (
        <MagicBento
            className={`magic-bento--admin ${className}`.trim()}
            columns={narrow ? 1 : 2}
            rowHeight={200}
            gap={gap}
            radius={16}
            ariaBusy={ariaBusy}
            theme="light"
            glowColor="#006dfc"
            spotlightRadius={300}
            enableBorderGlow
            enableSpotlight
            clickEffect
            intro
            items={items}
        />
    )
}

export default AdminBento
