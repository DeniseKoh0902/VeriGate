import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelAction?: ReactNode;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, labelAction, leftIcon, rightElement, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="w-full">
        {(label || labelAction) && (
          <div className="mb-1.5 flex items-center justify-between">
            {label && (
              <label
                htmlFor={inputId}
                className="text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                {label}
              </label>
            )}
            {labelAction}
          </div>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 flex items-center text-slate-400">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-md border border-slate-300 bg-white py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
              'focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10',
              leftIcon ? 'pl-10' : 'pl-3',
              rightElement ? 'pr-10' : 'pr-3',
              error && 'border-red-400 focus:border-red-400 focus:ring-red-400/10',
              className,
            )}
            {...props}
          />

          {rightElement && (
            <span className="absolute right-3 flex items-center text-slate-400">
              {rightElement}
            </span>
          )}
        </div>

        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
