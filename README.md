# Unwind - Contextual Literacy Engine

## Overview

Unwind is a browser extension designed to act as a real-time translator for complex language on the internet. It instantly converts intimidating jargon, corporate doublespeak, and dense legal or medical text into plain, everyday English directly on the webpage you are reading.

Instead of forcing users to open separate tabs to search for definitions, open dictionaries, or copy-paste pages into search engines, Unwind clarifies difficult text seamlessly via an inline tooltip.

## Architecture

The project follows a scalable client-server architecture:

1. **Frontend Extension (Client):** A Chrome Extension that tracks user text selection and injects a Shadow DOM element to display the translation tooltip. The Shadow DOM ensures that the host page's CSS does not interfere with the extension's UI.
2. **Backend Interceptor (Server):** A Node.js/Express server that handles incoming translation requests. It features a SHA-256 caching layer to prevent duplicate API calls for identical text strings, optimizing performance and reducing external API costs.
3. **AI Engine:** Integration with the Groq API (Llama 3) to process and simplify text with near-zero latency.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS v4, CRXJS
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

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle "Developer mode" on in the top right corner.
3. Click "Load unpacked" in the top left corner.
4. Select the `apps/extension/dist` folder from this repository.

## Usage

1. Ensure the backend server is running locally.
2. Navigate to any web page containing complex text (e.g., a Terms of Service agreement or a medical journal).
3. Use your mouse to highlight a sentence or paragraph.
4. Release the mouse. After a brief delay, the Unwind tooltip will automatically appear below the text, providing a simplified translation.
