import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ModalFocusManager from './components/ModalFocusManager'

const Harness = () => {
    const [open, setOpen] = useState(false)

    return (
        <>
            <ModalFocusManager />
            <button type="button" onClick={() => setOpen(true)}>
                Open modal
            </button>
            {open && (
                <div role="dialog" aria-modal="true" aria-label="Example modal">
                    <button type="button">First</button>
                    <button type="button" onClick={() => setOpen(false)}>
                        Close modal
                    </button>
                    <button type="button">Last</button>
                </div>
            )}
        </>
    )
}

describe('ModalFocusManager', () => {
    it('locks background scroll and keeps focus inside the topmost modal', async () => {
        render(<Harness />)

        const trigger = screen.getByRole('button', { name: 'Open modal' })
        trigger.focus()
        fireEvent.click(trigger)

        const dialog = await screen.findByRole('dialog', {
            name: 'Example modal',
        })
        const first = within(dialog).getByRole('button', { name: 'First' })
        const last = within(dialog).getByRole('button', { name: 'Last' })

        await waitFor(() =>
            expect(document.documentElement).toHaveClass('modal-open'),
        )
        expect(first).toHaveFocus()

        last.focus()
        fireEvent.keyDown(document, { key: 'Tab' })
        expect(first).toHaveFocus()

        first.focus()
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
        expect(last).toHaveFocus()

        fireEvent.click(
            within(dialog).getByRole('button', { name: 'Close modal' }),
        )

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        await waitFor(() => expect(trigger).toHaveFocus())
        expect(document.documentElement).not.toHaveClass('modal-open')
    })
})
