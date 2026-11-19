'use client';

import { forwardRef, HTMLAttributes, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = 'md', src, alt, children, ...props }, ref) => {
    const sizes = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
      xl: 'w-16 h-16 text-lg',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-primary/10 text-primary font-medium flex-shrink-0 overflow-hidden',
          sizes[size],
          className
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || ''}
            className="w-full h-full object-cover"
          />
        ) : (
          children || <span className="font-medium">?</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

interface AvatarImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, size = 'md', ...props }, ref) => {
    const sizes = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16',
    };

    return (
      <img
        ref={ref}
        className={cn('rounded-full object-cover', sizes[size], className)}
        {...props}
      />
    );
  }
);

AvatarImage.displayName = 'AvatarImage';

interface AvatarFallbackProps extends HTMLAttributes<HTMLSpanElement> {
  delay?: number;
}

export const AvatarFallback = forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, delay = 0, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)}
        {...props}
      />
    );
  }
);

AvatarFallback.displayName = 'AvatarFallback';

export default Avatar;