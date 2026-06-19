import React from 'react';
import { AlertCircle, AlertTriangle, RefreshCcw } from 'lucide-react';

export function WidgetEmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#010101] rounded-2xl border border-white/5">
      <AlertCircle className="w-8 h-8 text-gray-500 mb-3" />
      <h3 className="text-white font-medium">{title}</h3>
      {message && <p className="text-gray-400 text-sm mt-1">{message}</p>}
    </div>
  );
}

export function WidgetErrorState({ title, message, onRetry }: { title: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#010101] rounded-2xl border border-white/5">
      <AlertTriangle className="w-8 h-8 text-red-500 mb-3" />
      <h3 className="text-white font-medium">{title}</h3>
      {message && <p className="text-gray-400 text-sm mt-1">{message}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-4 flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
          <RefreshCcw className="w-4 h-4" /> Try again
        </button>
      )}
    </div>
  );
}
