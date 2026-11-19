import axios from 'axios'
import {
    Loader2,
    RotateCcw,
    Send,
    Sparkles,
    X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { sendCustomerAssistantMessage } from '../../../services/customerAssistantService'
import type {
    AssistantChatMessage,
    CustomerAssistantPage,
} from '../../../services/types'

type DisplayMessage = AssistantChatMessage & { id: string }

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const suggestionsByPage: Record<CustomerAssistantPage, string[]> = {
    home: [
        'What can you help me with?',
        'Show me the available rooms.',
        'How do payments work?',
    ],
    services: [
        'Which room fits 6 guests?',
        'What is included in the whole villa?',
        'How are weekday and weekend rates different?',
    ],
    bookings: [
        'When is my next stay?',
        'Can I cancel my booking?',
        'What is my payment status?',
    ],
    settings: [
        'How do I update my profile?',
        'How do I change my password?',
        'How do I manage my phone numbers?',
    ],
    payment: [
        'What does pending payment mean?',
        'How do I complete my payment?',
        'Where can I see my payment status?',
    ],
    other: [
        'When is my next stay?',
        'What rooms are available?',
        'How do I contact VillaCorz?',
    ],
}

const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
            return 'Your session has expired. Please sign in again.'
        }
        if (error.response?.status === 403) {
            return 'This assistant is available only to signed-in customer accounts.'
        }
        const data = error.response?.data as { message?: string } | undefined
        if (data?.message) return data.message
    }

    return 'The VillaCorz assistant is temporarily unavailable. Please try again.'
}

