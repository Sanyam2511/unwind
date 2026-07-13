export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const fetchTranslationFromAPI = async (text: string, mode: 'translation' | 'dictionary', context: string, readingLevel: string) => {
    const response = await fetch(`${API_BASE_URL}/api/simplify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, mode, context, readingLevel }),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch translation from server');
    }

    return response.json();
};

export const summarizePageAPI = async (text: string, readingLevel: string) => {
    const response = await fetch(`${API_BASE_URL}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, readingLevel }),
    });

    if (!response.ok) {
        throw new Error('Summary failed');
    }

    return response.json();
};

export const sendChatMessageAPI = async (originalText: string, simplifiedText: string, readingLevel: string, chatHistory: ChatMessage[]) => {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            originalText, 
            simplifiedText, 
            readingLevel, 
            chatHistory 
        }),
    });

    if (!response.ok) {
        throw new Error('Chat failed');
    }

    return response.json();
};
