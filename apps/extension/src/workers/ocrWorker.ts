import Tesseract from 'tesseract.js';

self.onmessage = async (e: MessageEvent) => {
    const { imageUrl } = e.data;
    if (!imageUrl) return;

    try {
        const { data: { text: extractedText } } = await Tesseract.recognize(imageUrl, 'eng');
        self.postMessage({ success: true, text: extractedText });
    } catch (error: any) {
        self.postMessage({ success: false, error: error.message || 'OCR failed' });
    }
};
