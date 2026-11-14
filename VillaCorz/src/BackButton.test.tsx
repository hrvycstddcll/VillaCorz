import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import BackButton from './assets/components/ui/BackButton'

function LocationDisplay() {
    const location = useLocation()
    return <span data-testid="location">{location.pathname}</span>
}

describe('BackButton', () => {
    it('navigates to fallback when there is no history', () => {
        render(
            <MemoryRouter initialEntries={['/current']}>
                <Routes>
                    <Route
                        path="/current"
                        element={
                            <>
                                <BackButton fallback="/fallback" />
                                <LocationDisplay />
                            </>
                        }
                    />
                    <Route path="/fallback" element={<LocationDisplay />} />
                </Routes>
            </MemoryRouter>,
        )

        fireEvent.click(screen.getByRole('button', { name: /back/i }))
        expect(screen.getByTestId('location')).toHaveTextContent('/fallback')
    })

    it('uses a custom label', () => {
        render(
            <MemoryRouter initialEntries={['/current']}>
                <BackButton label="Return" />
            </MemoryRouter>,
        )
        expect(screen.getByRole('button', { name: /return/i })).toBeInTheDocument()
    })
})
