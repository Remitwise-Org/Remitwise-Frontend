import { ButtonHTMLAttributes, forwardRef } from 'react'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  disabled?: boolean
}

const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className = '', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        className={`
          inline-flex items-center justify-center
          bg-brand.red text-white
          px-6 py-3 rounded-lg font-semibold
          hover:bg-brand.redHover
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-brand.red focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand.red
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)

PrimaryButton.displayName = 'PrimaryButton'

export default PrimaryButton
