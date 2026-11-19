'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
  hint?: string;
  errorMessage?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, label, hint, errorMessage, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium mb-1">
            {props.required && <span className="text-glucose-very-low ml-1" aria-hidden="true">*</span>}
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'input',
            error && 'border-glucose-very-low focus:border-glucose-very-low focus:ring-glucose-very-low/20',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(error && errorId, hint && hintId)}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
          ref={ref}
        />
        {error && errorMessage && (
          <p id={errorId} className="mt-1 text-sm text-glucose-very-low" role="alert">
            {errorMessage}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1 text-sm text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;