import { useState, useEffect } from 'react';
import './index.css'; // Make sure Tailwind is imported

function App() {
  const [readingLevel, setReadingLevel] = useState('8th Grader');

  useEffect(() => {
    // Load saved reading level on mount
    chrome.storage.local.get(['readingLevel'], (result: any) => {
      if (result.readingLevel) {
        setReadingLevel(result.readingLevel);
      }
    });
  }, []);

  const handleLevelChange = (level: string) => {
    setReadingLevel(level);
    chrome.storage.local.set({ readingLevel: level });
  };

  const levels = [
    { id: 'Explain Like I\'m 5', description: 'Maximum simplicity and analogies' },
    { id: '8th Grader', description: 'Clear, plain English (Default)' },
    { id: 'Professional', description: 'Concise summary for experts' }
  ];

  return (
    <div className="w-80 p-5 bg-white font-sans text-gray-900 border border-gray-100">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-3">
        <h1 className="text-xl font-extrabold text-black tracking-tight">Unwind</h1>
      </div>

      <div className="mb-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Reading Level</h2>
        <div className="space-y-3">
          {levels.map((level) => (
            <div 
              key={level.id}
              onClick={() => handleLevelChange(level.id)}
              className={`p-3 rounded-lg cursor-pointer border transition-all duration-200 ${
                readingLevel === level.id 
                  ? 'bg-gray-50 border-black shadow-sm ring-1 ring-black' 
                  : 'bg-white border-gray-200 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-semibold ${readingLevel === level.id ? 'text-black' : 'text-gray-600'}`}>
                  {level.id}
                </span>
                {readingLevel === level.id && (
                  <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-500">{level.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-center mt-6 text-xs text-gray-400 font-medium tracking-wide uppercase">
        Changes are saved automatically.
      </div>
    </div>
  );
}

export default App;
