import { useState, type MouseEvent } from 'react'

type MeshLetteringProps = {
    text?: string
}

const MeshLettering = ({ text = 'VillaCorz' }: MeshLetteringProps) => {
    const [warp, setWarp] = useState({ x: 0, y: 0, active: false })

    const handleMove = (event: MouseEvent<HTMLSpanElement>) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setWarp({
            x: ((event.clientX - rect.left) / rect.width - 0.5) * 12,
            y: ((event.clientY - rect.top) / rect.height - 0.5) * 8,
            active: true,
        })
    }

    const handleLeave = () => setWarp({ x: 0, y: 0, active: false })

    return (
        <span
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{
                color: '#fff',
                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 0.95,
                display: 'inline-block',
                transform: `skewX(${warp.x}deg) skewY(${warp.y}deg) scale(${warp.active ? 1.03 : 1})`,
                transition: 'transform 180ms ease',
                cursor: 'default',
                whiteSpace: 'pre-line',
            }}
        >
            {text}
        </span>
    )
}

export default MeshLettering