# Unwind - Contextual Literacy Engine

> **Check out the extension in action!**  
> ![Demo Video/GIF Placeholder](https://via.placeholder.com/800x400?text=Insert+Demo+GIF+Here)  
> *(Replace the image link above with a short screen recording or GIF of the extension working)*

## Overview

Unwind is a browser extension designed to act as a real-time translator for complex language on the internet. It instantly converts intimidating jargon, corporate doublespeak, and dense legal or medical text into plain, everyday English directly on the webpage you are reading.

Instead of forcing users to open separate tabs to search for definitions, open dictionaries, or copy-paste pages into search engines, Unwind clarifies difficult text seamlessly via inline tooltips and an interactive Companion Side Panel.

## Features

- **Contextual Translation Tooltip:** Highlight any dense paragraph and instantly see a plain English translation hover right above it.
- **Contextual Dictionary:** Highlight a single word (1-3 words), and Unwind will define it exactly as it's being used in that specific sentence context.
- **Reading Level Slider:** Adjust the AI's vocabulary output. Choose between "Explain Like I'm 5", "8th Grader", or "Professional".
- **Tutor Mode (Interactive Chat):** Have follow-up questions about a translation? Ask the AI Tutor directly in the Side Panel, and it will respond based on the context of the text you just read.
- **Text-to-Speech (Audio Reader):** Click the speaker icon to have the browser read the simplified translation out loud to you.
- **TL;DR Page Summarizer:** Click one button to instantly generate a concise, 3-bullet point summary of an entire web page.
- **Image Text Recognition (OCR):** Right-click any image on the web and select "Unwind Image Text" to extract and simplify the text locked inside the pixels.
- **Unwind Library:** Access your history of past translations and definitions locally in the Side Panel.

## Architecture

The project follows a scalable client-server architecture:

1. **Frontend Extension (Client):** A Chrome Extension that tracks user text selection and injects a Shadow DOM element to display the translation tooltip. It also utilizes Chrome's Side Panel API for advanced features (Chat, TL;DR, OCR).
2. **Backend Interceptor (Server):** A Node.js/Express server that handles incoming translation, chat, and summarization requests. It features a SHA-256 caching layer to prevent duplicate API calls for identical text strings.
3. **AI Engine:** Integration with the Groq API (Llama 3) to process and simplify text with near-zero latency.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS v4, CRXJS, Tesseract.js (OCR)
- **Backend:** Node.js, Express, Crypto (SHA-256 Hashing)
- **AI Integration:** Groq SDK

## Installation & Setup

### Prerequisites

Ensure you have Node.js (v18 or higher) and npm installed on your local machine. You will also need a free Groq API key.

### 1. Backend Setup

1. Navigate to the server directory:
   ```bash
   cd apps/server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `apps/server` directory and add your API key:
   ```env
   PORT=3000
   GROQ_API_KEY=your_groq_api_key_here
   ```
4. Start the backend server:
   ```bash
   npm start
   ```

### 2. Frontend Setup

1. Open a new terminal and navigate to the extension directory:
   ```bash
   cd apps/extension
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
   *Note: For active development with hot-reloading, you can run `npm run dev` instead.*

### 3. Loading the Extension in Chrome

**Note for Portfolio Reviewers:** This extension is currently distributed for free via GitHub Developer Mode.

1. **Clone or Download** this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle "Developer mode" on in the top right corner.
3. Click "Load unpacked" in the top left corner.
4. Select the `apps/extension/dist` folder from this repository.

## Usage

1. Ensure the backend server is running locally.
2. Navigate to any web page containing complex text.
3. **To Translate:** Highlight a sentence or paragraph and wait a moment for the tooltip, or right-click and select "Unwind Translation" to open the Companion Side Panel.
4. **To Summarize:** Open the Side Panel and click "TL;DR Summarize Page".
5. **To Read Images:** Right-click any image and select "Unwind Image Text".

## Future Roadmap

- ☁️ **Cloud Database:** Migrate local cache to MongoDB Atlas.
- 🌍 **Multi-Language Support:** Allow translating jargon directly into other languages.
- 📊 **Literacy Analytics:** Track words read and time saved in a user dashboard.
