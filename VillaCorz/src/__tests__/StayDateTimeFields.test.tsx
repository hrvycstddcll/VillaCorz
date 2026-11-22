import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import StayDateTimeFields from './assets/components/ui/InteractiveComponents/StayDateTimeFields'
import { addPhtDays, phtDateTimeToIso, phtToday } from './lib/stayDateTime'

const baseFields = {
    checkInDate: '2026-11-20',
    checkInTime: '10:00',
    paidDays: 1,
}

const dayLabel = (value: string) =>
    new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'full',
        timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`))

const clickCalendarDate = (value: string) => {
    let button = screen.queryByRole('button', { name: dayLabel(value) })
    if (!button) {
        fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
        button = screen.getByRole('button', { name: dayLabel(value) })
    }
    fireEvent.click(button)
}

describe('StayDateTimeFields', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-11-19T00:00:00.000Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('renders check-in fields, the stage prompt, and a derived checkout', () => {
        render(<StayDateTimeFields fields={baseFields} onChange={vi.fn()} />)

        expect(screen.getByLabelText('Check-in date')).toHaveValue('2026-11-20')
        expect(screen.getByLabelText('Check-in time')).toHaveValue('10:00')
        expect(screen.getByText('Select check-in date')).toBeInTheDocument()
        expect(screen.getByText('Check-out (derived)')).toBeInTheDocument()
        expect(
            screen.getByText(/Pick your check-in date, then your check-out date/),
        ).toBeInTheDocument()
        expect(screen.queryByLabelText('Number of paid days')).toBeNull()
        expect(screen.queryByRole('button', { name: /paid days/i })).toBeNull()
        expect(screen.queryByLabelText('Check-out date')).toBeNull()
        expect(screen.queryByLabelText('Check-out time')).toBeNull()
    })

    it('reports changed check-in times to the parent', () => {
        const onChange = vi.fn()
        render(<StayDateTimeFields fields={baseFields} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Check-in time'), {
            target: { value: '09:30' },
        })
        expect(onChange).toHaveBeenCalledWith({ checkInTime: '09:30' })
    })

    it('shows the PHT 24-hour format hint and paid-day copy', () => {
        render(<StayDateTimeFields fields={baseFields} onChange={vi.fn()} />)

        expect(
            screen.getByText(
                'PHT (UTC+8) · 24-hour HH:MM in the check-in field',
            ),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Each paid day is 22 hours · same check-in time · 2h turnover',
            ),
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /preset/i })).toBeNull()
    })

    it('defaults an empty check-in time to 10:00', () => {
        const onChange = vi.fn()
        render(
            <StayDateTimeFields
                fields={{ ...baseFields, checkInTime: '' }}
                onChange={onChange}
            />,
        )

        const checkInTime = screen.getByLabelText('Check-in time')
        expect(checkInTime).toHaveValue('10:00')

        fireEvent.change(checkInTime, { target: { value: '' } })
        expect(onChange).toHaveBeenCalledWith({ checkInTime: '10:00' })
    })

    it('shows one paid day and its derived checkout in PHT', () => {
        render(<StayDateTimeFields fields={baseFields} onChange={vi.fn()} />)

        expect(screen.getByText(/1 paid day · 22h occupancy each/)).toBeInTheDocument()
        expect(screen.getAllByText(/10:00 AM PHT/).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/8:00 AM PHT/).length).toBeGreaterThan(0)
    })

    it('shows a validation error when paid days are outside the range', () => {
        render(
            <StayDateTimeFields
                fields={{ ...baseFields, paidDays: 0 }}
                onChange={vi.fn()}
            />,
        )

        expect(
            screen.getByText('Choose between 1 and 90 paid days.'),
        ).toBeInTheDocument()
    })

    it('selects check-in then check-out from the calendar and resets on the next click', () => {
        const Harness = () => {
            const [fields, setFields] = useState({
                ...baseFields,
                checkInDate: '',
            })

            return (
                <StayDateTimeFields
                    fields={fields}
                    onChange={(patch) =>
                        setFields((current) => ({ ...current, ...patch }))
                    }
                />
            )
        }

        const checkIn = phtToday()
        const checkOut = addPhtDays(checkIn, 2)
        const nextCheckIn = addPhtDays(checkIn, 4)
        render(<Harness />)

        clickCalendarDate(checkIn)
        expect(screen.getByLabelText('Check-in date')).toHaveValue(checkIn)
        expect(screen.getByLabelText('Check-in time')).toHaveValue('10:00')
        expect(screen.getByText('Select check-out date')).toBeInTheDocument()
        expect(screen.getByText(/1 paid day · 22h occupancy each/)).toBeInTheDocument()

        clickCalendarDate(checkOut)
        expect(screen.getByText('Select check-in date')).toBeInTheDocument()
        expect(screen.getByText(/2 paid days · 22h occupancy each/)).toBeInTheDocument()
        expect(screen.getAllByText(/8:00 AM PHT/).length).toBeGreaterThan(0)

        clickCalendarDate(nextCheckIn)
        expect(screen.getByLabelText('Check-in date')).toHaveValue(nextCheckIn)
        expect(screen.getByText('Select check-out date')).toBeInTheDocument()
        expect(screen.getByText(/1 paid day · 22h occupancy each/)).toBeInTheDocument()
    })

    it('keeps the selected checkout date when check-in time changes', () => {
        const Harness = () => {
            const [fields, setFields] = useState({
                ...baseFields,
                checkInDate: '',
            })

            return (
                <StayDateTimeFields
                    fields={fields}
                    onChange={(patch) =>
                        setFields((current) => ({ ...current, ...patch }))
                    }
                />
            )
        }

        const checkIn = phtToday()
        const checkOut = addPhtDays(checkIn, 2)
        render(<Harness />)

        clickCalendarDate(checkIn)
        clickCalendarDate(checkOut)

        fireEvent.change(screen.getByLabelText('Check-in time'), {
            target: { value: '09:00' },
        })

        expect(screen.getByLabelText('Check-in time')).toHaveValue('09:00')
        expect(screen.getByText(/2 paid days · 22h occupancy each/)).toBeInTheDocument()
        expect(screen.getAllByText(/7:00 AM PHT/).length).toBeGreaterThan(0)
    })

    it('rejects a check-out date whose range includes a booked date', () => {
        const checkIn = phtToday()
        const blocked = addPhtDays(checkIn, 1)
        const checkOut = addPhtDays(checkIn, 2)
        const onUnavailableDate = vi.fn()
        const Harness = () => {
            const [fields, setFields] = useState({
                ...baseFields,
                checkInDate: '',
            })

            return (
                <StayDateTimeFields
                    fields={fields}
                    onChange={(patch) =>
                        setFields((current) => ({ ...current, ...patch }))
                    }
                    unavailableDates={[blocked]}
                    onUnavailableDate={onUnavailableDate}
                />
            )
        }

        render(<Harness />)

        clickCalendarDate(checkIn)
        clickCalendarDate(checkOut)

        expect(screen.getByText('Select check-out date')).toBeInTheDocument()
        expect(screen.queryByText(/2 paid days · 22h occupancy each/)).toBeNull()
        expect(onUnavailableDate).toHaveBeenCalledWith(blocked)
        expect(
            screen.getByText('Your selected range includes a booked date.'),
        ).toBeInTheDocument()
    })

    it('round-trips form values through the shared PHT conversion helper', () => {
        expect(phtDateTimeToIso('2026-11-20', '08:00')).toBe(
            '2026-11-20T00:00:00.000Z',
        )
    })

    it('disables booked calendar dates and rejects them from the native date input', () => {
        const booked = phtToday()
        const onChange = vi.fn()
        const onUnavailableDate = vi.fn()
        render(
            <StayDateTimeFields
                fields={{ ...baseFields, checkInDate: '' }}
                onChange={onChange}
                unavailableDates={[booked]}
                onUnavailableDate={onUnavailableDate}
            />,
        )

        const bookedButton = screen.getByRole('button', {
            name: `${dayLabel(booked)}, unavailable`,
        })
        expect(bookedButton).toBeDisabled()
        fireEvent.click(bookedButton)
        expect(onChange).not.toHaveBeenCalled()

        fireEvent.change(screen.getByLabelText('Check-in date'), {
            target: { value: booked },
        })
        expect(onUnavailableDate).toHaveBeenCalledWith(booked)
        expect(onChange).not.toHaveBeenCalled()
        expect(screen.getByText('Booked')).toBeInTheDocument()
    })
})
