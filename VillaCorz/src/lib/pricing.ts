import { money } from './format'
import type { ServiceDiscountType } from '../services/types'

export type OfferPricing = {
    price: number
    originalPrice: number | null
    discountAmount: number
    discountPercent: number | null
    discountLabel: string
    hasDiscount: boolean
}

export type DayOfferPricing = {
    weekday: OfferPricing
    weekend: OfferPricing
    hasDiscount: boolean
}

const roundMoney = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100

const roundPercent = (value: number) => Math.round(value * 10) / 10

const formatPercent = (value: number) => `${roundPercent(value)}%`

const noDiscount = (price: number): OfferPricing => ({
    price,
    originalPrice: null,
    discountAmount: 0,
    discountPercent: null,
    discountLabel: '',
    hasDiscount: false,
})

export const getOfferPricing = (
    price: number,
    type?: ServiceDiscountType | null,
    value?: string | number | null,
): OfferPricing => {
    const basePrice = Number.isFinite(price) ? Math.max(0, price) : 0

    if (!type || value === null || value === undefined || value === '') {
        return noDiscount(basePrice)
    }

    const rawValue = Number(value)

    if (!Number.isFinite(rawValue) || rawValue <= 0) {
        return noDiscount(basePrice)
    }

    const rawAmount =
        type === 'percent' ? (basePrice * rawValue) / 100 : rawValue
    const discountAmount = roundMoney(Math.min(rawAmount, basePrice))

    if (discountAmount <= 0) {
        return noDiscount(basePrice)
    }

    const discountPercent = roundPercent(
        type === 'percent'
            ? rawValue
            : basePrice > 0
              ? (discountAmount / basePrice) * 100
              : 0,
    )

    const discountLabel =
        type === 'percent'
            ? `${formatPercent(discountPercent)} off`
            : `${money(discountAmount)} off (${formatPercent(discountPercent)})`

    return {
        price: roundMoney(basePrice - discountAmount),
        originalPrice: basePrice,
        discountAmount,
        discountPercent,
        discountLabel,
        hasDiscount: true,
    }
}

export const getDayOfferPricing = (
    price: number,
    weekdayType?: ServiceDiscountType | null,
    weekdayValue?: string | number | null,
    weekendType?: ServiceDiscountType | null,
    weekendValue?: string | number | null,
): DayOfferPricing => {
    const weekday = getOfferPricing(price, weekdayType, weekdayValue)
    const weekend = getOfferPricing(price, weekendType, weekendValue)

    return {
        weekday,
        weekend,
        hasDiscount: weekday.hasDiscount || weekend.hasDiscount,
    }
}

export const getOfferBadgeLabel = ({
    weekday,
    weekend,
}: DayOfferPricing): string => {
    const discounted = [weekday, weekend].filter((entry) => entry.hasDiscount)

    if (discounted.length === 0) {
        return ''
    }

    const percents = discounted.map((entry) => entry.discountPercent ?? 0)
    const highest = Math.max(...percents)
    const lowest = Math.min(...percents)

    if (discounted.length === 1 || highest === lowest) {
        return `${formatPercent(highest)} off`
    }

    return `Up to ${formatPercent(highest)} off`
}
