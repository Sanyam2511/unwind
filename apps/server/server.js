import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import sqlite3 from 'sqlite3';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Rate Limiting
// Limit each IP to 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiting to all /api/ routes
app.use('/api/', limiter);

// Security: CORS Configuration
// In production, you would restrict this to your extension's origin
const corsOptions = {
    origin: '*', // For development. E.g., 'chrome-extension://<your-extension-id>'
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Database Setup: SQLite for persistent caching
const db = new sqlite3.Database('./cache.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS cache (
            hash TEXT PRIMARY KEY,
            originalText TEXT,
            simplifiedText TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('SQLite database initialized for caching.');
    }
});

function getFromCache(hash) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM cache WHERE hash = ?', [hash], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function saveToCache(hash, originalText, simplifiedText) {
    db.run(
        'INSERT OR REPLACE INTO cache (hash, originalText, simplifiedText) VALUES (?, ?, ?)',
        [hash, originalText, simplifiedText],
        (err) => {
            if (err) console.error('Error saving to cache:', err.message);
        }
    );
}

function sanitizeText(text) {
    if (!text) return '';
    let sanitized = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
    sanitized = sanitized.replace(/\d{3}-\d{2}-\d{4}/g, '[SSN REDACTED]');
    return sanitized.trim();
}

function generateHash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

app.post('/api/simplify', async (req, res) => {
    const { text, mode = 'translation', context = '', readingLevel = '8th Grader' } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    const hash = generateHash(readingLevel + ":" + mode + ":" + text);

    try {
        // 1. Check Cache
        const cachedResult = await getFromCache(hash);
        if (cachedResult) {
            return res.json({
                success: true,
                source: 'cache',
                originalText: text,
                simplifiedText: cachedResult.simplifiedText
            });
        }

        // 2. Sanitize Data
        const sanitizedText = sanitizeText(text);
        const sanitizedContext = sanitizeText(context);

        let systemPrompt = "You are the 'Contextual Literacy Engine', an expert at translating dense legal, medical, financial, or corporate jargon into simple, plain English that an 8th grader can understand. Your output will be displayed in a tiny tooltip hovering over text. Be extremely concise. Do not use pleasantries. Do not start with 'This means'. Just output the direct, plain English translation of the user's text.";

        if (readingLevel === "Explain Like I'm 5") {
            systemPrompt = "You are an expert at explaining incredibly complex concepts to a 5-year-old child. Translate the provided text into extremely basic language, using simple analogies where helpful. Your output will be displayed in a tiny tooltip. Be concise. Do not use pleasantries. Just output the translation.";
        } else if (readingLevel === "Professional") {
            systemPrompt = "You are an expert analyst. Provide a highly concise, professional summary of the text without losing critical nuances or industry terms. Your output will be displayed in a tiny tooltip. Be direct. Do not use pleasantries. Just output the summary.";
        }

        let userPrompt = sanitizedText;

        if (mode === 'dictionary') {
            systemPrompt = `You are the 'Contextual Dictionary Engine'. The user will provide a specific word or short phrase, followed by the surrounding sentence for context. Your job is to provide a very brief, simple definition of that word exactly as it is being used in that specific context (Target Audience Level: ${readingLevel}). Be extremely concise. Do not use pleasantries. Just output the definition.`;
            userPrompt = `Word/Phrase: "${sanitizedText}"\n\nContext Sentence: "${sanitizedContext}"`;
        }

        // 3. Call AI API
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 150,
        });

        const simplifiedText = chatCompletion.choices[0]?.message?.content || "Translation failed.";

        // 4. Save to Cache
        saveToCache(hash, text, simplifiedText);

        // 5. Serve Response
        res.json({
            success: true,
            source: 'ai',
            originalText: text,
            simplifiedText: simplifiedText
        });

    } catch (error) {
        console.error("❌ Groq API Error:", error);
        res.status(500).json({ error: 'Failed to simplify text' });
    }
});

app.post('/api/chat', async (req, res) => {
    const { originalText, simplifiedText, readingLevel = '8th Grader', chatHistory = [] } = req.body;
    
    if (!originalText || !chatHistory.length) {
        return res.status(400).json({ error: 'Missing required chat parameters' });
    }

    const systemPrompt = `You are the Unwind Tutor. The user is asking follow-up questions about a confusing text they just translated.
Original Text: "${sanitizeText(originalText)}"
Simplified Translation: "${sanitizeText(simplifiedText)}"
Target Audience Level: ${readingLevel}

Answer their questions clearly, concisely, and directly. Do not use pleasantries. Match your vocabulary to the target audience level.`;

    try {
        const messages = [
            { role: "system", content: systemPrompt },
            ...chatHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: sanitizeText(msg.content)
            }))
        ];

        const chatCompletion = await groq.chat.completions.create({
            messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 500
        });

        res.json({ response: chatCompletion.choices[0]?.message?.content || "" });
    } catch (error) {
        console.error("Groq Chat API Error:", error);
        res.status(500).json({ error: 'Failed to generate chat response' });
    }
});

app.post('/api/summarize', async (req, res) => {
    const { text, readingLevel = '8th Grader' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const systemPrompt = `You are the Unwind Page Summarizer. Your goal is to take the provided webpage text and generate a highly concise, 3-bullet point "TL;DR" summary.
Target Audience Level: ${readingLevel}

Use plain language appropriate for the audience level. Do not use pleasantries. Output exactly 3 bullet points starting with standard markdown dashes (-).`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: sanitizeText(text) }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            max_tokens: 400
        });

        res.json({ summary: chatCompletion.choices[0]?.message?.content || "" });
    } catch (error) {
        console.error("Groq Summarize API Error:", error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

app.listen(PORT, () => {
    console.log(`Unwind Server running on http://localhost:${PORT}`);
    console.log(`Using Groq API: ${process.env.GROQ_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
});
