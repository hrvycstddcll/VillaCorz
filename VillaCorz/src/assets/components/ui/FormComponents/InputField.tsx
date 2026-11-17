import { type ReactNode } from "react";

type InputFieldProps = {
    id: string
    name: string
    label: string
    type?: 'text' | 'email'
    autoComplete: string
    maxLength?: number
    icon?: ReactNode
}

const InputField = ({
    id,
    name,
    label,
    type = 'text',
    autoComplete,
    maxLength = 55,
    icon,
}: InputFieldProps) => (
    <div className="input-float w-full">
        <input
            id={id}
            name={name}
            type={type}
            placeholder=" "
            required
            maxLength={maxLength}
            autoComplete={autoComplete}
            className={`input-focus ${icon ? 'pr-12' : ''}`}
        />

        <label className="input-float-label" htmlFor={id}>
            {label}
        </label>

        {icon && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#333333]">
                {icon}
            </span>
        )}
    </div>
)

export default InputField