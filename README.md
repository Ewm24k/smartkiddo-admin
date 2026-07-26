# smartkiddo-admin

Technical Handoff Documentation: SmartKiddo Universe Owner Dashboard
This document outlines the architecture, layout, code structure, deployment pipelines, and operational details of the SmartKiddo Universe Owner Dashboard.
1. Project Overview & Features Built
The project consists of a secure administrative portal and an interactive VS Code-style IDE designed for the owner of SmartKiddo Universe. The setup includes:
Administrative Navigation Sidebar: A dark-themed collapsible sidebar containing links to core administrative tools (List User, Statistic), and specialized creator views (T1ERA Studio, websources code).
Interactive Code Workspace (websources code):
VS Code-style File Explorer: A fully interactive, collapsible, and sorted directory tree. Folders stay at the top and root files are grouped together at the bottom.
Visual Code Editor: Features unified typography matching standard developer environments. Text selections, caret positions, and custom vertical scrolling are locked in mathematical alignment. Includes native Tab key indentation (4 spaces) [2].
Background Line Highlights: A secondary layout layer synced to your textarea scroll offsets, rendering horizontal highlight bands over search query matches [2].
Integrated Document Search: Located in the tab header. Uses a safe DOM traversal algorithm to parse raw lines, allowing search lookups of tags, symbols, and spaced terms (like <head> or div id) without corrupting syntax highlighting.
Dynamic Terminal Console: Displays logs of active folder modifications, file open events, speech-to-text transcribing, and remote server transactions.
SmartKiddo AI Agent Panel:
Contextual OpenAI Integration: A proxy connecting to OpenAI's REST template engine using your platform-saved template ID.
Live Token Tracker: Displays prompt tokens, completion tokens, and overall consumption metrics for your session.
LRU (Least Recently Used) Session Cache: Memorizes the contents of the last 3 code files opened or edited during your session, allowing the AI to maintain context-wide awareness of your work without bloating token costs [2].
Multilingual Speech-to-Text Transcription: Uses the Web Speech API to provide continuous Malay (ms-MY) and English (en-US) voice recognition directly into your message bar [2].
2. Project Directory & File Structure
The project separates the static, browser-ready client interface from the secure, credential-managed backend proxy.
code
Text
smartkiddo-verse/ (Main Directory Root)
├── index.html                 # Entry/landing gate portal page
├── dashboard.html             # Main dashboard layout and view container
├── main.py                    # FastAPI Backend Server (Runs on Render)
├── requirements.txt           # Python dependency manifest for Render
└── assets/
    ├── css/
    │   └── style.css          # Core layouts, highlights, editor typography, and chat styles
    └── js/
        ├── script.js          # Core explorer state, scroll syncing, editor, and tabs logic
        └── ai-chat.js         # Speech transcription, OpenAI requests, and session file caching
File Responsibilities
index.html: A static landing page that establishes the brand name SmartKiddo Universe and prompts administrators to enter the secure dashboard environment.
dashboard.html: Defines the structural tab views (view-t1era-studio, view-statistic, view-websources-code), includes deferred dependencies (Tailwind and Prism), and establishes the DOM structure of the editor.
assets/css/style.css: Enforces strict layout parameters [2]. It locks lines to a 20px height and 13px font size to guarantee character synchronization, manages terminal panel heights, and styles markdown components inside chat bubbles [2].
assets/js/script.js: Oversees layout transitions, manages the in-memory virtual directory array, compiles folder collapses, handles line-number generation, and synchronizes coordinates [2]. It also exposes the window.getWorkspaceFileSystem and window.logToTerminal hooks [2].
assets/js/ai-chat.js: Implements the window.onFileOpened(file) event hook [2]. It compiles the 3-file LRU cache, processes speech transcription, parses markdown into clean HTML, and coordinates with Render [2].
main.py: A python FastAPI web service that securely connects with GitHub and OpenAI [1]. It translates nested files into flattened commits, streams binary media through secure raw proxies, and serializes your chat history into string blocks to satisfy OpenAI's platform-prompt schemas [2].
3. Integration & Deployment Flow
The project is hosted across three interconnected services, protecting credentials by isolating secrets from the client.
code
Code
[ GitHub Repo: Ewm24k/smartkiddo-verse ]
    │
    ├──► (Automatic Static Sync) ──► [ Netlify App (Frontend) ]
    │                                    │
    │                                    │ (CORS Requests)
    │                                    ▼
    └──► (Automatic Build Trigger) ──► [ Render Web Service (FastAPI Backend) ]
                                             │
                                             ├──► [ GitHub Git Data API ]
                                             └──► [ OpenAI Platform API ]
