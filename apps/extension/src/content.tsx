import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // This will import Tailwind

// We inject a div into the body where we will render our React component
const container = document.createElement('div');
container.id = 'unwind-extension-root';
// TODO: Use Shadow DOM here in the future
document.body.appendChild(container);

const ContentApp = () => {
  return null; // For now, we just render nothing until text is highlighted
};

const root = createRoot(container);
root.render(<ContentApp />);

console.log("Unwind Extension Content Script Loaded.");

// Debounce timer for capturing selection
let debounceTimer: ReturnType<typeof setTimeout>;

document.addEventListener('mouseup', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const selectedText = window.getSelection()?.toString().trim();
        if (selectedText && selectedText.length > 10) {
            console.log("Unwind captured text:", selectedText);
            // Future: Show tooltip, Hash text, Check DB, etc.
        }
    }, 500); // 500ms debounce
});
