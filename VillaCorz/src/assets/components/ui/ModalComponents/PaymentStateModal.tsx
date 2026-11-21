import { useEffect, type ReactNode } from 'react'
import MetaBalls from '../CssComponents/MetaBalls.jsx'

type PaymentStateTone = 'success' | 'danger' | 'warning' | 'neutral'

type PaymentStateModalProps = {
    image: string
    tone: PaymentStateTone
    title: string
    description: string
    details?: ReactNode
    primaryLabel: string
    onPrimary: () => void
    secondaryLabel?: string
    onSecondary?: () => void
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const toneStyles: Record<
    PaymentStateTone,
    { ball: string; badge: string; icon: string }
> = {
    success: {
        ball: '#006DFC',
        badge: 'bg-emerald-50 text-emerald-700',
        icon: '✓',
    },
    danger: {
        ball: '#E11D48',
        badge: 'bg-rose-50 text-rose-700',
        icon: '!',
    },
    warning: {
        ball: '#D97706',
        badge: 'bg-amber-50 text-amber-700',
        icon: '!',
    },
    neutral: {
        ball: '#3D8BFF',
        badge: 'bg-blue-50 text-[#006dfc]',
        icon: 'i',
    },
}

function PaymentStateModal({
    image,
    tone,
    title,
    description,
    details,
    primaryLabel,
    onPrimary,
    secondaryLabel,
    onSecondary,
}: PaymentStateModalProps) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return

            if (onSecondary) onSecondary()
            else onPrimary()
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onPrimary, onSecondary])

    const style = toneStyles[tone]

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/60 p-4 backdrop-blur-[6px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-state-title"
            aria-describedby="payment-state-description"
        >
            <button
                type="button"
                aria-label="Close dialog"
                onClick={() => {
                    if (onSecondary) onSecondary()
                    else onPrimary()
                }}
                className="absolute inset-0 h-full w-full cursor-default"
            />

            <div className="relative w-full max-w-97.5 overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
                <div className="relative flex h-47.5 items-center justify-center bg-white">
                    <div className="absolute inset-0 z-0">
                        <MetaBalls
                            color={style.ball}
                            cursorBallColor={style.ball}
                            variant="solid"
                            motion="orbit"
                            ballCount={15}
                            animationSize={30}
                            gooeyness={0.5}
                            stretch={0.5}
                            wobble={0.5}
                            enableTransparency={true}
                        />
                    </div>
                    <img
                        src={image}
                        alt=""
                        className="relative z-10 h-40 w-40 object-contain"
                        loading="lazy"
                        decoding="async"
                    />
                </div>

                <div className="px-7 pb-7 pt-3 text-center">
                    <span
                        aria-hidden="true"
                        className={`mx-auto grid size-8 place-items-center rounded-full text-sm font-bold ${style.badge}`}
                    >
                        {style.icon}
                    </span>

                    <h2
                        id="payment-state-title"
                        className="mt-3 text-[27px] font-extrabold leading-tight tracking-[-0.04em] text-[#172033]"
                    >
                        {title}
                    </h2>

                    <p
                        id="payment-state-description"
                        className="mx-auto mt-3 max-w-70 text-[13px] leading-[1.8] text-gray-500"
                    >
                        {description}
                    </p>

                    {details && (
                        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                            {details}
                        </div>
                    )}

                    <div className="mt-7 flex flex-col gap-2.5">
                        <button
                            type="button"
                            onClick={onPrimary}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#006dfc] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(36,107,206,0.18)] transition duration-200 hover:bg-[#005bd3] active:scale-[0.99] ${focusRing}`}
                        >
                            {primaryLabel}
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-4 w-4"
                                aria-hidden="true"
                            >
                                <path
                                    d="M10 17l5-5-5-5M15 12H3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>

                        {secondaryLabel && onSecondary && (
                            <button
                                type="button"
                                onClick={onSecondary}
                                className={`w-full rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-[#344054] transition duration-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99] ${focusRing}`}
                            >
                                {secondaryLabel}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PaymentStateModal
