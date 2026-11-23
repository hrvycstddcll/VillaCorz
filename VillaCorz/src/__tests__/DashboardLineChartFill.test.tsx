import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DashboardLineChart, {
    type DashboardChartSeries,
} from '../assets/components/admin/DashboardLineChart'

const points = [
    { label: '11-16', values: { revenue: 5000 } },
    { label: '11-17', values: { revenue: 7500 } },
    { label: '11-18', values: { revenue: 4000 } },
]
const series: DashboardChartSeries[] = [
    { key: 'revenue', label: 'Revenue', color: '#006dfc' },
]
const chartProps = {
    points,
    series,
    ariaLabel: 'Daily revenue',
}

describe('DashboardLineChart area fill', () => {
    it('leaves non-filled series without a gradient or area path', () => {
        const { container } = render(<DashboardLineChart {...chartProps} />)

        expect(container.querySelector('linearGradient')).toBeNull()
        expect(container.querySelectorAll('svg path')).toHaveLength(1)
        expect(container.querySelector('svg path')).toHaveAttribute(
            'fill',
            'none',
        )
    })

    it('fades a filled series from sky blue at the curve peak to transparent at the baseline', () => {
        const { container } = render(
            <DashboardLineChart
                {...chartProps}
                series={[{ ...series[0], fill: true }]}
            />,
        )

        const gradient = container.querySelector('linearGradient')
        expect(gradient).toHaveAttribute('gradientUnits', 'userSpaceOnUse')
        expect(gradient?.querySelectorAll('stop')).toHaveLength(2)

        const stops = gradient?.querySelectorAll('stop')
        expect(stops?.[0]?.getAttribute('stop-color')).toBe('rgb(0, 102, 255)')
        expect(stops?.[0]?.getAttribute('stop-opacity')).toBe('0.22')
        expect(stops?.[1]?.getAttribute('stop-color')).toBe('rgb(0, 102, 255)')
        expect(stops?.[1]?.getAttribute('stop-opacity')).toBe('0')

        // Highest point of the curve is plot top (y=20); the baseline is y=226.
        expect(Number(gradient?.getAttribute('y1'))).toBe(20)
        expect(Number(gradient?.getAttribute('y2'))).toBe(226)

        const paths = container.querySelectorAll('svg path')
        expect(paths).toHaveLength(2)
        expect(paths[0].getAttribute('d')).toContain(' C')
        expect(paths[0].getAttribute('d')).toContain(' L')
        expect(paths[0].getAttribute('d')).toContain(' Z')
        expect(paths[0].getAttribute('fill')).toMatch(
            /^url\(#chart-area-.*-revenue\)$/,
        )
        expect(paths[1]).toHaveAttribute('fill', 'none')
    })
})
