import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type AccountPasswordInputProps = {
    id: string
    label: string
    value: string
    autoComplete: 'current-password' | 'new-password'
    onChange: (value: string) => void
}

const AccountPasswordInput = ({
    id,
    label,
    value,
    autoComplete,
    onChange,
}: AccountPasswordInputProps) => {
    const [isVisible, setIsVisible] = useState(false)

    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-medium text-slate-700"
            >
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={isVisible ? 'text' : 'password'}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete={autoComplete}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pe-12 text-sm text-slate-900 outline-none transition-colors focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20"
                />
                <button
                    type="button"
                    onClick={() => setIsVisible((visible) => !visible)}
                    aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                    className="absolute inset-y-0 end-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#006dfc]"
                >
                    {isVisible ? (
                        <EyeOff className="size-5" aria-hidden="true" />
                    ) : (
                        <Eye className="size-5" aria-hidden="true" />
                    )}
                </button>
            </div>
        </div>
    )
}

export default AccountPasswordInput
