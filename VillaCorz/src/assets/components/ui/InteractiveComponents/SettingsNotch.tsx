import { useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../services/useAuth'

const REVEAL_THRESHOLD = 96

/**
 * Edge-revealed Settings trigger. It slides in when the pointer approaches the
 * right margin and takes the user to the Settings hub, which owns the account
 * and sign-out actions.
 */
const SettingsNotch = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()
    const [visible, setVisible] = useState(false)
    const hoveredRef = useRef(false)

    const hidden =
        location.pathname === '/settings' ||
        location.pathname === '/account/settings'

    useEffect(() => {
        if (hidden || !user) return

        const handleMove = (event: MouseEvent) => {
            const distanceFromRight = window.innerWidth - event.clientX
            if (distanceFromRight <= REVEAL_THRESHOLD || hoveredRef.current) {
                setVisible(true)
            } else {
                setVisible(false)
            }
        }

        window.addEventListener('mousemove', handleMove)
        return () => window.removeEventListener('mousemove', handleMove)
    }, [hidden, user])

    if (hidden || !user) return null

    return (
        <button
            type="button"
            onClick={() => navigate('/settings')}
            onMouseEnter={() => {
                hoveredRef.current = true
                setVisible(true)
            }}
            onMouseLeave={() => {
                hoveredRef.current = false
            }}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
            aria-label="Open settings"
            title="Settings"
            className={`fixed right-6 top-1/2 z-50 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl bg-[#006dfc] text-white shadow-[0_8px_24px_rgba(0,109,252,0.35)] transition-[opacity,transform] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] motion-reduce:transition-none lg:flex ${
                visible
                    ? 'translate-x-0 opacity-100'
                    : 'pointer-events-none translate-x-[140%] opacity-0'
            }`}
        >
            <Settings className="size-4" aria-hidden="true" />
        </button>
    )
}

export default SettingsNotch
