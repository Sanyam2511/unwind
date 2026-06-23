import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory cache: Hash -> { originalText, simplifiedText }
const mockDatabase = new Map();

// Mock Sanitization
function sanitizeText(text) {
    // Basic regex to mock removing emails or SSNs
    let sanitized = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
    sanitized = sanitized.replace(/\d{3}-\d{2}-\d{4}/g, '[SSN REDACTED]');
    return sanitized;
}

// Generate SHA-256 hash
function generateHash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

// Endpoint to translate text
app.post('/api/simplify', async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    const hash = generateHash(text);

    // 1. Check Database (Cache)
    if (mockDatabase.has(hash)) {
        console.log(`[CACHE HIT] Serving from memory for hash: ${hash}`);
        return res.json({
            success: true,
            source: 'cache',
            originalText: text,
            simplifiedText: mockDatabase.get(hash).simplifiedText
        });
    }

    console.log(`[CACHE MISS] Generating new translation for hash: ${hash}`);
    
    // 2. Sanitize Data
    const sanitizedText = sanitizeText(text);

    // 3. Call AI API (Mocked for now)
    // Here we would use Groq or Gemini. For now, we simulate a delay and return mock data.
    const mockSimplifiedText = `[Mock AI Translation] This means you are agreeing to standard terms without complicated jargon. Original snippet length: ${sanitizedText.length} chars.`;
    
    // Simulate AI API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // 4. Save to Database (Cache)
    mockDatabase.set(hash, {
        originalText: text,
        simplifiedText: mockSimplifiedText
    });

    // 5. Serve Response
    res.json({
        success: true,
        source: 'ai',
        originalText: text,
        simplifiedText: mockSimplifiedText
    });
});

app.listen(PORT, () => {
    console.log(`Unwind Server running on http://localhost:${PORT}`);
});
