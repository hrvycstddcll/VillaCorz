import { useId, useState } from 'react'
import type {
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
} from 'react'

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
    strokeWidth?: number
    selectedIndex?: number | null
    onSelectPoint?: (index: number | null) => void
}

const chartWidth = 760
const chartHeight = 260
const padding = { top: 20, right: 16, bottom: 34, left: 64 }
const numberFormatter = new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 1,
})

type ChartCoordinate = { x: number; y: number }

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value))

// Catmull-Rom style control points turned into cubic beziers give a smooth
// curve through every real data point. Y is clamped so spiky/zero-heavy data
// never draws outside the plot area.
const buildSmoothPath = (coordinates: ChartCoordinate[]) => {
    const first = coordinates[0]
    if (!first) return ''

    let path = `M${first.x},${first.y}`
    if (coordinates.length === 1) return path

    const minY = padding.top
    const maxY = chartHeight - padding.bottom

    for (let index = 0; index < coordinates.length - 1; index += 1) {
        const previous = coordinates[index - 1] ?? coordinates[index]
        const current = coordinates[index]
        const next = coordinates[index + 1]
        const afterNext = coordinates[index + 2] ?? next
        const control1X = current.x + (next.x - previous.x) / 6
        const control1Y = clamp(
            current.y + (next.y - previous.y) / 6,
            minY,
            maxY,
        )
        const control2X = next.x - (afterNext.x - current.x) / 6
        const control2Y = clamp(
            next.y - (afterNext.y - current.y) / 6,
            minY,
            maxY,
        )

        path += ` C${control1X},${control1Y} ${control2X},${control2Y} ${next.x},${next.y}`
    }

    return path
}