const CustomerAssistantPanel = () => {
    const location = useLocation()
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<DisplayMessage[]>([])
    const [input, setInput] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const nextId = useRef(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const logRef = useRef<HTMLDivElement>(null)

    const page = useMemo<CustomerAssistantPage>(() => {
        if (location.pathname === '/') return 'home'
        if (
            location.pathname.startsWith('/services') ||
            location.pathname.startsWith('/reservation')
        ) {
            return 'services'
        }
        if (location.pathname.startsWith('/bookings')) return 'bookings'
        if (
            location.pathname.startsWith('/settings') ||
            location.pathname.startsWith('/account')
        ) {
            return 'settings'
        }
        if (location.pathname.startsWith('/payment')) return 'payment'

        return 'other'
    }, [location.pathname])

    const suggestions = suggestionsByPage[page]
    const avoidsBookingBar = location.pathname === '/'
    const triggerPosition = avoidsBookingBar
        ? 'bottom-24 sm:bottom-28 lg:bottom-32'
        : 'bottom-6'
    const panelPosition = avoidsBookingBar
        ? 'bottom-24 right-6 sm:bottom-28 lg:bottom-32 max-sm:inset-x-3 max-sm:bottom-24'
        : 'bottom-6 right-6 max-sm:inset-x-3 max-sm:bottom-3'
    const panelHeight = avoidsBookingBar
        ? 'max-h-[min(640px,calc(100vh-12rem))] max-sm:max-h-[calc(100vh-8rem)]'
        : 'max-h-[min(640px,calc(100vh-8rem))] max-sm:max-h-[calc(100vh-5rem)]'

    useEffect(() => {
        if (!open) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }

        window.addEventListener('keydown', handleKeyDown)
        inputRef.current?.focus()

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open])

    useEffect(() => {
        if (!open) return
        const log = logRef.current
        if (log) log.scrollTop = log.scrollHeight
    }, [messages, busy, open])

    const send = async (text: string) => {
        const question = text.trim()
        if (!question || busy) return

        const history = messages
            .slice(-6)
            .map(({ role, content }) => ({ role, content }))
        const userMessage: DisplayMessage = {
            id: `user-${nextId.current++}`,
            role: 'user',
            content: question,
        }

        setMessages((previous) => [...previous, userMessage])
        setInput('')
        setBusy(true)
        setError(null)

        try {
            const response = await sendCustomerAssistantMessage({
                message: question,
                context: { page },
                history,
            })

            setMessages((previous) => [
                ...previous,
                {
                    id: `assistant-${nextId.current++}`,
                    role: 'assistant',
                    content: response.data.data.answer,
                },
            ])
        } catch (requestError) {
            setError(getErrorMessage(requestError))
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Ask VillaCorz assistant"
                    className={`fixed ${triggerPosition} right-6 z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#006dfc] px-5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(0,109,252,0.28)] transition-colors duration-150 hover:bg-[#0057c9] ${focusRing}`}
                >
                    <Sparkles className="size-4" aria-hidden="true" />
                    Ask VillaCorz
                </button>
            )}

            {open && (
                <section
                    aria-label="VillaCorz customer assistant"
                    className={`fixed ${panelPosition} z-50 flex ${panelHeight} w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.18)] max-sm:w-auto`}
                >
                    <div className="flex items-start justify-between gap-3 border-b border-[rgba(0,0,0,0.06)] px-5 py-4">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#006dfc]">
                                VillaCorz assistant
                            </p>
                            <h2 className="mt-1 font-serif text-xl font-semibold text-slate-900">
                                How can we help?
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Read-only answers about your bookings and stay.
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            {messages.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMessages([])
                                        setError(null)
                                    }}
                                    aria-label="Clear conversation"
                                    className={`grid size-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${focusRing}`}
                                >
                                    <RotateCcw className="size-4" aria-hidden="true" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close assistant"
                                className={`grid size-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${focusRing}`}
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    <div
                        ref={logRef}
                        role="log"
                        aria-live="polite"
                        aria-label="Customer assistant conversation"
                        className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
                    >
                        {messages.length === 0 ? (
                            <div className="rounded-xl bg-slate-50 p-4">
                                <span className="grid size-10 place-items-center rounded-full bg-white text-[#006dfc] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                                    <Sparkles className="size-5" aria-hidden="true" />
                                </span>
                                <p className="mt-3 font-serif text-base font-semibold text-slate-900">
                                    Ask about your stay
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    I can check your bookings, payments, and
                                    listed offers. I cannot change anything.
                                </p>
                                <div className="mt-3 space-y-2">
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => void send(suggestion)}
                                            className={`block w-full rounded-lg border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2 text-left text-xs leading-5 text-slate-700 transition-colors hover:border-[#006dfc] hover:text-[#006dfc] ${focusRing}`}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                                        message.role === 'user'
                                            ? 'ml-auto bg-[#006dfc] text-white'
                                            : 'bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    <span
                                        className={`mb-1 block text-[9px] font-semibold uppercase tracking-[0.18em] ${
                                            message.role === 'user'
                                                ? 'text-white/70'
                                                : 'text-slate-400'
                                        }`}
                                    >
                                        {message.role === 'user'
                                            ? 'You'
                                            : 'VillaCorz assistant'}
                                    </span>
                                    <p className="whitespace-pre-wrap break-words">
                                        {message.content}
                                    </p>
                                </div>
                            ))
                        )}

                        {busy && (
                            <div
                                className="flex items-center gap-2 text-xs text-slate-500"
                                role="status"
                            >
                                <Loader2
                                    className="size-4 animate-spin motion-reduce:animate-none"
                                    aria-hidden="true"
                                />
                                Checking your account details...
                            </div>
                        )}

                        {error && (
                            <p
                                role="alert"
                                className="rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700"
                            >
                                {error}
                            </p>
                        )}
                    </div>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault()
                            void send(input)
                        }}
                        className="border-t border-[rgba(0,0,0,0.06)] p-3"
                    >
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                placeholder="Ask about your booking or stay"
                                aria-label="Ask about your booking or stay"
                                maxLength={600}
                                className={`min-h-11 min-w-0 flex-1 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 ${focusRing}`}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || busy}
                                aria-label="Send question"
                                className={`grid size-11 shrink-0 place-items-center rounded-xl bg-[#006dfc] text-white transition-colors hover:bg-[#0057c9] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 ${focusRing}`}
                            >
                                {busy ? (
                                    <Loader2
                                        className="size-4 animate-spin motion-reduce:animate-none"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Send className="size-4" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                        <p className="mt-2 px-1 text-[10px] leading-4 text-slate-400">
                            AI can make mistakes. Check My bookings for final
                            details.
                        </p>
                    </form>
                </section>
            )}
        </>
    )
}

export default CustomerAssistantPanel
