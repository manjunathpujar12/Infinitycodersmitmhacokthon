import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'sage' | 'terracotta' | 'success' | 'warning' | 'error' | 'neutral' | 'blue';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}) => {
  const variantStyles = {
    sage: 'bg-primary-light text-primary-dark border-primary/30',
    terracotta: 'bg-secondary-light text-secondary-dark border-secondary/30',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
    neutral: 'bg-[#F2F3EC] text-textPrimary border-borderMuted',
    blue: 'bg-sky-50 text-sky-800 border-sky-200'
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded font-medium',
    md: 'text-xs px-2.5 py-1 rounded-md font-semibold'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border leading-none tracking-wide ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

