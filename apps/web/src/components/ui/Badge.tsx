'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-primary/10 text-primary hover:bg-primary/20',
      secondary: 'bg-secondary/10 text-secondary hover:bg-secondary/20',
      destructive: 'bg-glucose-very-low/10 text-glucose-very-low hover:bg-glucose-very-low/20',
      outline: 'border border-border bg-transparent hover:bg-surface-soft',
      success: 'bg-glucose-in-range/10 text-glucose-in-range hover:bg-glucose-in-range/20',
      warning: 'bg-glucose-high/10 text-glucose-high hover:bg-glucose-high/20',
      info: 'bg-primary/10 text-primary hover:bg-primary/20',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
      lg: 'px-3 py-1 text-sm',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;