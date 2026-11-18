import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import FlexCarousel from '../ui/CssComponents/FlexCarousel'
import { loadFeaturedTestimonials } from '../../../services/testimonialsService'
import type { FeaturedTestimonial } from '../../../services/types'
import type { FlexCarouselHandle, FlexCarouselItem } from '../ui/CssComponents/FlexCarousel'

const escapeXml = (value: string) =>
    value.replace(/[<>&"']/g, (character) => {
        const entities: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&apos;',
        }
        return entities[character]
    })

const wrapText = (value: string, maxCharacters: number, maxLines: number) => {
    const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
    const lines: string[] = []
    let current = ''
    let truncated = false

    for (const word of words) {
        const chunks =
            word.length > maxCharacters
                ? word.match(new RegExp(`.{1,${maxCharacters}}`, 'g')) ?? [word]
                : [word]

        for (const chunk of chunks) {
            const candidate = current ? `${current} ${chunk}` : chunk
            if (candidate.length <= maxCharacters) {
                current = candidate
                continue
            }
            if (current) lines.push(current)
            current = chunk
            if (lines.length === maxLines) {
                truncated = true
                break
            }
        }
        if (truncated) break
    }

    if (!truncated && current && lines.length < maxLines) lines.push(current)
    if (lines.length > maxLines) {
        lines.length = maxLines
        truncated = true
    }
    if (truncated && lines.length) {
        const last = lines[lines.length - 1]
        lines[lines.length - 1] = `${last.slice(0, Math.max(0, maxCharacters - 1))}…`
    }

    return lines
}

const formatDate = (value: string) => {
    const timestamp = Date.parse(value)
    if (!Number.isFinite(timestamp)) return ''
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(timestamp)
}

