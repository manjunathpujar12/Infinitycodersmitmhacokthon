import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ label?: string }> = ({ label = 'Loading enterprise records...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-10 h-10 rounded-full bg-sage-50 border border-sage-200 flex items-center justify-center mb-3">
        <Loader2 className="w-5 h-5 text-sage-600 animate-spin" />
      </div>
      <p className="text-xs font-medium text-text-muted">{label}</p>
    </div>
  );
};
