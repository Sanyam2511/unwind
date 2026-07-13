import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import OcrWorker from './workers/ocrWorker?worker';
import { fetchTranslationFromAPI, summarizePageAPI, sendChatMessageAPI } from './api';
import type { ChatMessage } from './api';
import './index.css';

const SidePanel = () => {
  const [tab, setTab] = useState<'current' | 'library'>('current');
  const [text, setText] = useState<string>('');
  const [simplifiedText, setSimplifiedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);

  // Page Summary State
  const [summaryText, setSummaryText] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);

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
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
        if (namespace === 'local' && changes.unwindHistory) {
            setHistory((changes.unwindHistory.newValue as any[]) || []);
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

  const playAudio = (textToPlay: string) => {
    if (!textToPlay) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToPlay);
    window.speechSynthesis.speak(utterance);
  };

  const summarizePage = async () => {
      setSummaryLoading(true);
      setError('');
      setSummaryText('');
      setSimplifiedText('');
      setText('');

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_PAGE_TEXT' }, async (response) => {
                  if (!response || !response.text) {
                      setSummaryLoading(false);
                      setError("Could not extract text from this page.");
                      return;
                  }

                  chrome.storage.local.get(['readingLevel'], async (result: any) => {
                      const readingLevel = result.readingLevel || '8th Grader';
                      try {
                          const data = await summarizePageAPI(response.text, readingLevel);
                          setSummaryText(data.summary);
                      } catch (err) {
                          console.error(err);
                          setError("Failed to summarize the page.");
                      } finally {
                          setSummaryLoading(false);
                      }
                  });
              });
          } else {
              setSummaryLoading(false);
              setError("No active tab found.");
          }
      });
  };

  const processImage = async (imageUrl: string) => {
      setLoading(true);
      setError('');
      setSummaryText('');
      setText("Scanning image for text...");

      try {
          const worker = new OcrWorker();
          
          worker.onmessage = (e) => {
              const { success, text: extractedText, error } = e.data;
              if (success && extractedText && extractedText.trim().length >= 2) {
                  setText(extractedText.trim());
                  fetchTranslation(extractedText.trim());
              } else {
                  console.error(error);
                  setError(error || "No readable text found in the image.");
                  setLoading(false);
                  setText('');
              }
              worker.terminate();
          };

          worker.onerror = (err) => {
              console.error(err);
              setError("Failed to initialize OCR worker.");
              setLoading(false);
              setText('');
              worker.terminate();
          };

          worker.postMessage({ imageUrl });
      } catch (err) {
          console.error(err);
          setError("Failed to read text from the image.");
          setLoading(false);
          setText('');
      }
  };

  const fetchTranslation = async (selectedText: string) => {
    if (!selectedText) return;
    
    setLoading(true);
    setSimplifiedText('');
    setSummaryText('');
    setError('');
    setChatHistory([]); // Reset chat for new translation

    const wordCount = selectedText.trim().split(/\s+/).length;
    const mode = wordCount <= 3 ? 'dictionary' : 'translation';

    chrome.storage.local.get(['readingLevel'], async (result: any) => {
      const readingLevel = result.readingLevel || '8th Grader';

      try {
        const data = await fetchTranslationFromAPI(selectedText, mode, selectedText, readingLevel);
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
            const data = await sendChatMessageAPI(text, simplifiedText, readingLevel, newChatHistory);
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
    chrome.storage.local.get(['unwindSelection', 'unwindImage'], (result: any) => {
      if (result.unwindSelection) {
        setText(result.unwindSelection);
        setTab('current');
        fetchTranslation(result.unwindSelection);
        chrome.storage.local.remove(['unwindSelection']);
      } else if (result.unwindImage) {
        setTab('current');
        processImage(result.unwindImage);
        chrome.storage.local.remove(['unwindImage']);
      }
    });

    const messageListener = (message: any) => {
      if (message.type === 'UNWIND_TEXT' && message.text) {
        setText(message.text);
        setTab('current');
        fetchTranslation(message.text);
      } else if (message.type === 'UNWIND_IMAGE' && message.imageUrl) {
        setTab('current');
        processImage(message.imageUrl);
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
            <div className="mb-4 shrink-0">
                <button onClick={summarizePage} disabled={summaryLoading || loading} className="w-full py-2.5 bg-black hover:bg-gray-800 text-white font-bold rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    {summaryLoading ? "Summarizing Page..." : "TL;DR Summarize Page"}
                </button>
            </div>

            {!text && !loading && !summaryText && !summaryLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                <p className="text-sm px-4">Highlight text or right-click an image and select <strong>"Unwind"</strong>.</p>
            </div>
            )}

            {error && (
            <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 mb-4 shrink-0">
                <span className="font-bold block mb-1">Error:</span>{error}
            </div>
            )}

            {/* Page Summary View */}
            {summaryText && !error && (
                <div className="flex-1 overflow-y-auto pr-1 pb-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Page Summary</h3>
                            <button onClick={() => playAudio(summaryText)} className="text-gray-400 hover:text-black transition-colors" aria-label="Play audio" title="Listen to summary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                            </button>
                        </div>
                        <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {summaryText}
                        </div>
                    </div>
                </div>
            )}

            {/* Translation View */}
            {text && !summaryText && (
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-4">
                    {!error && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Plain English</h3>
                            {!loading && simplifiedText && (
                                <button onClick={() => playAudio(simplifiedText)} className="text-gray-400 hover:text-black transition-colors" aria-label="Play audio" title="Listen to translation">
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
                            <span className="text-sm font-medium animate-pulse">{text === "Scanning image for text..." ? "Running OCR..." : "Translating..."}</span>
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
