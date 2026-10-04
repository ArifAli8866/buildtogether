import * as React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({
  src,
  alt = 'Avatar',
  fallbackText,
  size = 'md',
  className,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg font-semibold',
    xl: 'h-24 w-24 text-2xl font-bold',
  };

  const pixelDimensions = {
    sm: 32,
    md: 40,
    lg: 64,
    xl: 96,
  };

  const getInitials = (text?: string) => {
    if (!text) return '?';
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const showImage = Boolean(src) && !imageError;

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-app-surface-2 text-content-secondary select-none',
        sizes[size],
        className
      )}
      {...props}
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          width={pixelDimensions[size]}
          height={pixelDimensions[size]}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
          unoptimized
        />
      ) : (
        <span className="font-medium tracking-tight">
          {getInitials(fallbackText || alt)}
        </span>
      )}
    </div>
  );
}
