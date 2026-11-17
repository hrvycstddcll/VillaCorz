import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

const PasswordField = ({
    id,
    name,
    label,
    autoComplete,
}: {
    id: string
    name: string
    label: string
    autoComplete: string
}) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="input-float w-full">
            <input
                id={id}
                name={name}
                type={showPassword ? 'text' : 'password'}
                placeholder=" "
                required
                minLength={8}
                maxLength={20}
                autoComplete={autoComplete}
                className="input-focus pr-12"
            />

            <label className="input-float-label" htmlFor={id}>
                {label}
            </label>

            <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] transition hover:text-[#0866e8]"
            >
                {showPassword ? (
                    <EyeOff className="size-5" />
                ) : (
                    <Eye className="size-5" />
                )}
            </button>
        </div>
    )
}

export default PasswordField