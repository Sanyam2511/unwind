import React from 'react';

interface TranslationTooltipProps {
  x: number;
  y: number;
  text: string;
  onClose: () => void;
}

export const TranslationTooltip: React.FC<TranslationTooltipProps> = ({ x, y, text, onClose }) => {
  return (
    <div
      className="fixed z-[999999] w-80 bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl p-5 text-gray-800 font-sans animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-bold tracking-wide text-blue-600 uppercase">Contextual Literacy</h3>
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
      
      <p className="text-sm leading-relaxed mb-4">
        <span className="font-semibold">Mock Translation:</span> This is where the simplified, plain-English version of your highlighted text will appear.
      </p>
      
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 max-h-24 overflow-y-auto">
        <span className="font-semibold block mb-1">Original selection:</span>
        {text}
      </div>
    </div>
  );
};
