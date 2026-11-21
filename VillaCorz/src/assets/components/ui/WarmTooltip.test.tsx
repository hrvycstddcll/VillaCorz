import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WarmTooltip } from './WarmTooltip'

const makeRect = (top: number, left: number, width = 40, height = 20): DOMRect => ({
    top,
    left,
    width,
    height,
    bottom: top + height,
    right: left + width,
    x: left,
    y: top,
    toJSON: () => ({}),
}) as DOMRect

const renderTooltip = () => {
    render(
        <WarmTooltip content="Help text" side="bottom" delay={0}>
            <button type="button">Hover me</button>
        </WarmTooltip>,
    )
    return screen.getByRole('button').parentElement as HTMLElement
}

describe('WarmTooltip positioning', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('positions the tooltip beside the hovered trigger', async () => {
        const trigger = renderTooltip()
        vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(makeRect(200, 300))

        fireEvent.mouseEnter(trigger)

        const tooltip = await screen.findByRole('tooltip')
        expect(tooltip.style.position).toBe('fixed')
        expect(tooltip.style.left).toBe('210px')
        expect(tooltip.style.top).toBe('228px')
    })

    it('repositions the open tooltip after scrolling', async () => {
        const trigger = renderTooltip()
        const rect = vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(makeRect(200, 300))

        fireEvent.mouseEnter(trigger)
        const tooltip = await screen.findByRole('tooltip')
        expect(tooltip.style.left).toBe('210px')
        expect(tooltip.style.top).toBe('228px')

        rect.mockReturnValue(makeRect(120, 500))
        fireEvent.scroll(window)

        await waitFor(() => expect(tooltip.style.left).toBe('410px'))
        expect(tooltip.style.top).toBe('148px')
    })

    it('does not render at the origin for a zero-sized trigger', async () => {
        const trigger = renderTooltip()
        vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(makeRect(0, 0, 0, 0))

        fireEvent.mouseEnter(trigger)
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
})
