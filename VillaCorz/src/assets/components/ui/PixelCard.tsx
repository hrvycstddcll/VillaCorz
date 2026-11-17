import React from 'react'

type PixelCardProps = {
    children?: React.ReactNode
    className?: string
    theme?: string
    variant?: string
    radius?: number
    'data-animate'?: string
    [key: string]: unknown
}

const PixelCard = ({ children, className, radius, ...rest }: PixelCardProps) => {
    return (
        <div
            className={className}
            style={radius ? { borderRadius: radius } : undefined}
            {...rest}
        >
            {children}
        </div>
    )
}

export default PixelCard