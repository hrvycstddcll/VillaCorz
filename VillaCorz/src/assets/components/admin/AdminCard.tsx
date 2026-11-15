import type { ReactNode } from 'react'

type AdminCardProps = {
    children: ReactNode
    className?: string
    padding?: boolean
}

const AdminCard = ({ children, className = '', padding = true }: AdminCardProps) => (
    <div
        className={`rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.025)] ${
            padding ? 'p-5' : ''
        } ${className}`}
    >
        {children}
    </div>
)

export default AdminCard
