import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { TranslationTooltip } from './TranslationTooltip';
// Import CSS inline to inject into Shadow DOM
import cssText from './index.css?inline';

console.log("Unwind Extension Content Script Loaded.");

// Create the host element for the Shadow DOM
const hostElement = document.createElement('div');
hostElement.id = 'unwind-extension-host';
// Set high z-index and absolute positioning to avoid disrupting the page layout
Object.assign(hostElement.style, {
  position: 'absolute',
  top: '0',
  left: '0',
  zIndex: '2147483647',
  pointerEvents: 'none', // Let clicks pass through to the underlying page
});
document.body.appendChild(hostElement);

// Attach the Shadow DOM
const shadowRoot = hostElement.attachShadow({ mode: 'open' });

// Inject Tailwind styles into the Shadow DOM
const styleElement = document.createElement('style');
styleElement.textContent = cssText;
shadowRoot.appendChild(styleElement);

// Create the container for React to mount into
const reactRootContainer = document.createElement('div');
reactRootContainer.style.pointerEvents = 'auto'; // Re-enable pointer events for the React components
shadowRoot.appendChild(reactRootContainer);

// Create the React root
const root = createRoot(reactRootContainer);

// The main App component that manages the state of the tooltip
const ContentApp = () => {
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
    loading: boolean;
    simplifiedText?: string;
    error?: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    loading: false,
  });

  const fetchTranslation = async (text: string, mode: 'translation' | 'dictionary', context: string, readingLevel: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/simplify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, mode, context, readingLevel }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch translation from server');
      }

      const data = await response.json();
      
      setTooltipState(prev => ({
        ...prev,
        loading: false,
        simplifiedText: data.simplifiedText,
      }));

      // Save to history
      const historyItem = {
        original: text,
        simplified: data.simplifiedText,
        mode,
        timestamp: Date.now()
      };
      chrome.storage.local.get(['unwindHistory'], (result: any) => {
        const currentHistory = result.unwindHistory || [];
        // Keep only last 50 to avoid storage limits
        const newHistory = [historyItem, ...currentHistory].slice(0, 50);
        chrome.storage.local.set({ unwindHistory: newHistory });
      });
    } catch (err) {
      console.error("Unwind API Error:", err);
      setTooltipState(prev => ({
        ...prev,
        loading: false,
        error: "Could not connect to the Unwind server. Is the local backend running?",
      }));
    }
  };

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;

    const handleMouseUp = () => {
      clearTimeout(debounceTimer);
      
      debounceTimer = setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        if (selectedText && selectedText.length > 2) {
          // Determine mode based on word count
          const wordCount = selectedText.split(/\s+/).filter(word => word.length > 0).length;
          const mode = wordCount <= 3 ? 'dictionary' : 'translation';

          // Extract surrounding context
          let context = selectedText;
          if (selection && selection.anchorNode && selection.anchorNode.textContent) {
              context = selection.anchorNode.textContent.trim();
          }

          // Calculate where to place the tooltip
          const range = selection?.getRangeAt(0);
          if (range) {
            const rect = range.getBoundingClientRect();
            // Position it below the selection
            const x = rect.left + window.scrollX;
            const y = rect.bottom + window.scrollY + 10;
            
            setTooltipState({
              visible: true,
              x,
              y,
              text: selectedText,
              loading: true,
              simplifiedText: undefined,
              error: undefined,
            });

            // Trigger the API call with reading level
            chrome.storage.local.get(['readingLevel'], (result: any) => {
                const currentLevel = result.readingLevel || '8th Grader';
                fetchTranslation(selectedText, mode, context, currentLevel);
            });
          }
        }
      }, 500); // 500ms debounce
    };

    const handleMouseDown = (event: MouseEvent) => {
      // If the user clicks outside the tooltip (which is outside the shadow DOM bounds normally)
      // We can just close it if they start a new selection
      if (event.target !== hostElement) {
        setTooltipState(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
      clearTimeout(debounceTimer);
    };
  }, []);

  if (!tooltipState.visible) return null;

  return (
    <TranslationTooltip 
      x={tooltipState.x} 
      y={tooltipState.y} 
      text={tooltipState.text} 
      simplifiedText={tooltipState.simplifiedText}
      loading={tooltipState.loading}
      error={tooltipState.error}
      onClose={() => setTooltipState(prev => ({ ...prev, visible: false }))} 
    />
  );
};

root.render(<ContentApp />);
