import { useEffect } from 'react'
import MetaBalls from '../ui/MetaBalls.jsx'

const logoutMascot = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1791989872/logoutMascot.gif'

type LogoutModalProps = {
    onCancel: () => void
    onConfirm: () => void
}

function LogoutModal({ onCancel, onConfirm }: LogoutModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel()
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onCancel])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/60 p-4 backdrop-blur-[6px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-description"
        >
            <button
                type="button"
                aria-label="Close dialog"
                onClick={onCancel}
                className="absolute inset-0 h-full w-full cursor-default"
            />

            <div className="relative w-full max-w-97.5 overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
                <div className="relative flex h-47.5 items-center justify-center bg-white">
                    <div className="absolute inset-0 z-0">
                        <MetaBalls
                            color="#246BCE"
                            cursorBallColor="#246BCE"
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
                        src={logoutMascot}
                        alt=""
                        className="relative z-10 h-40 w-40 object-contain"
                        loading="lazy"
                        decoding="async"
                    />
                </div>

                <div className="px-7 pb-7 pt-3 text-center">
                    <h2
                        id="logout-title"
                        className="text-[27px] font-extrabold leading-tight tracking-[-0.04em] text-[#172033]"
                    >
                        Ready to leave?
                    </h2>

                    <p
                        id="logout-description"
                        className="mx-auto mt-3 max-w-70 text-[13px] leading-[1.8] text-gray-500"
                    >
                        You're about to sign out of your account. You'll need to log in again to access your account.
                    </p>

                    <div className="mt-7 flex flex-col gap-2.5">
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#246BCE] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(36,107,206,0.18)] transition duration-200 hover:bg-[#1D5BB2] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                            Yes, sign me out
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

                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-[#344054] transition duration-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                        >
                            No, take me back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LogoutModal
