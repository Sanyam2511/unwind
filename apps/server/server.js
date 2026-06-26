import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory cache: Hash -> { originalText, simplifiedText }
const mockDatabase = new Map();

// Mock Sanitization
function sanitizeText(text) {
    let sanitized = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
    sanitized = sanitized.replace(/\d{3}-\d{2}-\d{4}/g, '[SSN REDACTED]');
    return sanitized;
}

function generateHash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

app.post('/api/simplify', async (req, res) => {
    const { text, mode = 'translation', context = '' } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    const hash = generateHash(mode + ":" + text);

    // 1. Check Cache
    if (mockDatabase.has(hash)) {
        console.log(`⚡ [CACHE HIT] Hash: ${hash.substring(0, 8)}... - Returned instantly (0ms)`);
        return res.json({
            success: true,
            source: 'cache',
            originalText: text,
            simplifiedText: mockDatabase.get(hash).simplifiedText
        });
    }

    console.log(`⏳ [CACHE MISS] Hash: ${hash.substring(0, 8)}... - Requesting translation from Groq...`);
    
    // 2. Sanitize Data
    const sanitizedText = sanitizeText(text);
    const sanitizedContext = sanitizeText(context);

    let systemPrompt = "You are the 'Contextual Literacy Engine', an expert at translating dense legal, medical, financial, or corporate jargon into simple, plain English that an 8th grader can understand. Your output will be displayed in a tiny tooltip hovering over text. Be extremely concise. Do not use pleasantries. Do not start with 'This means'. Just output the direct, plain English translation of the user's text.";
    let userPrompt = sanitizedText;

    if (mode === 'dictionary') {
        systemPrompt = "You are the 'Contextual Dictionary Engine'. The user will provide a specific word or short phrase, followed by the surrounding sentence for context. Your job is to provide a very brief, simple definition of that word exactly as it is being used in that specific context. Be extremely concise. Do not use pleasantries. Just output the definition.";
        userPrompt = `Word/Phrase: "${sanitizedText}"\n\nContext Sentence: "${sanitizedContext}"`;
    }

    try {
        // 3. Call AI API
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 150,
        });

        const simplifiedText = chatCompletion.choices[0]?.message?.content || "Translation failed.";

        // 4. Save to Cache
        mockDatabase.set(hash, {
            originalText: text,
            simplifiedText: simplifiedText
        });

        // 5. Serve Response
        res.json({
            success: true,
            source: 'ai',
            originalText: text,
            simplifiedText: simplifiedText
        });

    } catch (error) {
        console.error("❌ Groq API Error:", error);
        res.status(500).json({ error: "Failed to generate translation from AI provider." });
    }
});

app.listen(PORT, () => {
    console.log(`Unwind Server running on http://localhost:${PORT}`);
    console.log(`Using Groq API: ${process.env.GROQ_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
});
