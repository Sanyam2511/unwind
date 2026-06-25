import React from 'react';

interface TranslationTooltipProps {
  x: number;
  y: number;
  text: string;
  simplifiedText?: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
}

export const TranslationTooltip: React.FC<TranslationTooltipProps> = ({ 
  x, y, text, simplifiedText, loading, error, onClose 
}) => {
  return (
    <div
      className="absolute z-[999999] w-80 bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl p-5 text-gray-800 font-sans animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-bold tracking-wide text-blue-600 uppercase flex items-center gap-2">
          Contextual Literacy
          {loading && (
            <svg className="animate-spin h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      {error ? (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4 border border-red-100">
          <span className="font-semibold block mb-1">Error:</span>
          {error}
        </div>
      ) : (
        <p className="text-sm leading-relaxed mb-4 min-h-[40px]">
          {loading ? (
            <span className="text-gray-400 animate-pulse">Translating complex text into plain English...</span>
          ) : (
            <>
              <span className="font-semibold text-gray-900 block mb-1">Plain English:</span> 
              <span className="text-gray-700">{simplifiedText}</span>
            </>
          )}
        </p>
      )}
      
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 max-h-24 overflow-y-auto">
        <span className="font-semibold block mb-1 text-gray-400">Original selection:</span>
        <span className="line-clamp-3">{text}</span>
      </div>
    </div>
  );
};
