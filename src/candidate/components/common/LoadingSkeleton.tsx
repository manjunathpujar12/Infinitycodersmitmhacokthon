import React from 'react';

export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const items = Array.from({ length: count });

  return (
    <div className="space-y-4 animate-pulse">
      {items.map((_, i) => (
        <div key={i} className="bg-cards p-5 rounded-2xl border border-borderMuted space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-borderMuted/80 rounded w-1/3"></div>
            <div className="h-4 bg-borderMuted/60 rounded w-16"></div>
          </div>
          <div className="h-3 bg-borderMuted/50 rounded w-3/4"></div>
          <div className="h-8 bg-borderMuted/40 rounded w-full"></div>
        </div>
      ))}
    </div>
  );
};

