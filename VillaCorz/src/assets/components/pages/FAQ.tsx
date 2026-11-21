import { useState } from 'react'
import {
  CircleCheck,
  CookingPot,
  Music2,
  PawPrint,
  SquareParking,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const categories = [
  'All Questions',
  'Booking & Rates',
  'Amenities & Stay',
  'Events & Gatherings',
  'Policies & Security',
]

type BadgeTone = 'blue' | 'outline' | 'purple'

type FaqBadge = {
  label: string
  tone: BadgeTone
}

type FaqChecklistItem = {
  title: string
  description: string
}

type FaqCallout = {
  icon: LucideIcon
  title: string
  body: string
}

type FaqItem = {
  category: string
  question: string
  answer?: string
  answerIntro?: string
  badges?: FaqBadge[]
  checklist?: FaqChecklistItem[]
  callouts?: FaqCallout[]
  feature?: { icon: LucideIcon; title: string }
  footerNote?: string
}

const badgeToneClasses: Record<BadgeTone, string> = {
  blue: 'bg-[#EFF6FF] text-[#006dfc]',
  outline: 'bg-white text-[#006dfc] ring-1 ring-[#cfe1f7]',
  purple: 'bg-purple-50 text-purple-700',
}

const faqs: FaqItem[] = [
  {
    category: 'Booking & Rates',
    question: 'How do I book Villa Lacorz exclusively?',
    answer:
      'Book directly through our website or contact our reservations team. With exclusive booking, the entire property is yours for the duration of your stay.',
  },
  {
    category: 'Booking & Rates',
    question: 'Are direct rates and weekday discounts available?',
    answer:
      'Yes. We offer clear, competitive direct rates with a 20% weekday discount from Monday to Thursday, so you always know exactly what to expect.',
  },
  {
    category: 'Booking & Rates',
    question: 'What payment methods are accepted?',
    answer:
      'We accept GCash, Maya, PayPal, BDO, and BPI. Your reservation is saved only after the QR payment is confirmed; unpaid QR codes expire and you will need to book again.',
  },
  {
    category: 'Booking & Rates',
    question: 'How does the QR payment confirmation work?',
    answer:
      'After selecting your dates and rooms, review the reservation summary and complete the QR payment. Once confirmed, your booking is saved and you receive a confirmation.',
  },
  {
    category: 'Amenities & Stay',
    question: 'Are the rooms air-conditioned and spacious?',
    answer:
      'All rooms are clean, generously sized, and air-conditioned to keep you cool through the afternoon heat, ready for restful nights after a full day by the sea.',
  },
  {
    category: 'Amenities & Stay',
    question: 'What shared spaces are available during the stay?',
    answer:
      'Shared dining and lounge areas provide room for meals, conversation, and celebrations, making the villa perfect for group stays.',
  },
  {
    category: 'Amenities & Stay',
    badges: [
      { label: 'Amenities & Stay', tone: 'blue' },
      { label: 'Family Favorite', tone: 'purple' },
    ],
    question: 'What dining, kitchen, and lounge facilities are included?',
    answerIntro:
      'We provide a spacious dining area and functional kitchen setup designed for group meals and gatherings:',
    feature: {
      icon: CookingPot,
      title: 'Heavy-duty Gas Range & Stove',
    },
    footerNote:
      '*Guests are requested to bring their own dining utensils, disposable plates, cups, and cooking supplies.',
  },
  {
    category: 'Events & Gatherings',
    question: 'Can we host birthdays, reunions, or corporate gatherings?',
    answer:
      'Absolutely. With exclusive booking the entire property is yours, making it well suited to birthdays, reunions, and group events. Shared spaces support meals and celebrations.',
  },
  {
    category: 'Events & Gatherings',
    badges: [{ label: 'Events & Gatherings', tone: 'blue' }],
    question: 'Are pets, videoke, and outside catering allowed for events?',
    callouts: [
      {
        icon: Music2,
        title: 'Videoke & Music Curfew',
        body: 'High-definition videoke is provided by guest! Per Nasugbu local municipal ordinance, loud sound systems and videoke must be lowered by 10:00 PM to respect community peace. (Low indoor volume background music may continue inside).',
      },
      {
        icon: PawPrint,
        title: 'Pet-Friendly Rules',
        body: 'Well-behaved small to medium pets are welcome with prior notification to concierge. Guests are responsible for pet hygiene and leash supervision around pool areas.',
      },
      {
        icon: UtensilsCrossed,
        title: 'Catering & Vendors',
        body: 'You are free to bring outside food, drinks, and hired event caterers with ZERO corkage fees!',
      },
    ],
  },
  {
    category: 'Policies & Security',
    question: 'Can I cancel or reschedule my booking?',
    answer:
      'Cancellations are accepted up to 7 days before check-in. For emergencies, please contact the admin to request a refund. Your reservation is only saved after QR payment is confirmed.',
  },
  {
    category: 'Policies & Security',
    question: 'What are the check-in and check-out times?',
    answer:
      'Standard check-in is at 2:00 PM and check-out is at 12:00 PM. Flexible arrangements may be available upon request.',
  },
  {
    category: 'Policies & Security',
    question: 'Is the property secure for families and groups?',
    answer:
      'Yes. Villa Lacorz provides a safe and secure environment so families and groups can relax with confidence.',
  },
  {
    category: 'Policies & Security',
    question: 'Is parking available on the property?',
    callouts: [
      {
        icon: SquareParking,
        title: 'Villa Gateway',
        body: 'Secure parking inside the property gate for up to 6–8 vehicles (including 1 passenger van).',
      },
    ],
  },
]

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState('All Questions')
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const filtered =
    activeCategory === 'All Questions'
      ? faqs
      : faqs.filter((f) => f.category === activeCategory)

  return (
    <section
      id="faq"
      className="min-h-screen w-full overflow-visible bg-[#F8FAFC] px-4 pt-16 pb-32 sm:px-6 sm:pt-20 sm:pb-36"
    >
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center sm:mb-10">
          <h2 className="font-jakarta text-[50px] font-bold leading-tight tracking-tight text-[#0F172A]">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 font-jakarta text-sm leading-relaxed text-slate-500 sm:text-base">
            Everything you need to know about booking, amenities, and hosting your private
            gathering at Villa Lacorz.
          </p>
        </header>

        <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-2 sm:justify-center sm:overflow-visible">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCategory(cat)
                setOpenIndex(null)
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] ${
                activeCategory === cat
                  ? 'bg-[#006dfc] text-white shadow-sm'
                  : 'bg-white text-[#0F172A] ring-1 ring-slate-200 hover:bg-[#EFF6FF]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((faq, idx) => {
            const isOpen = openIndex === idx
            const panelId = `faq-panel-${idx}`
            const buttonId = `faq-button-${idx}`
            return (
              <article
                key={faq.question}
                className={`rounded-2xl bg-white shadow-sm ring-1 transition ${
                  isOpen ? 'ring-[#006dfc]/30 shadow-md' : 'ring-slate-200'
                }`}
              >
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {(faq.badges ?? [
                        { label: faq.category, tone: 'blue' as const },
                      ]).map((badge) => (
                        <span
                          key={badge.label}
                          className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${badgeToneClasses[badge.tone]}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                    <span className="min-w-0 break-words font-jakarta text-sm font-semibold text-[#0F172A] sm:text-base">
                      {faq.question}
                    </span>
                  </div>
                  <svg
                    className={`mt-1 h-5 w-5 shrink-0 text-[#006dfc] transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-3 px-5 pb-4 font-jakarta text-sm leading-relaxed text-slate-600">
                      {faq.answerIntro && <p>{faq.answerIntro}</p>}
                      {faq.checklist && (
                        <ul className="space-y-2.5">
                          {faq.checklist.map((item) => (
                            <li
                              key={item.title}
                              className="flex items-start gap-2.5"
                            >
                              <CircleCheck
                                className="mt-0.5 size-4 shrink-0 text-[#006dfc]"
                                aria-hidden="true"
                              />
                              <p>
                                <span className="font-semibold text-[#0F172A]">
                                  {item.title}:
                                </span>{' '}
                                {item.description}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                      {faq.callouts && (
                        <div className="space-y-2.5">
                          {faq.callouts.map((callout) => {
                            const Icon = callout.icon
                            return (
                              <div
                                key={callout.title}
                                className="rounded-xl bg-white px-4 py-3.5 ring-1 ring-slate-200"
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#EFF6FF] text-[#006dfc]">
                                    <Icon className="size-4" aria-hidden="true" />
                                  </span>
                                  <div className="min-w-0 space-y-1">
                                    <p className="font-semibold text-[#0F172A]">
                                      {callout.title}
                                    </p>
                                    <p className="text-slate-600">{callout.body}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {faq.feature && (
                        <div className="rounded-xl bg-white px-4 py-3.5 ring-1 ring-slate-200">
                          <div className="flex items-center gap-3">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#EFF6FF] text-[#006dfc]">
                              <faq.feature.icon className="size-4" aria-hidden="true" />
                            </span>
                            <p className="font-semibold text-[#0F172A]">
                              {faq.feature.title}
                            </p>
                          </div>
                        </div>
                      )}
                      {faq.footerNote && (
                        <p className="text-xs text-slate-500">{faq.footerNote}</p>
                      )}
                      {faq.answer && <p>{faq.answer}</p>}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FAQ
