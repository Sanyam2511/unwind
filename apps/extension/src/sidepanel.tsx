import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const SidePanel = () => {
  const [text, setText] = useState<string>('');
  const [simplifiedText, setSimplifiedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchTranslation = async (selectedText: string) => {
    if (!selectedText) return;
    
    setLoading(true);
    setSimplifiedText('');
    setError('');

    const wordCount = selectedText.split(/\s+/).filter(word => word.length > 0).length;
    const mode = wordCount <= 3 ? 'dictionary' : 'translation';

    try {
      const response = await fetch('http://localhost:3000/api/simplify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: selectedText, mode, context: selectedText }),
      });

      if (!response.ok) throw new Error('Failed to fetch translation');

      const data = await response.json();
      setSimplifiedText(data.simplifiedText);
    } catch (err) {
      console.error(err);
      setError("Could not connect to the Unwind backend. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check storage for any text set before the panel was opened
    chrome.storage.local.get(['unwindSelection'], (result: any) => {
      if (result.unwindSelection) {
        setText(result.unwindSelection);
        fetchTranslation(result.unwindSelection);
        // Clear it so we don't re-trigger unnecessarily later
        chrome.storage.local.remove(['unwindSelection']);
      }
    });

    // Listen for live messages from the context menu while the panel is already open
    const messageListener = (message: any) => {
      if (message.type === 'UNWIND_TEXT' && message.text) {
        setText(message.text);
        fetchTranslation(message.text);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  return (
    <div className="p-5 h-screen bg-gray-50 flex flex-col font-sans">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-lg font-bold text-blue-600 tracking-wide uppercase">Unwind Companion</h2>
      </div>

      {!text && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
          <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          <p className="text-sm px-4">Highlight text in a PDF or webpage, right-click, and select <strong>"Unwind Translation"</strong> to see it here.</p>
        </div>
      )}

      {text && (
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl mb-4 border border-red-100 shadow-sm">
              <span className="font-bold block mb-1">Error:</span>
              {error}
            </div>
          )}

          {!error && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Plain English</h3>
              {loading ? (
                <div className="flex items-center gap-3 text-blue-500">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium animate-pulse">Translating complex text...</span>
                </div>
              ) : (
                <p className="text-base text-gray-800 leading-relaxed">{simplifiedText}</p>
              )}
            </div>
          )}

          <div className="bg-gray-100 p-4 rounded-xl">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Original Selection</h3>
             <p className="text-sm text-gray-600 leading-relaxed italic border-l-2 border-gray-300 pl-3">{text}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<SidePanel />);
}
