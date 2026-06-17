import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TagVariant = 'default' | 'farm' | 'soil' | 'wheat' | 'sky' | 'success' | 'warning' | 'danger' | 'info';
type TagSize = 'sm' | 'md';

interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  size?: TagSize;
  className?: string;
}

const variants: Record<TagVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  farm: 'bg-farm-100 text-farm-700',
  soil: 'bg-soil-100 text-soil-700',
  wheat: 'bg-wheat-100 text-wheat-700',
  sky: 'bg-sky-100 text-sky-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

const sizes: Record<TagSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export default function Tag({
  children,
  variant = 'default',
  size = 'md',
  className,
}: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
