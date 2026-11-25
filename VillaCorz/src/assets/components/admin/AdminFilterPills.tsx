import { focusRing } from './AdminStatStrip'

export type AdminFilterOption<Value extends string | number> = {
    value: Value
    label: string
    count?: number
}

type AdminFilterPillsProps<Value extends string | number> = {
    label: string
    options: AdminFilterOption<Value>[]
    value: Value
    onChange: (value: Value) => void
    /** Styling only: renders each option as a rounded pill instead of a rounded rectangle. */
    pill?: boolean
}

const AdminFilterPills = <Value extends string | number>({
    label,
    options,
    value,
    onChange,
    pill = false,
}: AdminFilterPillsProps<Value>) => (
    <div
        role="group"
        aria-label={label}
        className={`flex max-w-full flex-wrap ${pill ? 'gap-0.5' : 'gap-1'}`}
    >
        {options.map((option) => {
            const selected = option.value === value

            return (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange(option.value)}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 text-xs font-semibold transition-colors ${
                        pill ? 'rounded-lg px-2.5' : 'rounded-lg px-3'
                    } ${focusRing} ${
                        selected
                            ? pill
                                ? 'bg-[#0066FF] text-white'
                                : 'bg-[#006dfc] text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                >
                    {option.label}
                    {option.count !== undefined && (
                        <span className="font-mono text-[10px] tabular-nums opacity-75">
                            {option.count}
                        </span>
                    )}
                </button>
            )
        })}
    </div>
)

export default AdminFilterPills
