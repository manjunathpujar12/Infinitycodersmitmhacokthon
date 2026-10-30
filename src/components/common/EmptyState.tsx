import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border p-12 text-center bg-card/60 flex flex-col items-center justify-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-sidebar border border-border flex items-center justify-center text-text-subtle mb-4 shadow-warm-sm">
        <Icon className="w-6 h-6 stroke-[1.6]" />
      </div>
      <h4 className="text-base font-semibold text-text-main font-sans">
        {title}
      </h4>
      <p className="text-sm text-text-muted mt-1 max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2 bg-sage-500 hover:bg-sage-600 text-white rounded-lg text-xs font-semibold shadow-warm transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
