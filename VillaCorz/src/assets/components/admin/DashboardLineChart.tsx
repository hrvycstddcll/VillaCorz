import { useId, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

export type DashboardChartPoint = {
    label: string
    values: Record<string, number>
    annotation?: string
}

export type DashboardChartSeries = {
    key: string
    label: string
    color: string
    strokeDasharray?: string
}

type DashboardLineChartProps = {
    points: DashboardChartPoint[]
    series: DashboardChartSeries[]
    ariaLabel: string
    formatValue?: (value: number) => string
    maxValue?: number
}

const chartWidth = 760
const chartHeight = 260
const padding = { top: 20, right: 16, bottom: 34, left: 64 }
const numberFormatter = new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 1,
})

const DashboardLineChart = ({
    points,
    series,
    ariaLabel,
    formatValue = (value) => numberFormatter.format(value),
    maxValue: maxValueOverride,
}: DashboardLineChartProps) => {
    const tooltipId = useId()
    const [activePoint, setActivePoint] = useState<{
        index: number
        x: number
        y: number
    } | null>(null)
    const plotWidth = chartWidth - padding.left - padding.right
    const plotHeight = chartHeight - padding.top - padding.bottom
    const values = points.flatMap((point) =>
        series.map((item) => point.values[item.key] ?? 0),
    )
    const maxValue = Math.max(1, maxValueOverride ?? 0, ...values)
    const getCoordinates = (value: number, index: number) => ({
        x:
            padding.left +
            (points.length > 1 ? (index / (points.length - 1)) * plotWidth : 0),
        y: padding.top + plotHeight - (value / maxValue) * plotHeight,
    })
    const hoveredPoint =
        activePoint === null ? null : points[activePoint.index] ?? null
    const visibleLabelStep = Math.max(1, Math.ceil(points.length / 5))

    const handleMouseMove = (event: ReactMouseEvent<SVGSVGElement>) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x =
            (event.clientX - rect.left) * (chartWidth / rect.width)
        let nearestIndex = 0
        let minDistance = Infinity
        points.forEach((point, index) => {
            const pointX = getCoordinates(
                point.values[series[0]?.key ?? ''] ?? 0,
                index,
            ).x
            const distance = Math.abs(pointX - x)
            if (distance < minDistance) {
                minDistance = distance
                nearestIndex = index
            }
        })
        const point = points[nearestIndex]
        if (!point) return
        const pointX = getCoordinates(
            point.values[series[0]?.key ?? ''] ?? 0,
            nearestIndex,
        ).x
        const pointY = getCoordinates(
            point.values[series[0]?.key ?? ''] ?? 0,
            nearestIndex,
        ).y
        setActivePoint({ index: nearestIndex, x: pointX, y: pointY })
    }

    return (
        <div
            className="relative w-full"
            style={{ aspectRatio: `${chartWidth} / ${chartHeight}` }}
        >
            <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="absolute inset-0 size-full"
                role="group"
                aria-label={ariaLabel}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setActivePoint(null)}
            >
                {[0, 0.5, 1].map((tick) => {
                    const y = padding.top + plotHeight * (1 - tick)
                    return (
                        <g key={tick} aria-hidden="true">
                            <line
                                x1={padding.left}
                                x2={chartWidth - padding.right}
                                y1={y}
                                y2={y}
                                stroke="rgba(0,0,0,0.06)"
                            />
                            <text
                                x={padding.left - 10}
                                y={y + 3}
                                textAnchor="end"
                                className="fill-slate-500 font-mono text-[9px] tabular-nums"
                            >
                                {formatValue(maxValue * tick)}
                            </text>
                        </g>
                    )
                })}

                {series.map((item) => {
                    const path = points
                        .map((point, index) => {
                            const { x, y } = getCoordinates(
                                point.values[item.key] ?? 0,
                                index,
                            )
                            return `${index === 0 ? 'M' : 'L'}${x},${y}`
                        })
                        .join(' ')

                    return (
                        <path
                            key={item.key}
                            d={path}
                            fill="none"
                            stroke={item.color}
                            strokeDasharray={item.strokeDasharray}
                                    strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )
                })}

                {points.map((point, index) => {
                    const x = getCoordinates(
                        point.values[series[0]?.key ?? ''] ?? 0,
                        index,
                    ).x
                    const showLabel =
                        index === 0 ||
                        index === points.length - 1 ||
                        index % visibleLabelStep === 0

                    return (
                        <g key={`${point.label}-${index}`}>
                            {showLabel && (
                                <text
                                    x={x}
                                    y={chartHeight - 8}
                                    textAnchor="middle"
                                    className="fill-slate-500 font-mono text-[9px] tabular-nums"
                                    aria-hidden="true"
                                >
                                    {point.label}
                                </text>
                            )}
                {activePoint && (
                    <line
                        x1={activePoint.x}
                        x2={activePoint.x}
                        y1={padding.top}
                        y2={chartHeight - padding.bottom}
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        pointerEvents="none"
                    />
                )}

                {series.map((item) => {
                                const value = point.values[item.key] ?? 0
                                const { y } = getCoordinates(value, index)
                                const active = activePoint?.index === index

                                return (
                                    <g key={item.key}>
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r="9"
                                            fill="transparent"
                                            tabIndex={0}
                                            aria-label={`${point.label}, ${item.label}: ${formatValue(value)}`}
                                            aria-describedby={
                                                active ? tooltipId : undefined
                                            }
                                            className="cursor-crosshair focus:outline-none focus-visible:stroke-[#006dfc] focus-visible:stroke-[2.5]"
                                            onMouseEnter={() =>
                                                setActivePoint({ index, x, y })
                                            }
                                            onMouseLeave={() =>
                                                setActivePoint(null)
                                            }
                                            onFocus={() =>
                                                setActivePoint({ index, x, y })
                                            }
                                            onBlur={() => setActivePoint(null)}
                                        />
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r={active ? 5 : 3}
                                            fill="white"
                                            stroke={item.color}
                                            strokeWidth={active ? 2 : 1.5}
                                            pointerEvents="none"
                                        />
                                    </g>
                                )
                            })}
                        </g>
                    )
                })}
            </svg>

            {hoveredPoint && activePoint && (
                <div
                    id={tooltipId}
                    role="tooltip"
                    className="pointer-events-none absolute z-10 min-w-36 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
                    style={{
                        left: `${Math.max(
                            12,
                            Math.min(88, (activePoint.x / chartWidth) * 100),
                        )}%`,
                        top: `${Math.max(
                            18,
                            (activePoint.y / chartHeight) * 100,
                        )}%`,
                        transform: 'translate(-50%, calc(-100% - 8px))',
                    }}
                >
                    <p className="font-mono text-[10px] font-semibold tabular-nums text-slate-700">
                        {hoveredPoint.label}
                    </p>
                    {hoveredPoint.annotation && (
                        <p className="mt-0.5 text-[10px] text-slate-500">
                            {hoveredPoint.annotation}
                        </p>
                    )}
                    <ul className="mt-1 space-y-0.5">
                        {series.map((item) => (
                            <li
                                key={item.key}
                                className="flex items-center justify-between gap-4 text-[10px]"
                            >
                                <span className="flex items-center gap-1.5 text-slate-600">
                                    <span
                                        aria-hidden="true"
                                        className="size-1.5 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    {item.label}
                                </span>
                                <span className="font-mono font-semibold tabular-nums text-slate-900">
                                    {formatValue(
                                        hoveredPoint.values[item.key] ?? 0,
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default DashboardLineChart