const DashboardLineChart = ({
    points,
    series,
    ariaLabel,
    formatValue = (value) => numberFormatter.format(value),
    maxValue: maxValueOverride,
    strokeWidth = 1,
    selectedIndex = null,
    onSelectPoint,
}: DashboardLineChartProps) => {
    const tooltipId = useId()
    const revealClipId = `chart-reveal-${tooltipId.replace(/:/g, '')}`
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
    const getX = (index: number) =>
        padding.left +
        (points.length > 1 ? (index / (points.length - 1)) * plotWidth : 0)
    const getCoordinates = (value: number, index: number) => ({
        x: getX(index),
        y: padding.top + plotHeight - (value / maxValue) * plotHeight,
    })
    const getColumnBounds = (index: number) => {
        const x = getX(index)
        const left = index === 0 ? padding.left : (getX(index - 1) + x) / 2
        const right =
            index === points.length - 1
                ? chartWidth - padding.right
                : (x + getX(index + 1)) / 2
        return { x: left, width: right - left }
    }
    const visibleLabelStep = Math.max(1, Math.ceil(points.length / 5))
    const canSelect = typeof onSelectPoint === 'function'
    const animationKey = [
        ariaLabel,
        ...points.map(
            (point) =>
                `${point.label}:${series
                    .map((item) => point.values[item.key] ?? 0)
                    .join(',')}`,
        ),
    ].join('|')

    // Hover takes precedence so browsing stays snappy; a selection keeps the
    // marker and tooltip in place once the pointer leaves the chart.
    const displayedIndex = activePoint?.index ?? selectedIndex ?? null
    const displayedPoint =
        displayedIndex === null ? null : points[displayedIndex] ?? null
    const displayedCoordinates =
        displayedPoint === null || displayedIndex === null
            ? null
            : getCoordinates(
                  displayedPoint.values[series[0]?.key ?? ''] ?? 0,
                  displayedIndex,
              )

    const toggleSelection = (index: number) => {
        if (!canSelect) return
        onSelectPoint?.(selectedIndex === index ? null : index)
    }

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
                onKeyDown={(event: ReactKeyboardEvent<SVGSVGElement>) => {
                    if (event.key === 'Escape' && selectedIndex !== null) {
                        onSelectPoint?.(null)
                    }
                }}
            >
                <defs>
                    <clipPath id={revealClipId}>
                        <rect
                            key={animationKey}
                            className="chart-line-reveal"
                            x="0"
                            y="0"
                            width={chartWidth}
                            height={chartHeight}
                        />
                    </clipPath>
                </defs>
                {canSelect && (
                    <rect
                        x="0"
                        y="0"
                        width={chartWidth}
                        height={chartHeight}
                        fill="transparent"
                        aria-hidden="true"
                        onClick={() => onSelectPoint?.(null)}
                    />
                )}
                {selectedIndex !== null && points[selectedIndex] && (
                    <rect
                        {...getColumnBounds(selectedIndex)}
                        y={padding.top}
                        height={plotHeight}
                        fill="#006dfc"
                        fillOpacity="0.07"
                        pointerEvents="none"
                    />
                )}
                {[0, 0.5, 1].map((tick) => {
                    const y = padding.top + plotHeight * (1 - tick)
                    return (
                        <g key={tick} aria-hidden="true" pointerEvents="none">
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

                <g clipPath={`url(#${revealClipId})`}>
                    {series.map((item) => {
                        const path = buildSmoothPath(
                            points.map((point, index) =>
                                getCoordinates(
                                    point.values[item.key] ?? 0,
                                    index,
                                ),
                            ),
                        )

                        return (
                            <path
                                key={item.key}
                                d={path}
                                fill="none"
                                stroke={item.color}
                                strokeDasharray={item.strokeDasharray}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                pointerEvents="none"
                            />
                        )
                    })}
                </g>

                {displayedCoordinates && (
                    <line
                        x1={displayedCoordinates.x}
                        x2={displayedCoordinates.x}
                        y1={padding.top}
                        y2={chartHeight - padding.bottom}
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        pointerEvents="none"
                    />
                )}

                {points.map((point, index) => {
                    const primaryValue =
                        point.values[series[0]?.key ?? ''] ?? 0
                    const { x, y: primaryY } = getCoordinates(
                        primaryValue,
                        index,
                    )
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
                                    pointerEvents="none"
                                >
                                    {point.label}
                                </text>
                            )}
                <rect
                    {...getColumnBounds(index)}
                    y={padding.top}
                    height={plotHeight}
                    fill="transparent"
                    tabIndex={0}
                    role={canSelect ? 'button' : undefined}
                    aria-pressed={
                        canSelect ? selectedIndex === index : undefined
                    }
                    aria-label={`${point.label}, ${series[0]?.label ?? 'Value'}: ${formatValue(primaryValue)}`}
                    aria-describedby={
                        displayedIndex === index ? tooltipId : undefined
                    }
                    className={`${canSelect ? 'cursor-pointer' : 'cursor-crosshair'} focus:outline-none`}
                    onMouseEnter={() =>
                        setActivePoint({ index, x, y: primaryY })
                    }
                    onMouseLeave={() => setActivePoint(null)}
                    onFocus={() => setActivePoint({ index, x, y: primaryY })}
                    onBlur={() => setActivePoint(null)}
                    onClick={() => toggleSelection(index)}
                    onKeyDown={(
                        event: ReactKeyboardEvent<SVGRectElement>,
                    ) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            toggleSelection(index)
                        }
                    }}
                />
                {series.map((item) => {
                    const value = point.values[item.key] ?? 0
                    const { y } = getCoordinates(value, index)
                    const active = displayedIndex === index

                    return (
                        <circle
                            key={item.key}
                            cx={x}
                            cy={y}
                            r={active ? 6 : 3}
                            fill="white"
                            stroke={item.color}
                            strokeWidth={active ? 2.5 : 1.5}
                            pointerEvents="none"
                        />
                    )
                })}
                        </g>
                    )
                })}
            </svg>

            {displayedPoint && displayedCoordinates && (
                <div
                    id={tooltipId}
                    role="tooltip"
                    className="pointer-events-none absolute z-10 min-w-36 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
                    style={{
                        left: `${Math.max(
                            12,
                            Math.min(
                                88,
                                (displayedCoordinates.x / chartWidth) * 100,
                            ),
                        )}%`,
                        top: `${Math.max(
                            18,
                            (displayedCoordinates.y / chartHeight) * 100,
                        )}%`,
                        transform: 'translate(-50%, calc(-100% - 8px))',
                    }}
                >
                    <p className="font-mono text-[10px] font-semibold tabular-nums text-slate-700">
                        {displayedPoint.label}
                    </p>
                    {displayedPoint.annotation && (
                        <p className="mt-0.5 text-[10px] text-slate-500">
                            {displayedPoint.annotation}
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
                                        displayedPoint.values[item.key] ?? 0,
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