const buildSlideSource = (testimonial: FeaturedTestimonial) => {
    const titleLines = testimonial.title ? wrapText(testimonial.title, 42, 2) : []
    const quoteLines = wrapText(testimonial.quote, 48, 4)
    let textY = titleLines.length ? 168 : 160

    const titleMarkup = titleLines
        .map((line) => {
            const y = textY
            textY += 42
            return `<text x="56" y="${y}" fill="#0f172a" font-family="Georgia,serif" font-size="34" font-weight="600">${escapeXml(line)}</text>`
        })
        .join('')

    textY += 18
    const quoteMarkup = quoteLines
        .map((line, index) => {
            const y = textY
            textY += 40
            const prefix = index === 0 ? '“' : ''
            const suffix = index === quoteLines.length - 1 ? '”' : ''
            return `<text x="56" y="${y}" fill="#334155" font-family="Arial,sans-serif" font-size="25">${prefix}${escapeXml(line)}${suffix}</text>`
        })
        .join('')

    const date = formatDate(testimonial.createdAt)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560">
<defs>
<linearGradient id="oceanCard" x1="0" y1="0" x2="900" y2="560" gradientUnits="userSpaceOnUse">
<stop stop-color="#f4f9ff"/>
<stop offset="1" stop-color="#dbeaff"/>
</linearGradient>
</defs>
<rect width="900" height="560" rx="28" fill="url(#oceanCard)"/>
<path d="M0 448 C120 408 220 478 340 438 C460 398 560 458 680 418 C780 383 840 408 900 378 L900 560 L0 560 Z" fill="#006dfc" fill-opacity="0.035"/>
<circle cx="826" cy="104" r="126" fill="#006dfc" fill-opacity="0.04"/>
<rect x="1" y="1" width="898" height="558" rx="27" fill="none" stroke="#006dfc" stroke-opacity="0.18" stroke-width="2"/>
<rect x="56" y="56" width="72" height="4" rx="2" fill="#006dfc"/>
<text x="56" y="108" fill="#006dfc" font-family="Arial,sans-serif" font-size="24" letter-spacing="6">${'★'.repeat(testimonial.rating)}</text>
${titleMarkup}
${quoteMarkup}
<line x1="56" y1="452" x2="844" y2="452" stroke="#bfd7f5" stroke-width="1"/>
<text x="56" y="494" fill="#0f172a" font-family="Arial,sans-serif" font-size="22" font-weight="700">${escapeXml(testimonial.author)}</text>
<text x="56" y="526" fill="#475569" font-family="Arial,sans-serif" font-size="18">${escapeXml(testimonial.serviceName)}${date ? ` · ${escapeXml(date)}` : ''}</text>
</svg>`

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const toCarouselItem = (testimonial: FeaturedTestimonial): FlexCarouselItem => ({
    src: buildSlideSource(testimonial),
    alt: `${testimonial.rating}-star guest review from ${testimonial.author}`,
    title: testimonial.title || testimonial.author,
    subtitle: `${testimonial.serviceName} · ${formatDate(testimonial.createdAt)}`,
    quote: testimonial.quote,
    author: testimonial.author,
    service: testimonial.serviceName,
    rating: testimonial.rating,
})

const Testimonials = () => {
    const carouselRef = useRef<FlexCarouselHandle>(null)
    const [testimonials, setTestimonials] = useState<FeaturedTestimonial[]>([])
    const [activeIndex, setActiveIndex] = useState(0)
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [retryKey, setRetryKey] = useState(0)

    useEffect(() => {
        let cancelled = false

        loadFeaturedTestimonials()
            .then((items) => {
                if (cancelled) return
                setTestimonials(items)
                setActiveIndex(0)
                setStatus('ready')
            })
            .catch(() => {
                if (!cancelled) setStatus('error')
            })

        return () => {
            cancelled = true
        }
    }, [retryKey])

    const items = useMemo(() => testimonials.map(toCarouselItem), [testimonials])

    return (
        <section
            id="testimonials"
            className="relative scroll-mt-24 overflow-hidden border-t border-slate-100 bg-white py-14 sm:py-18 lg:py-20"
        >
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-3">
                        <span className="h-px w-8 bg-[#006dfc]" aria-hidden="true" />
                        <p className="font-poppins text-[10px] font-semibold uppercase tracking-[0.28em] text-[#006dfc]">
                            Guest stories
                        </p>
                        <span className="h-px w-8 bg-[#006dfc]" aria-hidden="true" />
                    </div>
                    <h2 className="mt-5 font-instrument text-4xl leading-tight tracking-[-0.04em] text-black sm:text-5xl lg:text-6xl">
                        Words from our <span className="italic text-[#006dfc]">guests</span>
                    </h2>
                    <p className="mt-4 max-w-2xl font-poppins text-sm leading-relaxed text-slate-500 sm:text-base">
                        Real stays, shared in their own words. These are our highest-rated, verified
                        guest experiences from the past year.
                    </p>
                </div>
            </div>

            {(status !== 'ready' || items.length === 0) && (
                <div className="mx-auto mt-8 w-full max-w-6xl px-4 sm:mt-10 sm:px-6">
                    {status === 'loading' && (
                        <div
                            className="flex h-64 gap-4 overflow-hidden sm:h-80"
                            aria-label="Loading guest testimonials"
                            role="status"
                        >
                            {[0, 1, 2].map((item) => (
                                <div
                                    key={item}
                                    className="h-full min-w-[72%] animate-pulse rounded-3xl border border-[#cfe1f7] bg-[#edf6ff] sm:min-w-[46%] lg:min-w-[32%]"
                                />
                            ))}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
                            <p className="font-instrument text-2xl text-black">Stories are unavailable</p>
                            <p className="max-w-md font-poppins text-sm leading-relaxed text-slate-500">
                                Guest testimonials could not be loaded right now. Please try again.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setStatus('loading')
                                    setRetryKey((key) => key + 1)
                                }}
                                className="min-h-11 rounded-full bg-[#006dfc] px-6 py-2 font-poppins text-sm font-semibold text-white transition-colors hover:bg-[#005bd4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {status === 'ready' && items.length === 0 && (
                        <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
                            <p className="font-instrument text-2xl text-black">Guest stories will appear here</p>
                            <p className="max-w-lg font-poppins text-sm leading-relaxed text-slate-500">
                                Once verified guests leave a five-star review, their words will be
                                featured here.
                            </p>
                            <a
                                href="/services"
                                className="inline-flex min-h-11 items-center rounded-full border border-[#006dfc] px-6 py-2 font-poppins text-sm font-semibold text-[#006dfc] transition-colors hover:bg-[#006dfc] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                            >
                                Explore our stays
                            </a>
                        </div>
                    )}
                </div>
            )}

            {status === 'ready' && items.length > 0 && (
                <div className="relative mt-8 sm:mt-10">
                    <div className="h-[18rem] sm:h-[22rem] lg:h-[26rem]">
                        <FlexCarousel
                            ref={carouselRef}
                            items={items}
                            preset="liquid"
                            intro="rise"
                            cardHeight={0.64}
                            gap={18}
                            radius={24}
                            squeeze={0.12}
                            focusOnClick
                            captions={false}
                            captureWheel={false}
                            ariaLabel="Guest testimonials"
                            className="h-full"
                            onChange={(index) => setActiveIndex(index)}
                        />
                    </div>

                    <button
                        type="button"
                        aria-label="Previous testimonial"
                        onClick={() => carouselRef.current?.previous()}
                        className="absolute left-2 top-1/2 z-20 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#cfe1f7] bg-white/95 text-[#006dfc] shadow-lg backdrop-blur transition-colors hover:border-[#006dfc] hover:bg-[#006dfc] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] sm:left-6 sm:size-12 lg:left-10"
                    >
                        <ChevronLeft className="size-5" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        aria-label="Next testimonial"
                        onClick={() => carouselRef.current?.next()}
                        className="absolute right-2 top-1/2 z-20 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#cfe1f7] bg-white/95 text-[#006dfc] shadow-lg backdrop-blur transition-colors hover:border-[#006dfc] hover:bg-[#006dfc] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] sm:right-6 sm:size-12 lg:right-10"
                    >
                        <ChevronRight className="size-5" aria-hidden="true" />
                    </button>

                    <div
                        className="mt-5 flex items-center justify-center gap-2 px-4 sm:gap-3"
                        role="group"
                        aria-label="Choose a testimonial"
                    >
                        {items.map((item, index) => (
                            <button
                                key={`${item.src}-${index}`}
                                type="button"
                                aria-label={`Show testimonial ${index + 1}`}
                                aria-current={index === activeIndex ? 'true' : undefined}
                                onClick={() => carouselRef.current?.goTo(index)}
                                className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] ${
                                    index === activeIndex
                                        ? 'w-8 bg-[#006dfc]'
                                        : 'w-2 bg-[#bfd7f5] hover:bg-[#006dfc]'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {status === 'ready' && testimonials.length > 0 && (
                <ol className="sr-only">
                    {testimonials.map((testimonial) => (
                        <li key={testimonial.id}>
                            {testimonial.rating} out of 5 stars. {testimonial.quote} —{' '}
                            {testimonial.author}, {testimonial.serviceName}
                        </li>
                    ))}
                </ol>
            )}
        </section>
    )
}

export default Testimonials
