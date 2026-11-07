export const money = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0,
    }).format(amount)

export const guestCapacity = (stay: { capacity: string }) =>
    stay.capacity.replace('Good for ', '').replace(' pax', '')
