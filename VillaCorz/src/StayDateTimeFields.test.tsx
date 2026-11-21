import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import StayDateTimeFields from './assets/components/ui/InteractiveComponents/StayDateTimeFields'
import { phtDateTimeToIso, phtToday } from './lib/stayDateTime'

const baseFields = {
    checkInDate: '2026-11-20',
    checkInTime: '08:00',
    checkOutDate: '2026-11-20',
    checkOutTime: '22:00',
}

const addDays = (value: string, amount: number) =>
    new Date(Date.parse(`${value}T00:00:00Z`) + amount * 86_400_000)
        .toISOString()
        .slice(0, 10)

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
    it('renders four Philippine date and time fields', () => {
        render(<StayDateTimeFields fields={baseFields} onChange={vi.fn()} />)

        expect(screen.getByLabelText('Check-in date')).toHaveValue('2026-11-20')
        expect(screen.getByLabelText('Check-in time')).toHaveValue('08:00')
        expect(screen.getByLabelText('Check-out date')).toHaveValue('2026-11-20')
        expect(screen.getByLabelText('Check-out time')).toHaveValue('22:00')
        expect(
            screen.getByText(/Pick your dates on the calendar/),
        ).toBeInTheDocument()
    })

    it('reports changed fields to the parent', () => {
        const onChange = vi.fn()
        render(<StayDateTimeFields fields={baseFields} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Check-out time'), {
            target: { value: '23:30' },
        })

        expect(onChange).toHaveBeenCalledWith({ checkOutTime: '23:30' })
    })

    it('shows the PHT 24-hour format hint without preset buttons', () => {
        render(<StayDateTimeFields fields={baseFields} onChange={vi.fn()} />)

        expect(
            screen.getByText(/PHT \(UTC\+8\) · 24-hour HH:MM in the fields/),
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /preset/i })).toBeNull()
    })

    it('shows preset time values in the inputs when fields are empty', () => {
        const onChange = vi.fn()
        render(
            <StayDateTimeFields
                fields={{
                    ...baseFields,
                    checkInTime: '',
                    checkOutTime: '',
                }}
                onChange={onChange}
            />,
        )

        const checkInTime = screen.getByLabelText('Check-in time')
        const checkOutTime = screen.getByLabelText('Check-out time')

        expect(checkInTime).toHaveValue('14:00')
        expect(checkOutTime).toHaveValue('12:00')

        fireEvent.change(checkInTime, { target: { value: '' } })
        expect(onChange).toHaveBeenCalledWith({ checkInTime: '14:00' })

        fireEvent.change(checkOutTime, { target: { value: '' } })
        expect(onChange).toHaveBeenCalledWith({ checkOutTime: '12:00' })
    })

    it('allows a same-day stay and shows one night in PHT', () => {
        render(<StayDateTimeFields fields={baseFields} onChange={vi.fn()} />)

        expect(screen.getByText(/1 night · same-day stays are charged one night/)).toBeInTheDocument()
        expect(screen.getByText(/8:00 AM/)).toBeInTheDocument()
        expect(screen.getByText(/10:00 PM/)).toBeInTheDocument()
    })

    it('shows a validation error when check-out is not later than check-in', () => {
        render(
            <StayDateTimeFields
                fields={{
                    ...baseFields,
                    checkInTime: '14:00',
                    checkOutTime: '14:00',
                }}
                onChange={vi.fn()}
            />,
        )

        expect(
            screen.getByText('Check-out must be later than check-in.'),
        ).toBeInTheDocument()
    })

    it('selects check-in and check-out dates from the calendar while keeping the time fields', () => {
        const Harness = () => {
            const [fields, setFields] = useState({
                ...baseFields,
                checkInDate: '',
                checkOutDate: '',
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
        const checkOut = addDays(checkIn, 2)
        render(<Harness />)

        clickCalendarDate(checkIn)
        clickCalendarDate(checkOut)

        expect(screen.getByLabelText('Check-in date')).toHaveValue(checkIn)
        expect(screen.getByLabelText('Check-out date')).toHaveValue(checkOut)
        expect(screen.getByLabelText('Check-in time')).toHaveValue('08:00')
        expect(screen.getByLabelText('Check-out time')).toHaveValue('22:00')
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
                fields={{ ...baseFields, checkInDate: '', checkOutDate: '' }}
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
