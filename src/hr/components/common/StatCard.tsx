import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accentColor?: 'sage' | 'terracotta' | 'neutral';
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'sage',
  onClick,
  className,
}) => {
  const iconColors = {
    sage: 'bg-sage-50 text-sage-600 border-sage-200',
    terracotta: 'bg-terracotta-50 text-terracotta-600 border-terracotta-200',
    neutral: 'bg-sidebar text-text-muted border-border',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group bg-card rounded-xl p-5 border border-border shadow-warm hover:shadow-warm-md transition-all duration-200 relative overflow-hidden',
        onClick && 'cursor-pointer hover:border-sage-300',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-text-muted">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-text-main mt-1.5 tracking-tight font-sans">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  'text-xs font-semibold px-1.5 py-0.5 rounded',
                  trend.isPositive
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-rose-700 bg-rose-50'
                )}
              >
                {trend.value}
              </span>
              <span className="text-[11px] text-text-subtle">vs target</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-11 h-11 rounded-lg flex items-center justify-center border shadow-warm-sm group-hover:scale-105 transition-transform',
            iconColors[accentColor]
          )}
        >
          <Icon className="w-5 h-5 stroke-[1.8]" />
        </div>
      </div>
    </div>
  );
};
