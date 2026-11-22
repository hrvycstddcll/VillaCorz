import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DashboardLineChart, {
    type DashboardChartPoint,
    type DashboardChartSeries,
} from './DashboardLineChart'

const points: DashboardChartPoint[] = [
    { label: '11-16', values: { revenue: 5000 } },
    { label: '11-17', values: { revenue: 7500 } },
]
const series: DashboardChartSeries[] = [
    { key: 'revenue', label: 'Revenue', color: '#006dfc' },
]

const SelectableChart = () => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

    return (
        <>
            <DashboardLineChart
                points={points}
                series={series}
                ariaLabel="Daily revenue"
                selectedIndex={selectedIndex}
                onSelectPoint={setSelectedIndex}
            />
            <output data-testid="selection">
                {selectedIndex === null ? 'none' : String(selectedIndex)}
            </output>
        </>
    )
}

const chartProps = {
    points,
    series,
    ariaLabel: 'Daily revenue',
}

describe('DashboardLineChart point selection', () => {
    it('selects a point on click and keeps its tooltip after the pointer leaves', () => {
        render(<SelectableChart />)

        const point = screen.getByRole('button', {
            name: '11-16, Revenue: 5,000',
        })
        expect(point).toHaveAttribute('height', '206')

        fireEvent.click(point)

        expect(screen.getByTestId('selection')).toHaveTextContent('0')
        expect(screen.getByRole('tooltip')).toHaveTextContent('11-16')

        fireEvent.mouseLeave(screen.getByRole('group', { name: 'Daily revenue' }))

        expect(screen.getByRole('tooltip')).toHaveTextContent('11-16')
    })

    it('clears the selection when the same point is clicked again', () => {
        render(<SelectableChart />)
        const point = screen.getByRole('button', {
            name: '11-16, Revenue: 5,000',
        })

        fireEvent.click(point)
        expect(screen.getByTestId('selection')).toHaveTextContent('0')

        fireEvent.click(point)
        expect(screen.getByTestId('selection')).toHaveTextContent('none')
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('clears the selection when the chart background is clicked', () => {
        const { container } = render(<SelectableChart />)

        fireEvent.click(
            screen.getByRole('button', { name: '11-17, Revenue: 7,500' }),
        )
        expect(screen.getByTestId('selection')).toHaveTextContent('1')

        fireEvent.click(
            container.querySelector(
                'svg > rect[fill="transparent"]',
            ) as SVGRectElement,
        )
        expect(screen.getByTestId('selection')).toHaveTextContent('none')
    })

    it('supports Enter to select and Escape to clear', () => {
        render(<SelectableChart />)
        const point = screen.getByRole('button', {
            name: '11-16, Revenue: 5,000',
        })

        fireEvent.keyDown(point, { key: 'Enter' })
        expect(screen.getByTestId('selection')).toHaveTextContent('0')

        fireEvent.keyDown(point, { key: 'Escape' })
        expect(screen.getByTestId('selection')).toHaveTextContent('none')
    })

    it('leaves the chart unchanged when selection is not enabled', () => {
        render(<DashboardLineChart {...chartProps} />)

        expect(screen.queryByRole('button')).not.toBeInTheDocument()
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('draws smoothed lines inside a reveal clip', () => {
        const { container } = render(<DashboardLineChart {...chartProps} />)
        const path = container.querySelector('svg path') as SVGPathElement

        expect(path.getAttribute('d')).toContain(' C')
        expect(container.querySelector('clipPath rect')).toHaveClass(
            'chart-line-reveal',
        )
    })

    it('keeps dashed series styles while revealing', () => {
        const { container } = render(
            <DashboardLineChart
                {...chartProps}
                series={[
                    ...series,
                    {
                        key: 'predicted',
                        label: 'Predicted',
                        color: '#64748b',
                        strokeDasharray: '6 4',
                    },
                ]}
            />,
        )
        const paths = container.querySelectorAll('svg path')

        expect(paths).toHaveLength(2)
        expect(paths[1]).toHaveAttribute('stroke-dasharray', '6 4')
    })

    it('restarts the reveal when the chart data changes', () => {
        const { container, rerender } = render(
            <DashboardLineChart {...chartProps} />,
        )
        const initialReveal = container.querySelector('clipPath rect')

        rerender(
            <DashboardLineChart
                {...chartProps}
                points={[{ label: '11-18', values: { revenue: 9000 } }]}
            />,
        )

        expect(container.querySelector('clipPath rect')).not.toBe(initialReveal)
    })
})
