import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-cards rounded-2xl border border-dashed border-borderDark/80 my-4">
      <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center text-primary mb-3.5">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-textPrimary">{title}</h3>
      <p className="text-xs text-textMuted max-w-sm mt-1 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover transition-colors shadow-subtle"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

