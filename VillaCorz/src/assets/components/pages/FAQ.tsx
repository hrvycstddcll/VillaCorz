import { useState } from 'react'

const categories = [
  'All Questions',
  'Booking & Rates',
  'Amenities & Stay',
  'Events & Gatherings',
  'Policies & Security',
]

const faqs = [
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
    category: 'Events & Gatherings',
    question: 'Can we host birthdays, reunions, or corporate gatherings?',
    answer:
      'Absolutely. With exclusive booking the entire property is yours, making it well suited to birthdays, reunions, and group events. Shared spaces support meals and celebrations.',
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
]

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState('All Questions')
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const filtered =
    activeCategory === 'All Questions'
      ? faqs
      : faqs.filter((f) => f.category === activeCategory)

  return (
    <section className="min-h-screen w-full overflow-visible bg-[#F8FAFC] px-4 py-16 pb-24 sm:px-6 sm:py-20">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center sm:mb-10">
          <h2 className="font-instrument text-3xl tracking-tight text-[#0F172A] sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 font-helvetica-world text-sm leading-relaxed text-slate-500 sm:text-base">
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
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <span className="w-fit rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-semibold text-[#006dfc]">
                      {faq.category}
                    </span>
                    <span className="font-helvetica-world text-sm font-semibold text-[#0F172A] sm:text-base">
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
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="px-5 pb-4 font-helvetica-world text-sm leading-relaxed text-slate-600">
                    {faq.answer}
                  </p>
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
