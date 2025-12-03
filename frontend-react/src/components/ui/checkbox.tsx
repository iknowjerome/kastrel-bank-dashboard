import * as React from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          'peer h-5 w-5 shrink-0 rounded-md border border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground transition-colors',
          checked && 'bg-primary border-primary text-primary-foreground',
          className
        )}
        data-state={checked ? 'checked' : 'unchecked'}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {checked && (
          <Check className="h-4 w-4 mx-auto" />
        )}
      </button>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }

