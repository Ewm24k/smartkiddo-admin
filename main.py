document.addEventListener("DOMContentLoaded", function () {
    
    // -----------------------------------------------------------------
    // 0. Configuration Setup
    // -----------------------------------------------------------------
    const RENDER_BACKEND_URL = "https://smartkiddo-admin.onrender.com";

    // Fallback logToTerminal wrapper in case window is not loaded yet [2]
    function logToTerminal(message, type = 'info') {
        if (typeof window.logToTerminal === 'function') {
            window.logToTerminal(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // -----------------------------------------------------------------
    // 1. DOM Element Declarations
    // -----------------------------------------------------------------
    const aiChatSidebar = document.getElementById('ai-chat-sidebar');
    const tabAiToggleBtn = document.getElementById('tab-ai-toggle-btn');
    
    const aiChatOutputContainer = document.getElementById('ai-chat-output-container');
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiSendBtn = document.getElementById('ai-send-btn');
    const aiVoiceBtn = document.getElementById('ai-voice-btn');
    const aiVoiceActiveIndicator = document.getElementById('ai-voice-active-indicator');
    
    const aiTokenCount = document.getElementById('ai-token-count');
    const aiTokenInput = document.getElementById('ai-token-input');
    const aiTokenOutput = document.getElementById('ai-token-output');

    const aiContextAttachBtn = document.getElementById('ai-context-attach-btn');
    const aiContextMenu = document.getElementById('ai-context-menu');
    const aiContextItemsList = document.getElementById('ai-context-items-list');

    const aiAttachmentBadge = document.getElementById('ai-attachment-badge');
    const aiAttachmentName = document.getElementById('ai-attachment-name');
    const aiAttachmentRemove = document.getElementById('ai-attachment-remove');

    // Chat History Array
    let conversationHistory = [];
    let attachedFile = null; // Stores currently attached file metadata

    // -----------------------------------------------------------------
    // 2. TOGGLE PANEL VISIBILITY (Open / Close Hide / Unhide) [2]
    // -----------------------------------------------------------------
    if (tabAiToggleBtn && aiChatSidebar) {
        tabAiToggleBtn.addEventListener('click', function () {
            aiChatSidebar.classList.toggle('closed');
            
            // Adjust layouts when sidebar updates width
            if (aiChatSidebar.classList.contains('closed')) {
                tabAiToggleBtn.classList.remove('text-indigo-400');
                tabAiToggleBtn.classList.add('text-neutral-500');
            } else {
                tabAiToggleBtn.classList.add('text-indigo-400');
                tabAiToggleBtn.classList.remove('text-neutral-500');
            }
        });
    }

    // -----------------------------------------------------------------
    // 3. TEXT INPUT LONG TEXT HANDLE (Auto Expanding Box) [2]
    // -----------------------------------------------------------------
    if (aiChatInput) {
        aiChatInput.addEventListener('input', function () {
            this.style.height = 'auto';
            const scrollHeight = this.scrollHeight;
            this.style.height = (scrollHeight > 120 ? 120 : scrollHeight) + 'px'; // Limit max height, enable internal scroll
        });
    }

    // -----------------------------------------------------------------
    // 4. SPEECH-TO-TEXT SPEECH RECOGNITION (English & Malay Support) [2]
    // -----------------------------------------------------------------
    let speechRecognizer = null;
    let isRecordingSpeech = false;

    // Check browser compatibility and initialize speech API
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
        speechRecognizer = new SpeechRecognitionAPI();
        speechRecognizer.continuous = true;
        speechRecognizer.interimResults = false;
        // Language: default to Malay ('ms-MY') with English ('en-US') triggers
        speechRecognizer.lang = 'ms-MY'; 

        speechRecognizer.onstart = function () {
            isRecordingSpeech = true;
            if (aiVoiceActiveIndicator) aiVoiceActiveIndicator.classList.remove('hidden');
            if (aiVoiceBtn) aiVoiceBtn.classList.add('recording-pulse');
        };

        speechRecognizer.onresult = function (event) {
            const resultIndex = event.resultIndex;
            const transcript = event.results[resultIndex][0].transcript;
            
            if (aiChatInput) {
                // Insert speech results directly into current cursor position
                const startPos = aiChatInput.selectionStart;
                const endPos = aiChatInput.selectionEnd;
                const originalVal = aiChatInput.value;
                
                aiChatInput.value = originalVal.substring(0, startPos) + transcript + originalVal.substring(endPos);
                aiChatInput.dispatchEvent(new Event('input')); // Expand textarea if needed
            }
        };

        speechRecognizer.onerror = function (e) {
            console.error("Speech Recognition Error:", e);
            stopRecording();
        };

        speechRecognizer.onend = function () {
            stopRecording();
        };
    } else {
        if (aiVoiceBtn) {
            aiVoiceBtn.style.display = 'none'; // Hide if browser doesn't support Web Speech API [2]
        }
    }

    function startRecording() {
        if (speechRecognizer) {
            speechRecognizer.lang = confirm("Speak in Malay? (Click Cancel for English)") ? 'ms-MY' : 'en-US';
            speechRecognizer.start();
        }
    }

    function stopRecording() {
        isRecordingSpeech = false;
        if (speechRecognizer) {
            try { speechRecognizer.stop(); } catch(e) {}
        }
        if (aiVoiceActiveIndicator) aiVoiceActiveIndicator.classList.add('hidden');
        if (aiVoiceBtn) aiVoiceBtn.classList.remove('recording-pulse');
    }

    if (aiVoiceBtn) {
        aiVoiceBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (isRecordingSpeech) {
                stopRecording();
            } else {
                startRecording();
            }
        });
    }

    // -----------------------------------------------------------------
    // 5. ATTACH WORKSPACE FILE AS CONTEXT (`+` Icon Button) [2]
    // -----------------------------------------------------------------
    
    // Scans tree structure recursively and returns a flat list of text files
    function flattenFilesList(nodes, pathPrefix = '') {
        let files = [];
        nodes.forEach(node => {
            const absolutePath = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;
            if (node.type === 'file') {
                files.push({
                    id: node.id,
                    name: node.name,
                    path: absolutePath,
                    content: node.content,
                    isMedia: node.isMedia
                });
            } else if (node.type === 'folder' && Array.isArray(node.children)) {
                files = files.concat(flattenFilesList(node.children, absolutePath));
            }
        });
        return files;
    }

    if (aiContextAttachBtn && aiContextMenu && aiContextItemsList) {
        aiContextAttachBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            
            // Toggle menu visibility
            if (!aiContextMenu.classList.contains('hidden')) {
                aiContextMenu.classList.add('hidden');
                return;
            }

            // Fetch current state of fileSystem from parent script
            if (typeof window.getWorkspaceFileSystem !== 'function') {
                aiContextItemsList.innerHTML = `<p class="p-2 text-[11px] text-neutral-600">No workspace connected.</p>`;
                aiContextMenu.classList.remove('hidden');
                return;
            }

            const currentFileSystem = window.getWorkspaceFileSystem();
            const textFiles = flattenFilesList(currentFileSystem).filter(f => !f.isMedia);

            if (textFiles.length === 0) {
                aiContextItemsList.innerHTML = `<p class="p-2 text-[11px] text-neutral-600">No text files in tree.</p>`;
            } else {
                let html = '';
                textFiles.forEach(file => {
                    html += `
                        <div class="px-2 py-1.5 hover:bg-[#21212c] rounded cursor-pointer truncate transition-colors flex items-center gap-2" data-file-id="${file.id}">
                            <svg class="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            <span class="truncate" title="${file.path}">${file.path}</span>
                        </div>
                    `;
                });
                aiContextItemsList.innerHTML = html;

                // Attach click listeners to file list items
                aiContextItemsList.querySelectorAll('[data-file-id]').forEach(item => {
                    item.addEventListener('click', function () {
                        const targetId = this.getAttribute('data-file-id');
                        const matchedFile = textFiles.find(f => f.id === targetId);
                        if (matchedFile) {
                            attachFileContext(matchedFile);
                        }
                    });
                });
            }

            aiContextMenu.classList.remove('hidden');
        });
    }

    // Hides dropdown if clicking anywhere else
    document.addEventListener('click', function () {
        if (aiContextMenu) aiContextMenu.classList.add('hidden');
    });

    function attachFileContext(file) {
        attachedFile = file;
        if (aiAttachmentName) aiAttachmentName.innerText = file.path;
        if (aiAttachmentBadge) aiAttachmentBadge.classList.remove('hidden');
        if (aiContextMenu) aiContextMenu.classList.add('hidden');
        logToTerminal(`Injected workspace file context: ${file.path}`, 'info');
    }

    if (aiAttachmentRemove) {
        aiAttachmentRemove.addEventListener('click', function (e) {
            e.stopPropagation();
            attachedFile = null;
            if (aiAttachmentBadge) aiAttachmentBadge.classList.add('hidden');
            logToTerminal("Workspace file context removed.", "warning");
        });
    }

    // -----------------------------------------------------------------
    // 6. RICH TEXT FORMATTING AND MARKDOWN PARSING UTILITY [2]
    // -----------------------------------------------------------------
    function parseMarkdownToHTML(text) {
        let html = text;

        // Escape raw HTML entities to avoid broken DOM elements
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Highlight marker tags <mark>
        html = html.replace(/==([^==\n]+)==/g, '<mark class="bg-yellow-500/40 text-inherit rounded px-0.5">$1</mark>');

        // Synced Code blocks formatting (e.g. ```javascript ... ```) [2]
        html = html.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)\n```/g, function (match, lang, code) {
            return `<pre><code class="language-${lang}">${code}</code></pre>`;
        });

        // Inline Code segments formatting
        html = html.replace(/`([^`\n]+)`/g, '<code class="bg-[#0b0b0f] border border-[#1f1f29] px-1 rounded text-[11px] text-pink-400 font-mono">$1</code>');

        // Quote block formatting
        html = html.replace(/^&gt;\s+(.*)$/gm, '<blockquote>$1</blockquote>');

        // Headings / Subtitles [2]
        html = html.replace(/^###\s+(.*)$/gm, '<h4 class="text-sm font-bold text-white mt-3 mb-1.5">$1</h4>');
        html = html.replace(/^##\s+(.*)$/gm, '<h3 class="text-base font-extrabold text-white mt-4 mb-2">$1</h3>');
        html = html.replace(/^#\s+(.*)$/gm, '<h2 class="text-lg font-black text-indigo-400 mt-5 mb-3 border-b border-[#1f1f29] pb-1">$1</h2>');

        // Bold formatting
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-bold">$1</strong>');

        // Underline simulated markup formatting [2]
        html = html.replace(/__([^_]+)__/g, '<span class="underline decoration-indigo-500/50">$1</span>');

        // Unordered lists [2]
        html = html.replace(/^\*\s+(.*)$/gm, '<ul><li>$1</li></ul>');
        html = html.replace(/^\-\s+(.*)$/gm, '<ul><li>$1</li></ul>');

        // Clean redundant list tag closures
        html = html.replace(/<\/ul>\s*<ul>/g, '');

        // Paragraph conversions
        html = html.replace(/\n\n/g, '</p><p class="mt-2">');

        return `<p>${html}</p>`;
    }

    // -----------------------------------------------------------------
    // 7. OPENAI API PROXY PIPELINE (Syncs Workspace & Prompts) [2]
    // -----------------------------------------------------------------
    async function submitChat() {
        if (!aiChatInput) return;
        const query = aiChatInput.value.trim();
        if (!query) return;

        // Clear input box
        aiChatInput.value = '';
        aiChatInput.style.height = 'auto'; // Reset text box size bounds

        // Print User Message in Chat Box
        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = "flex items-start gap-3 justify-end";
        userMsgDiv.innerHTML = `
            <div class="bg-indigo-600/10 p-3 rounded-lg text-xs text-indigo-300 leading-relaxed max-w-[85%] border border-indigo-500/20 select-text font-sans">
                ${query.replace(/\n/g, '<br>')}
                ${attachedFile ? `
                    <div class="mt-2 flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 font-mono select-none">
                        <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                        <span>${attachedFile.path}</span>
                    </div>
                ` : ''}
            </div>
        `;
        if (aiChatOutputContainer) {
            aiChatOutputContainer.appendChild(userMsgDiv);
            aiChatOutputContainer.scrollTop = aiChatOutputContainer.scrollHeight;
        }

        // Push to local memory log
        conversationHistory.push({ role: "user", content: query });

        // Build workspace context indexes to optimize tokens [2]
        let contextPayloadString = "";
        
        // Compute project directory path map (Manifest index)
        if (typeof window.getWorkspaceFileSystem === 'function') {
            const currentFileSystem = window.getWorkspaceFileSystem();
            const allFilesList = flattenFilesList(currentFileSystem);
            
            // Build lightweight directory manifest map
            let manifest = "=== DIRECTORY STRUCTURAL MANIFEST ===\n";
            allFilesList.forEach(file => {
                const lineCount = file.isMedia ? 0 : (file.content.split('\n').length || 0);
                manifest += `Path: ${file.path} | Type: ${file.isMedia ? 'Media' : 'Code'} | Line count: ${lineCount}\n`;
            });
            contextPayloadString += manifest + "\n";
        }

        // Inject currently attached selected context file
        if (attachedFile) {
            contextPayloadString += `=== REFERENCE ATTACHED FILE: ${attachedFile.path} ===\n${attachedFile.content}\n`;
        }

        // Generate Assistant Message Placeholder loader
        const assistantPlaceholder = document.createElement('div');
        assistantPlaceholder.className = "flex items-start gap-3";
        assistantPlaceholder.innerHTML = `
            <div class="w-6 h-6 rounded bg-indigo-600/20 flex items-center justify-center text-xs text-indigo-400 font-bold flex-shrink-0 select-none">AI</div>
            <div class="bg-[#1a1a24] p-3 rounded-lg text-xs text-neutral-400 leading-relaxed max-w-[85%] border border-[#1f1f29] flex items-center gap-2 select-none font-mono">
                <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></div>
                Thinking...
            </div>
        `;
        if (aiChatOutputContainer) {
            aiChatOutputContainer.appendChild(assistantPlaceholder);
            aiChatOutputContainer.scrollTop = aiChatOutputContainer.scrollHeight;
        }

        // Dispatch call to Python proxy service on Render [2]
        try {
            logToTerminal("Dispatching chat packet to SmartKiddo AI proxy...", "system");
            
            const response = await fetch(`${RENDER_BACKEND_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: conversationHistory,
                    workspace_context: contextPayloadString
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP Error Status: ${response.status}`);
            }

            const chatResponse = await response.json();
            
            // Remove Assistant thinking placeholder
            if (aiChatOutputContainer) aiChatOutputContainer.removeChild(assistantPlaceholder);

            // Safety interceptor: if server caught an API exception and returned an error [2]
            if (chatResponse.success === false || chatResponse.error) {
                const errorDiv = document.createElement('div');
                errorDiv.className = "flex items-start gap-3";
                errorDiv.innerHTML = `
                    <div class="w-6 h-6 rounded bg-red-600/20 flex items-center justify-center text-xs text-red-400 font-bold flex-shrink-0 select-none">Err</div>
                    <div class="bg-red-500/10 p-3 rounded-lg text-xs text-red-400 leading-relaxed max-w-[85%] border border-red-500/20 select-text font-mono">
                        ${chatResponse.error || "An unexpected error occurred during API completion."}
                    </div>
                `;
                if (aiChatOutputContainer) {
                    aiChatOutputContainer.appendChild(errorDiv);
                    aiChatOutputContainer.scrollTop = aiChatOutputContainer.scrollHeight;
                }
                logToTerminal(`API Error: ${chatResponse.error}`, "error");
                
                // Clear the corrupted turn from local history so context doesn't keep failing
                conversationHistory.pop();
                return;
            }

            // Print AI agent rich text result
            const aiMsgDiv = document.createElement('div');
            aiMsgDiv.className = "flex items-start gap-3";
            aiMsgDiv.innerHTML = `
                <div class="w-6 h-6 rounded bg-indigo-600/20 flex items-center justify-center text-xs text-indigo-400 font-bold flex-shrink-0 select-none">AI</div>
                <div class="ai-message bg-[#1a1a24] p-3 rounded-lg text-xs text-neutral-300 leading-relaxed max-w-[85%] border border-[#1f1f29] select-text font-sans">
                    ${parseMarkdownToHTML(chatResponse.content)}
                </div>
            `;
            if (aiChatOutputContainer) {
                aiChatOutputContainer.appendChild(aiMsgDiv);
                aiChatOutputContainer.scrollTop = aiChatOutputContainer.scrollHeight;
            }

            // Trigger Prism highlighting on any nested output blocks [2]
            if (window.Prism) {
                aiMsgDiv.querySelectorAll('pre code').forEach(block => {
                    window.Prism.highlightElement(block);
                });
            }

            // Save Response inside local log history
            conversationHistory.push({ role: "assistant", content: chatResponse.content });

            // Update Token Trackers [2]
            if (chatResponse.usage) {
                if (aiTokenCount) aiTokenCount.innerText = chatResponse.usage.total_tokens;
                if (aiTokenInput) aiTokenInput.innerText = chatResponse.usage.input_tokens;
                if (aiTokenOutput) aiTokenOutput.innerText = chatResponse.usage.output_tokens;
            }

            // Remove badge after successful upload context session
            attachedFile = null;
            if (aiAttachmentBadge) aiAttachmentBadge.classList.add('hidden');

            logToTerminal("AI response packets received successfully.", "success");

        } catch (err) {
            console.error(err);
            logToTerminal(`AI request pipeline crashed: ${err.message}`, "error");
            
            if (aiChatOutputContainer) aiChatOutputContainer.removeChild(assistantPlaceholder);
            
            const errorDiv = document.createElement('div');
            errorDiv.className = "flex items-start gap-3";
            errorDiv.innerHTML = `
                <div class="w-6 h-6 rounded bg-red-600/20 flex items-center justify-center text-xs text-red-400 font-bold flex-shrink-0 select-none">Err</div>
                <div class="bg-red-500/10 p-3 rounded-lg text-xs text-red-400 leading-relaxed max-w-[85%] border border-red-500/20 select-text font-mono">
                    System error calling Render proxy. ${err.message}
                </div>
            `;
            if (aiChatOutputContainer) {
                aiChatOutputContainer.appendChild(errorDiv);
                aiChatOutputContainer.scrollTop = aiChatOutputContainer.scrollHeight;
            }
        }
    }

    if (aiSendBtn) {
        aiSendBtn.addEventListener('click', submitChat);
    }

    if (aiChatInput) {
        aiChatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitChat();
            }
        });
    }
});
