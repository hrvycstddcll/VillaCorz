import {
    formatNationalMobile,
    nationalMobileDigits,
    PH_NATIONAL_PATTERN,
} from '../../../lib/phoneNumber'

type PhoneNumberInputProps = {
    /** The 10 national digits, without the +63 prefix. */
    value: string
    onChange: (digits: string) => void
    ariaLabel: string
    required?: boolean
    autoComplete?: string
    disabled?: boolean
    className?: string
}

/**
 * PH mobile field with a fixed, non-removable +63 prefix. The guest types the
 * national part as 9XX XXX XXXX and the backend still receives E.164.
 */
function PhoneNumberInput({
    value,
    onChange,
    ariaLabel,
    required = false,
    autoComplete = 'tel',
    disabled = false,
    className = '',
}: PhoneNumberInputProps) {
    return (
        <div
            className={`flex w-full overflow-hidden border border-slate-300 bg-white transition focus-within:border-[#0875f9] focus-within:ring-2 focus-within:ring-[#0875f9]/20 ${className}`}
        >
            <span
                aria-hidden="true"
                className="flex shrink-0 select-none items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600"
            >
                +63
            </span>
            <input
                type="tel"
                inputMode="numeric"
                autoComplete={autoComplete}
                aria-label={ariaLabel}
                required={required}
                disabled={disabled}
                value={formatNationalMobile(value)}
                onChange={(event) =>
                    onChange(nationalMobileDigits(event.target.value))
                }
                pattern={PH_NATIONAL_PATTERN}
                title="Enter a 10-digit PH mobile number starting with 9."
                placeholder="9XX XXX XXXX"
                className="min-h-full w-full flex-1 bg-transparent px-3 py-2 text-base text-slate-900 outline-none placeholder:text-slate-400 disabled:bg-slate-50 sm:text-sm"
            />
        </div>
    )
}

export default PhoneNumberInput