1. GitHub (Source Control)
Serves as the central codebase. All static files (.html, .css, .js) and backend files (main.py, requirements.txt) live here.
2. Netlify (Static Hosting)
Hosts your static dashboard assets [1]. It watches your repository, automatically pulls updates, and makes index.html and dashboard.html publicly available on the web under https://smartkiddo-admin.netlify.app [1].
3. Render (Backend Application Server)
Spins up a secure Python environment, installs requirements.txt dependencies, and launches uvicorn main:app on port 10000 [1].
Environment Variables: Secret parameters (GITHUB_TOKEN and OPENAI_API_KEY) are stored in the Render environment and are never exposed to Netlify or the browser [1].
CORS Handling: FastAPI is configured with CORS middleware, allowing safe requests originating from your Netlify domain.
4. AI System & Token Optimization
To optimize costs and performance, the system uses a tailored context-reduction pipeline:
code
Code
[ User asks: "Explain main.py" ]
       │
       ▼
[ Compile Context Payload ]
   ├── Step 1: Read Workspace Tree Manifest (Paths + Line counts only)
   ├── Step 2: Grab LRU Session Cache (Last 3 files contents)
   └── Step 3: Append currently attached file context (if any)
       │
       ▼ (Concatenates to single prompt-ready string)
[ POST Payload to /api/chat ]
       │
       ▼
[ OpenAI platform responses template call ] (Model: gpt-5.4-mini)
Saved Prompt Template Call
The Python service uses the official OpenAI Python SDK to trigger your saved prompt template:
Target Prompt ID: pmpt_6a64c46b5e5c8190bdb0b6f7aacbb7450b1160d1c16e4e6e
Template Requirements: Because the platform template engine expects input as a single string parameter when a prompt ID is used, the backend serializes your conversation history and file text into a unified string block, preventing API-level 400 BadRequestErrors [2].
5. Guide for Future AI Agents (Technical Instructions)
If you are a newly initialized AI agent tasked with modifying or adding features to this codebase, read these rules carefully before editing any file:
1. The Core Architecture Dependencies
Cross-Script Communication: script.js and ai-chat.js run in isolated event closures. They communicate via global variables registered on the window object:
window.getWorkspaceFileSystem(): Used by ai-chat.js to inspect the directory.
window.logToTerminal(msg, type): Used by ai-chat.js to log events in the terminal.
window.onFileOpened(file): Implemented in ai-chat.js and called by script.js to track file opening events and update the LRU session cache [2].
CORS Endpoint Configuration: The frontend refers to the global constant RENDER_BACKEND_URL at the top of the scripts. When deploying or updating, ensure this URL matches your active Render host.
2. Typographic Alignment Constraints (Do Not Break)
If you modify assets/css/style.css or the editor container inside dashboard.html, you must preserve these exact CSS parameters on #editor-textarea, #editor-pre, #editor-highlight-target, and #editor-line-numbers:
font-family must be identical (e.g. 'Fira Code').
font-size must be exactly 13px [2].
line-height must be a fixed pixel value of 20px [2].
padding-top must be exactly 16px [2].
#editor-textarea and #editor-pre must use box-sizing: border-box !important to match geometry [2].
If you alter any of these, character alignment between the visible highlighted code and the invisible typing cursor will break.
3. Rules of Engagement for New Tasks
Never edit files blindly: Always ask the user to show you the current contents of dashboard.html, assets/js/script.js, assets/js/ai-chat.js, or main.py first to verify their state [2].
Zero Placeholders Policy: When updating files, always output the full completed code for that file [2]. Do not use placeholders like // ... rest of the code ... or snippets, as this can break the system [2].
Check Python Imports: If you add modules inside main.py, ensure they are added to requirements.txt and imported correctly to prevent build crashes on Render.
