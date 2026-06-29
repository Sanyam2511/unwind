import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SidePanel = () => {
  const [tab, setTab] = useState<'current' | 'library'>('current');
  const [text, setText] = useState<string>('');
  const [simplifiedText, setSimplifiedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadHistory = () => {
    chrome.storage.local.get(['unwindHistory'], (result: any) => {
      if (result.unwindHistory) setHistory(result.unwindHistory);
    });
  };

  useEffect(() => {
    loadHistory();
    const storageListener = (changes: any, namespace: string) => {
        if (namespace === 'local' && changes.unwindHistory) {
            setHistory(changes.unwindHistory.newValue || []);
        }
    };
    chrome.storage.onChanged.addListener(storageListener);
    return () => chrome.storage.onChanged.removeListener(storageListener);
  }, []);

  // Auto scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading]);

  const playAudio = () => {
    if (!simplifiedText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(simplifiedText);
    window.speechSynthesis.speak(utterance);
  };

  const fetchTranslation = async (selectedText: string) => {
    if (!selectedText) return;
    
    setLoading(true);
    setSimplifiedText('');
    setError('');
    setChatHistory([]); // Reset chat for new translation

    const wordCount = selectedText.split(/\s+/).filter(word => word.length > 0).length;
    const mode = wordCount <= 3 ? 'dictionary' : 'translation';

    chrome.storage.local.get(['readingLevel'], async (result: any) => {
      const readingLevel = result.readingLevel || '8th Grader';

      try {
        const response = await fetch('http://localhost:3000/api/simplify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: selectedText, mode, context: selectedText, readingLevel }),
        });

        if (!response.ok) throw new Error('Failed to fetch translation');

        const data = await response.json();
        setSimplifiedText(data.simplifiedText);

        const historyItem = { original: selectedText, simplified: data.simplifiedText, mode, timestamp: Date.now() };
        chrome.storage.local.get(['unwindHistory'], (histResult: any) => {
          const currentHistory = histResult.unwindHistory || [];
          const newHistory = [historyItem, ...currentHistory].slice(0, 50);
          chrome.storage.local.set({ unwindHistory: newHistory });
        });
      } catch (err) {
        console.error(err);
        setError("Could not connect to the Unwind backend. Is it running?");
      } finally {
        setLoading(false);
      }
    });
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !simplifiedText) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    const newChatHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: userMessage }];
    setChatHistory(newChatHistory);
    setChatLoading(true);

    chrome.storage.local.get(['readingLevel'], async (result: any) => {
        const readingLevel = result.readingLevel || '8th Grader';
        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    originalText: text, 
                    simplifiedText, 
                    readingLevel, 
                    chatHistory: newChatHistory 
                }),
            });

            if (!response.ok) throw new Error('Chat failed');
            const data = await response.json();
            
            setChatHistory([...newChatHistory, { role: 'assistant', content: data.response }]);
        } catch (err) {
            console.error(err);
            setChatHistory([...newChatHistory, { role: 'assistant', content: "Sorry, I couldn't connect to the server." }]);
        } finally {
            setChatLoading(false);
        }
    });
  };

  useEffect(() => {
    chrome.storage.local.get(['unwindSelection'], (result: any) => {
      if (result.unwindSelection) {
        setText(result.unwindSelection);
        setTab('current');
        fetchTranslation(result.unwindSelection);
        chrome.storage.local.remove(['unwindSelection']);
      }
    });

    const messageListener = (message: any) => {
      if (message.type === 'UNWIND_TEXT' && message.text) {
        setText(message.text);
        setTab('current');
        fetchTranslation(message.text);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  return (
    <div className="p-5 h-screen bg-gray-50 flex flex-col font-sans">
      <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-4 shrink-0">
        <h2 className="text-xl font-extrabold text-black tracking-tight uppercase">Unwind</h2>
        
        <div className="flex bg-gray-200 p-1 rounded-lg">
            <button 
                onClick={() => setTab('current')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${tab === 'current' ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Companion
            </button>
            <button 
                onClick={() => setTab('library')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${tab === 'library' ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Library
            </button>
        </div>
      </div>

      {tab === 'current' && (
        <>
            {!text && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                <p className="text-sm px-4">Highlight text, right-click, and select <strong>"Unwind Translation"</strong> to see it here.</p>
            </div>
            )}

            {text && (
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-4">
                    {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                        <span className="font-bold block mb-1">Error:</span>{error}
                    </div>
                    )}

                    {!error && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Plain English</h3>
                            {!loading && simplifiedText && (
                                <button onClick={playAudio} className="text-gray-400 hover:text-black transition-colors" aria-label="Play audio" title="Listen to translation">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                                </button>
                            )}
                        </div>
                        {loading ? (
                        <div className="flex items-center gap-3 text-black">
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm font-medium animate-pulse">Translating...</span>
                        </div>
                        ) : (
                        <p className="text-base text-gray-800 leading-relaxed">{simplifiedText}</p>
                        )}
                    </div>
                    )}

                    <div className="bg-gray-100 p-4 rounded-xl shrink-0">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Original</h3>
                        <p className="text-sm text-gray-600 leading-relaxed italic border-l-2 border-gray-300 pl-3 line-clamp-4">{text}</p>
                    </div>

                    {/* Chat History */}
                    {chatHistory.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-gray-200">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tutor Chat</h3>
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`p-3 rounded-xl max-w-[90%] text-sm ${msg.role === 'user' ? 'bg-black text-white self-end ml-auto' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                                    {msg.content}
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="p-3 rounded-xl max-w-[90%] text-sm bg-gray-100 text-gray-500 border border-gray-200 animate-pulse w-16">
                                    ...
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    )}
                </div>

                {/* Chat Input */}
                {!loading && simplifiedText && (
                    <form onSubmit={sendChatMessage} className="mt-2 shrink-0 relative">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask a follow-up question..."
                            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-full focus:ring-black focus:border-black block px-4 py-3 pr-10 shadow-sm outline-none transition-all"
                            disabled={chatLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={!chatInput.trim() || chatLoading}
                            className="absolute right-2 top-1.5 p-1.5 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-black transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                )}
            </div>
            )}
        </>
      )}

      {tab === 'library' && (
          <div className="flex-1 overflow-y-auto pr-1 pb-4">
              {history.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">
                      <p className="text-sm">Your library is empty.</p>
                  </div>
              ) : (
                  <div className="space-y-4">
                      {history.map((item, index) => (
                          <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded">
                                    {item.mode}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    {new Date(item.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800 font-medium mb-3">{item.simplified}</p>
                              <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2 line-clamp-3">{item.original}</p>
                          </div>
                      ))}
                  </div>
              )}
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
