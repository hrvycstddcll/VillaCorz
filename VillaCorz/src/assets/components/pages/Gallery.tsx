import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Star, X } from 'lucide-react'
import DriftWall from '../ui/CssComponents/DriftWall'
import { loadGalleryImages } from '../../../services/galleryService'
import type { GalleryItem } from '../../../services/types'

const formatDate = (value: string) => {
    const timestamp = Date.parse(value)
    if (!Number.isFinite(timestamp)) return ''
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(timestamp)
}

const Gallery = () => {
    const [items, setItems] = useState<GalleryItem[]>([])
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [retryKey, setRetryKey] = useState(0)
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const [columns, setColumns] = useState(5)
    const [tileWidth, setTileWidth] = useState(180)
    const [tileHeight, setTileHeight] = useState(120)
    const dialogRef = useRef<HTMLDivElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const previouslyFocusedRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        let cancelled = false

        loadGalleryImages()
            .then((result) => {
                if (cancelled) return
                setItems(result)
                setStatus('ready')
            })
            .catch(() => {
                if (cancelled) return
                setItems([])
                setStatus('error')
            })

        return () => {
            cancelled = true
        }
    }, [retryKey])

    useEffect(() => {
        const update = () => {
            const width = window.innerWidth
            const nextColumns = width < 640 ? 2 : width < 1024 ? 3 : 4
            const horizontalPadding = width < 640 ? 16 : 24
            const available = Math.min(width, 1152) - horizontalPadding * 2
            const nextTileWidth = Math.max(
                120,
                Math.min(260, Math.floor(available / nextColumns) - 18),
            )

            setColumns(nextColumns)
            setTileWidth(nextTileWidth)
            setTileHeight(Math.round(nextTileWidth * 0.66))
        }
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    const closeLightbox = useCallback(() => {
        setActiveIndex(null)
        window.setTimeout(() => previouslyFocusedRef.current?.focus(), 0)
    }, [])

    const stepLightbox = useCallback(
        (delta: number) => {
            setActiveIndex((current) => {
                if (current === null || !items.length) return current
                return (current + delta + items.length) % items.length
            })
        },
        [items.length],
    )

    const openLightbox = useCallback((_: GalleryItem, index: number) => {
        previouslyFocusedRef.current = document.activeElement as HTMLElement | null
        setActiveIndex(index)
    }, [])

    const activeItem = activeIndex === null ? null : items[activeIndex]

    useEffect(() => {
        if (!activeItem) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        closeButtonRef.current?.focus()

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                closeLightbox()
                return
            }
            if (event.key === 'ArrowLeft') {
                event.preventDefault()
                stepLightbox(-1)
                return
            }
            if (event.key === 'ArrowRight') {
                event.preventDefault()
                stepLightbox(1)
                return
            }
            if (event.key !== 'Tab' || !dialogRef.current) return

            const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
            )
            if (!focusable.length) return

            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [activeItem, closeLightbox, stepLightbox])

    return (
        <section
            id="gallery"
            className="relative scroll-mt-24 overflow-hidden border-t border-white/5 bg-[#050814] py-14 sm:py-18 lg:py-20"
        >
            {status !== 'ready' && (
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                    {status === 'loading' && (
                        <div
                            className="flex h-64 gap-4 overflow-hidden sm:h-80"
                            role="status"
                            aria-label="Loading guest gallery"
                        >
                            {[0, 1, 2].map((item) => (
                                <div
                                    key={item}
                                    className="h-full min-w-[72%] animate-pulse rounded-3xl border border-white/10 bg-white/5 sm:min-w-[46%] lg:min-w-[32%]"
                                />
                            ))}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 text-center">
                            <p className="font-instrument text-2xl text-white">Gallery unavailable</p>
                            <p className="max-w-md font-poppins text-sm leading-relaxed text-slate-400">
                                Guest photos could not be loaded right now. Please try again.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setStatus('loading')
                                    setRetryKey((key) => key + 1)
                                }}
                                className="min-h-11 rounded-full bg-[#006dfc] px-6 py-2 font-poppins text-sm font-semibold text-white transition-colors hover:bg-[#005bd4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93c5fd]"
                            >
                                Try again
                            </button>
                        </div>
                    )}
                </div>
            )}

            {status === 'ready' && items.length === 0 && (
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                    <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 text-center">
                        <p className="font-instrument text-2xl text-white">Guest photos will appear here</p>
                        <p className="max-w-lg font-poppins text-sm leading-relaxed text-slate-400">
                            Once guests share photos with their reviews, they will drift across this
                            wall.
                        </p>
                    </div>
                </div>
            )}

            {status === 'ready' && items.length > 0 && (
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                    <DriftWall
                        items={items}
                        columns={columns}
                        tileWidth={tileWidth}
                        tileHeight={tileHeight}
                        gap={18}
                        tilt={16}
                        turn={0}
                        perspective={1200}
                        depth={120}
                        speed={42}
                        direction="up"
                        variance={0.45}
                        parallax={0}
                        pauseOnHover
                        lift={64}
                        fade={0.6}
                        dim={0.55}
                        overlayColor="#060010"
                        onSelect={openLightbox}
                        ariaLabel="Guest photo gallery"
                    />
                </div>
            )}

            {activeItem && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-6"
                    role="presentation"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) closeLightbox()
                    }}
                >
                    <div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="gallery-lightbox-title"
                        aria-describedby="gallery-lightbox-description"
                        className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#cfe1f7] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.14)]"
                    >
                        <div className="flex items-center justify-between gap-4 border-b border-[#e2e8f0] px-5 py-4 sm:px-7">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <span className="h-px w-8 bg-[#006dfc]" aria-hidden="true" />
                                    <p className="font-poppins text-[10px] font-semibold uppercase tracking-[0.28em] text-[#006dfc]">
                                        VillaCorz guest gallery
                                    </p>
                                </div>
                                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                                    <h3
                                        id="gallery-lightbox-title"
                                        className="truncate font-jakarta text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-3xl"
                                    >
                                        {activeItem.title}
                                    </h3>
                                    <span className="rounded-full bg-[#eff6ff] px-2.5 py-1 font-jakarta text-[11px] font-semibold tabular-nums text-[#006dfc] ring-1 ring-inset ring-[#cfe1f7]">
                                        {String((activeIndex ?? 0) + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                            <button
                                ref={closeButtonRef}
                                type="button"
                                onClick={closeLightbox}
                                aria-label="Close photo viewer"
                                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#cfe1f7] bg-white/95 text-[#006dfc] shadow-sm transition-colors hover:border-[#006dfc] hover:bg-[#006dfc] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
                            <div className="relative h-[min(44svh,20rem)] shrink-0 overflow-hidden bg-gradient-to-br from-[#f4f9ff] to-[#dbeaff] sm:h-[min(58svh,34rem)] lg:h-auto lg:min-h-0 lg:flex-1">
                                <div className="absolute inset-3 flex items-center justify-center sm:inset-6 lg:inset-8">
                                    <div className="flex h-full w-full max-w-5xl items-center justify-center overflow-hidden rounded-2xl bg-white/90 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.1)] ring-1 ring-[#bfd7f5] sm:p-3">
                                        <img
                                            src={activeItem.image}
                                            alt={activeItem.title}
                                            className="h-full w-full rounded-xl object-contain"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => stepLightbox(-1)}
                                    aria-label="Previous photo"
                                    className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#cfe1f7] bg-white/95 text-[#006dfc] shadow-sm transition-colors hover:border-[#006dfc] hover:bg-[#006dfc] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] sm:left-5"
                                >
                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => stepLightbox(1)}
                                    aria-label="Next photo"
                                    className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#cfe1f7] bg-white/95 text-[#006dfc] shadow-sm transition-colors hover:border-[#006dfc] hover:bg-[#006dfc] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] sm:right-5"
                                >
                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </div>

                            <div
                                id="gallery-lightbox-description"
                                className="flex w-full shrink-0 flex-col border-t border-[#e2e8f0] bg-white px-6 py-6 sm:px-8 lg:w-88 lg:border-l lg:border-t-0"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="h-px w-8 bg-[#006dfc]" aria-hidden="true" />
                                    <p className="font-poppins text-[10px] font-semibold uppercase tracking-[0.28em] text-[#006dfc]">
                                        Guest story
                                    </p>
                                </div>
                                <div className="mt-4 flex items-center gap-1" aria-label={`${activeItem.rating} out of 5 stars`}>
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <Star
                                            key={index}
                                            className={`h-4 w-4 ${index < activeItem.rating ? 'fill-[#006dfc] text-[#006dfc]' : 'text-[#bfd7f5]'}`}
                                            aria-hidden="true"
                                        />
                                    ))}
                                </div>
                                {activeItem.quote && (
                                    <blockquote className="mt-5 font-jakarta text-lg leading-relaxed text-slate-800 sm:text-xl">
                                        “{activeItem.quote}”
                                    </blockquote>
                                )}
                                <div className="mt-auto pt-8">
                                    <div className="h-px w-12 bg-[#006dfc]" aria-hidden="true" />
                                    <p className="mt-4 font-poppins text-sm font-semibold text-slate-950">
                                        {activeItem.author}
                                    </p>
                                    <p className="mt-1 font-poppins text-xs text-slate-500">
                                        {activeItem.serviceName}
                                    </p>
                                    {formatDate(activeItem.createdAt) && (
                                        <p className="mt-1 font-poppins text-xs text-slate-400">
                                            {formatDate(activeItem.createdAt)}
                                        </p>
                                    )}
                                    <p className="mt-6 rounded-xl border border-[#cfe1f7] bg-[#eff6ff] px-3 py-2 font-poppins text-[11px] leading-relaxed text-slate-600">
                                        Use arrow keys to browse and Escape to close.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

export default Gallery
