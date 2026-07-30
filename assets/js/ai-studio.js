/**
 * T1ERA AI Studio Workspace Playground Frontend Script
 * ChatGPT + Gemini + Claude Hybrid Interface
 */
document.addEventListener("DOMContentLoaded", function () {
    
    // -----------------------------------------------------------------
    // 0. Base Configuration Setup
    // -----------------------------------------------------------------
    const RENDER_BACKEND_URL = "https://smartkiddo-admin.onrender.com";

    // -----------------------------------------------------------------
    // 1. DOM Element Declarations
    // -----------------------------------------------------------------
    const cardAiStudio = document.querySelector("#view-t1era-studio .glow-card:nth-child(4)"); // Card 4 target element
    const viewStudioSelector = document.getElementById("view-t1era-studio");
    const viewAiStudioSelector = document.getElementById("view-t1era-ai-studio");
    const btnBack = document.getElementById("btn-ai-studio-back");
    const btnSettingsToggle = document.getElementById("btn-ai-studio-settings-toggle");
    const settingsDock = document.getElementById("ai-studio-settings-dock");
    
    const chatFeed = document.getElementById("ai-studio-chat-feed");
    const promptInput = document.getElementById("ai-studio-prompt-input");
    const btnSend = document.getElementById("btn-ai-studio-send");
    const btnClear = document.getElementById("btn-ai-studio-clear");
    const activeModelBadge = document.getElementById("active-model-badge");
    const dropdownModel = document.getElementById("setting-ai-studio-model");

    // Upload components
    const btnAttach = document.getElementById("btn-ai-studio-attach");
    const fileUploadInput = document.getElementById("ai-studio-file-upload-input");
    const uploadPreview = document.getElementById("ai-studio-upload-preview");
    const uploadedFileName = document.getElementById("ai-studio-uploaded-file-name");
    const btnRemoveUpload = document.getElementById("btn-ai-studio-remove-upload");

    // Mic components
    const btnVoice = document.getElementById("btn-ai-studio-voice");
    const micActiveDot = document.getElementById("ai-studio-mic-active-dot");

    // Extensions components
    const btnExtensions = document.getElementById("btn-ai-studio-extensions");
    const extensionsMenu = document.getElementById("ai-studio-extensions-menu");
    const extActiveDot = document.getElementById("extension-active-dot");
    const extToggleGrep = document.getElementById("ext-toggle-grep");
    const extToggleLru = document.getElementById("ext-toggle-lru");

    // Range Sliders
    const rangeTemp = document.getElementById("range-ai-studio-temp");
    const valTemp = document.getElementById("val-ai-studio-temp");
    const rangeTokens = document.getElementById("range-ai-studio-tokens");
    const valTokens = document.getElementById("val-ai-studio-tokens");
    const checkSanitizer = document.getElementById("check-ai-studio-sanitizer");

    // Settings Wrappers for Disabling/Locking controls
    const tempGroup = rangeTemp ? rangeTemp.closest(".space-y-2") : null;
    const tokensGroup = rangeTokens ? rangeTokens.closest(".space-y-2") : null;
    const sanitizerGroup = checkSanitizer ? checkSanitizer.closest(".flex") : null;

    let isRecordingSpeech = false;
    let attachedFileMetadata = null;
    let chatHistory = []; // Local history log storage for T1ERA Studio playground

    // Helper to log actions to standard system terminal console
    function logToTerminal(message, type = 'info') {
        if (typeof window.logToTerminal === 'function') {
            window.logToTerminal(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // -----------------------------------------------------------------
    // 2. Navigation Control States (Stretching Container to Fullscreen Width)
    // -----------------------------------------------------------------
    if (cardAiStudio) {
        cardAiStudio.addEventListener("click", function () {
            if (viewStudioSelector && viewAiStudioSelector) {
                viewStudioSelector.classList.add("hidden");
                viewStudioSelector.classList.remove("block");
                viewAiStudioSelector.classList.remove("hidden");
                viewAiStudioSelector.classList.add("block");
            }
            
            if (document.body && !document.body.classList.contains('sidebar-collapsed')) {
                document.body.classList.add('sidebar-collapsed');
                const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
                if (sidebarToggleIcon) {
                    sidebarToggleIcon.innerHTML = `
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    `;
                }
            }

            const mainContentScroll = document.getElementById('main-content-scroll');
            if (mainContentScroll) {
                mainContentScroll.classList.remove('overflow-y-auto');
                mainContentScroll.classList.add('overflow-hidden');
            }

            const mainContentInner = document.getElementById('main-content-inner');
            if (mainContentInner) {
                mainContentInner.classList.remove('p-8', 'max-w-7xl', 'mx-auto', 'justify-between');
                mainContentInner.classList.add('p-2', 'h-full', 'w-full', 'max-w-none', 'flex-1');
            }

            // Trigger dynamic locked/unlocked state evaluation based on selected model
            syncActiveModelSettingsLock();

            logToTerminal("Opened T1ERA AI Studio Playground in Fullscreen mode.", "system");
        });
    }

    if (btnBack) {
        btnBack.addEventListener("click", function () {
            if (viewStudioSelector && viewAiStudioSelector) {
                viewAiStudioSelector.classList.add("hidden");
                viewAiStudioSelector.classList.remove("block");
                viewStudioSelector.classList.remove("hidden");
                viewStudioSelector.classList.add("block");
            }

            const mainContentScroll = document.getElementById('main-content-scroll');
            if (mainContentScroll) {
                mainContentScroll.classList.add('overflow-y-auto');
                mainContentScroll.classList.remove('overflow-hidden');
            }

            const mainContentInner = document.getElementById('main-content-inner');
            if (mainContentInner) {
                mainContentInner.classList.remove('p-2', 'w-full', 'max-w-none', 'flex-1');
                mainContentInner.classList.add('p-8', 'max-w-7xl', 'mx-auto', 'justify-between');
            }

            logToTerminal("Exited AI Studio. Restored main dashboard limits.", "system");
        });
    }

    // -----------------------------------------------------------------
    // 3. UI Controls and Custom Sliders Binding (Model Locks Handler)
    // -----------------------------------------------------------------
    if (btnSettingsToggle && settingsDock) {
        btnSettingsToggle.addEventListener("click", function () {
            settingsDock.classList.toggle("collapsed");
        });
    }

    if (rangeTemp && valTemp) {
        rangeTemp.addEventListener("input", function () {
            valTemp.innerText = this.value;
        });
    }

    if (rangeTokens && valTokens) {
        rangeTokens.addEventListener("input", function () {
            valTokens.innerText = this.value;
        });
    }

    // Evaluates selected model, locking temperature, token, and sanitizer configurations for gpt-5.4-mini
    function syncActiveModelSettingsLock() {
        if (!dropdownModel) return;
        const selectedValue = dropdownModel.value;

        const isMiniModel = (selectedValue === "gpt-5.4-mini");

        if (isMiniModel) {
            logToTerminal("Target 'gpt-5.4-mini' selected. Disabling unauthorized slide parameters.", "warning");
            
            // Set input nodes to disabled
            if (rangeTemp) rangeTemp.disabled = true;
            if (rangeTokens) rangeTokens.disabled = true;
            if (checkSanitizer) checkSanitizer.disabled = true;

            // Inject warning block styling rules
            if (tempGroup) tempGroup.classList.add("locked-parameter-group");
            if (tokensGroup) tokensGroup.classList.add("locked-parameter-group");
            if (sanitizerGroup) sanitizerGroup.classList.add("locked-parameter-group");
        } else {
            // Restore default enabled settings for all other platforms
            if (rangeTemp) rangeTemp.disabled = false;
            if (rangeTokens) rangeTokens.disabled = false;
            if (checkSanitizer) checkSanitizer.disabled = false;

            if (tempGroup) tempGroup.classList.remove("locked-parameter-group");
            if (tokensGroup) tokensGroup.classList.remove("locked-parameter-group");
            if (sanitizerGroup) sanitizerGroup.classList.remove("locked-parameter-group");
        }
    }

    if (dropdownModel && activeModelBadge) {
        dropdownModel.addEventListener("change", function () {
            const selectedText = this.options[this.selectedIndex].text;
            activeModelBadge.innerText = `${selectedText} (Manual)`;
            syncActiveModelSettingsLock();
            logToTerminal(`AI Studio active model swapped: ${this.value}`, "system");
        });
    }

    document.querySelectorAll(".studio-template-card").forEach(card => {
        card.addEventListener("click", function () {
            const prompt = this.getAttribute("data-prompt");
            if (promptInput && prompt) {
                promptInput.value = prompt;
                promptInput.dispatchEvent(new Event('input'));
                promptInput.focus();
            }
        });
    });

    // -----------------------------------------------------------------
    // 4. Input Text Area Adjustments
    // -----------------------------------------------------------------
    if (promptInput) {
        promptInput.addEventListener("input", function () {
            this.style.height = "auto";
            const scrollHeight = this.scrollHeight;
            this.style.height = (scrollHeight > 100 ? 100 : scrollHeight) + "px";
        });
    }

    // -----------------------------------------------------------------
    // 5. File Context Flattening & Selection
    // -----------------------------------------------------------------
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

    if (btnAttach && fileUploadInput) {
        btnAttach.addEventListener("click", function (e) {
            e.stopPropagation();
            
            if (typeof window.getWorkspaceFileSystem !== 'function') {
                logToTerminal("No workspace file tree connected to inject reference context.", "error");
                fileUploadInput.click(); // Default local file backup prompt trigger
                return;
            }

            const currentFileSystem = window.getWorkspaceFileSystem();
            const textFiles = flattenFilesList(currentFileSystem).filter(f => !f.isMedia);

            if (textFiles.length === 0) {
                logToTerminal("No valid workspace text files available.", "warning");
                fileUploadInput.click();
            } else {
                // Attach the first available workspace file as template reference
                const targetFile = textFiles[0];
                attachedFileMetadata = {
                    name: targetFile.path,
                    content: targetFile.content || "/* Workspace file source content */"
                };

                if (uploadedFileName && uploadPreview) {
                    uploadedFileName.innerText = `${targetFile.path} (Workspace File)`;
                    uploadPreview.classList.remove("hidden");
                }
                logToTerminal(`AI Studio attached workspace context: ${targetFile.path}`, "info");
            }
        });
    }

    if (fileUploadInput) {
        fileUploadInput.addEventListener("change", function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(evt) {
                attachedFileMetadata = {
                    name: file.name,
                    content: evt.target.result
                };

                if (uploadedFileName && uploadPreview) {
                    uploadedFileName.innerText = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                    uploadPreview.classList.remove("hidden");
                }
                logToTerminal(`AI Studio attached reference context: ${file.name}`, "info");
            };
            reader.readAsText(file);
        });
    }

    if (btnRemoveUpload) {
        btnRemoveUpload.addEventListener("click", function (e) {
            e.stopPropagation();
            attachedFileMetadata = null;
            if (fileUploadInput) fileUploadInput.value = "";
            if (uploadPreview) uploadPreview.classList.add("hidden");
            logToTerminal("AI Studio removed reference context.", "warning");
        });
    }

    // -----------------------------------------------------------------
    // 6. Voice Input Mock (Speech Recognition)
    // -----------------------------------------------------------------
    if (btnVoice) {
        btnVoice.addEventListener("click", function (e) {
            e.stopPropagation();
            isRecordingSpeech = !isRecordingSpeech;
            
            if (isRecordingSpeech) {
                btnVoice.classList.add("recording-pulse");
                if (micActiveDot) micActiveDot.classList.remove("hidden");
                logToTerminal("Speech recognition activated in prompt lab. Dictate now.", "system");
                
                setTimeout(() => {
                    if (isRecordingSpeech && promptInput) {
                        const dictationResult = "Write a standardized vocabulary checklist for primary age demographics.";
                        promptInput.value = promptInput.value ? `${promptInput.value} ${dictationResult}` : dictationResult;
                        promptInput.dispatchEvent(new Event('input'));
                        stopRecordingMock();
                    }
                }, 3500);
            } else {
                stopRecordingMock();
            }
        });
    }

    function stopRecordingMock() {
        isRecordingSpeech = false;
        if (btnVoice) btnVoice.classList.remove("recording-pulse");
        if (micActiveDot) micActiveDot.classList.add("hidden");
        logToTerminal("Speech recognition closed.", "system");
    }

    // -----------------------------------------------------------------
    // 7. Extensions Dropdown Behavior
    // -----------------------------------------------------------------
    if (btnExtensions && extensionsMenu) {
        btnExtensions.addEventListener("click", function (e) {
            e.stopPropagation();
            extensionsMenu.classList.toggle("hidden");
        });
    }

    document.addEventListener("click", function () {
        if (extensionsMenu) extensionsMenu.classList.add("hidden");
    });

    if (extensionsMenu) {
        extensionsMenu.addEventListener("click", function (e) {
            e.stopPropagation(); 
        });
    }

    function syncActiveExtensionsBadge() {
        const isGrepActive = extToggleGrep && extToggleGrep.checked;
        const isLruActive = extToggleLru && extToggleLru.checked;

        if (extActiveDot) {
            if (isGrepActive || isLruActive) {
                extActiveDot.classList.remove("hidden");
            } else {
                extActiveDot.classList.add("hidden");
            }
        }
    }

    if (extToggleGrep) extToggleGrep.addEventListener("change", syncActiveExtensionsBadge);
    if (extToggleLru) extToggleLru.addEventListener("change", syncActiveExtensionsBadge);
    syncActiveExtensionsBadge();

    // -----------------------------------------------------------------
    // 8. Markdown Parsing Utility (Protected Block Placeholder Token Pipeline)
    // -----------------------------------------------------------------
    function parseMarkdownToHTML(text) {
        let html = text;

        // Escape raw HTML tags to prevent formatting injection attacks
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const placeholders = [];
        function addPlaceholder(type, htmlContent) {
            const id = placeholders.length;
            placeholders.push({ type: type, html: htmlContent });
            return `<!--T1ERA_PLACEHOLDER_${id}-->`;
        }

        // 1. Extract Code Blocks into placeholders (handles CRLF line-endings and trailing whitespaces)
        html = html.replace(/```([a-zA-Z0-9_-]*)[ \t]*[\r\n]*([\s\S]*?)[\r\n]*```/g, function (match, lang, code) {
            const cleanLang = lang ? lang.toUpperCase() : "PLAINTEXT";
            const codeHTML = `
                <div class="ai-studio-code-container border border-[#1f1f29] rounded-lg overflow-hidden my-3 bg-[#07070a]">
                    <!-- Code Header -->
                    <div class="ai-studio-code-header flex items-center justify-between px-3 py-1.5 bg-[#111115] border-b border-[#1f1f29] text-[9px] font-bold text-neutral-400 font-mono select-none">
                        <span>${cleanLang}</span>
                        <button class="btn-copy-code flex items-center gap-1 hover:text-white transition-colors" title="Copy Code text">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                            <span>COPY CODE</span>
                        </button>
                    </div>
                    <!-- Code Body -->
                    <pre class="p-3 m-0 overflow-x-auto"><code class="font-mono text-[11px] text-indigo-300 language-${lang || 'plaintext'}">${code.trim()}</code></pre>
                </div>
            `;
            return addPlaceholder('code_block', codeHTML);
        });

        // 2. Extract Inline Code blocks to protect nested double-equals symbols
        html = html.replace(/`([^`\r\n]+)`/g, function (match, code) {
            const inlineHTML = `<code class="bg-[#0b0b0f] border border-[#1f1f29] px-1 rounded text-[11px] text-pink-400 font-mono">${code}</code>`;
            return addPlaceholder('inline_code', inlineHTML);
        });

        // 3. Extract Blockquotes
        html = html.replace(/^&gt;\s+(.*)$/gm, function (match, content) {
            const quoteHTML = `<blockquote class="border-l-3 border-indigo-500 bg-indigo-500/5 pl-3 py-1.5 italic text-neutral-400 rounded-r my-2">${content}</blockquote>`;
            return addPlaceholder('blockquote', quoteHTML);
        });

        // 4. Process Header elements (before splitting paragraphs)
        html = html.replace(/^###\s+(.*)$/gm, '<h4 class="text-sm font-bold text-white mt-3 mb-1.5">$1</h4>');
        html = html.replace(/^##\s+(.*)$/gm, '<h3 class="text-base font-extrabold text-white mt-4 mb-2">$1</h3>');
        html = html.replace(/^#\s+(.*)$/gm, '<h2 class="text-lg font-black text-indigo-400 mt-5 mb-3 border-b border-[#1f1f29] pb-1">$1</h2>');

        // 5. Process inline elements
        html = html.replace(/==([^==\r\n]+)==/g, '<mark class="bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">$1</mark>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
        html = html.replace(/__([^_]+)__/g, '<span class="underline decoration-indigo-500/50">$1</span>');

        // 6. Convert Double Newlines to Paragraphs safely (skipping block containers and headings)
        const parts = html.split(/[\r\n]{2,}/);
        const formattedParts = parts.map(part => {
            const trimmed = part.trim();
            if (!trimmed) return "";
            if (trimmed.startsWith('<h') || trimmed.startsWith('<!--T1ERA_PLACEHOLDER_')) {
                return trimmed;
            }
            return `<p class="mt-2.5 leading-relaxed">${trimmed}</p>`;
        });
        html = formattedParts.filter(p => p !== "").join('\n');

        // 7. Restore Placeholders in reverse order to preserve nested tag hierarchies
        for (let i = placeholders.length - 1; i >= 0; i--) {
            const placeholderToken = `<!--T1ERA_PLACEHOLDER_${i}-->`;
            html = html.replace(placeholderToken, placeholders[i].html);
        }

        return html;
    }

    // -----------------------------------------------------------------
    // 9. EXACT MATCH Centered Chat Message Generation Layouts
    // -----------------------------------------------------------------
    function createCenteredMessageBubble(sender, content, generationTimeSec = "0.0", persist = true) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const wrapper = document.createElement("div");
        // Outer wrapper padding matches the prompt box area padding (`px-6`)
        wrapper.className = "w-full px-6 py-4";

        const isUser = sender === "user";
        const speakerLabel = isUser ? "YOU" : (dropdownModel ? dropdownModel.options[dropdownModel.selectedIndex].text.toUpperCase() : "T1ERA AI");
        const headerClass = isUser ? "user" : "assistant";

        wrapper.innerHTML = `
            <div class="max-w-3xl w-full mx-auto flex flex-col gap-2">
                <div class="ai-studio-msg-box relative w-full">
                    
                    <!-- HEADER SECTION (Centered Alignment with copy button on top-right) -->
                    <div class="ai-studio-box-header ${headerClass}">
                        <span>${isUser ? '👤' : '✨'} ${speakerLabel}</span>
                        <button class="btn-copy-msg text-neutral-500 hover:text-white transition-colors" title="Copy Message text">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                            </svg>
                        </button>
                    </div>

                    <!-- BODY SECTION (Message Text Content) -->
                    <div class="ai-studio-box-body text-left">
                        ${content}
                    </div>

                    <!-- FOOTER SECTION (Centered Alignment, Small Font) -->
                    <div class="ai-studio-box-footer">
                        ${isUser ? 'CLIENT INFERENCE PIPELINE REQUEST' : 'PROMPT LAB CONTEXT INTERACTION LOG'}
                    </div>

                </div>
                
                <!-- OUTSIDE BOTTOM LABEL (Below box outside on left corner) -->
                <div class="ai-studio-outside-meta select-none flex items-center gap-1.5 font-mono w-full text-left">
                    <span>[${timestamp}]</span>
                    <span>•</span>
                    <span>${generationTimeSec}s response</span>
                </div>
            </div>
        `;

        // Bind Message Block copy to clipboard trigger
        const copyBtn = wrapper.querySelector(".btn-copy-msg");
        if (copyBtn) {
            copyBtn.addEventListener("click", function() {
                const textBody = wrapper.querySelector(".ai-studio-box-body");
                if (textBody) {
                    const textToCopy = textBody.innerText;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        showToastNotification("Message copied to clipboard!");
                        copyBtn.classList.remove("text-neutral-500");
                        copyBtn.classList.add("text-emerald-400");
                        setTimeout(() => {
                            copyBtn.classList.remove("text-emerald-400");
                            copyBtn.classList.add("text-neutral-500");
                        }, 1500);
                    }).catch(err => {
                        logToTerminal("Copy action failed: " + err, "error");
                    });
                }
            });
        }

        // Bind individual code block copy triggers
        const codeCopyBtns = wrapper.querySelectorAll(".btn-copy-code");
        codeCopyBtns.forEach(btn => {
            btn.addEventListener("click", function(e) {
                e.stopPropagation();
                const container = btn.closest(".ai-studio-code-container");
                const codeEl = container ? container.querySelector("pre code") : null;
                if (codeEl) {
                    const codeText = codeEl.innerText;
                    navigator.clipboard.writeText(codeText).then(() => {
                        showToastNotification("Code copied to clipboard!");
                        const label = btn.querySelector("span");
                        if (label) {
                            const originalLabel = label.innerText;
                            label.innerText = "COPIED!";
                            btn.classList.add("text-emerald-400");
                            setTimeout(() => {
                                label.innerText = originalLabel;
                                btn.classList.remove("text-emerald-400");
                            }, 1500);
                        }
                    }).catch(err => {
                        logToTerminal("Failed to copy code: " + err, "error");
                    });
                }
            });
        });

        if (chatFeed) {
            chatFeed.appendChild(wrapper);
            chatFeed.scrollTop = chatFeed.scrollHeight;
        }

        if (persist) {
            savePersistedHistory();
        }

        return wrapper;
    }

    // -----------------------------------------------------------------
    // 10. Intelligent Context, Memory & Notification Infrastructure
    // -----------------------------------------------------------------
    
    // Glassy floating transient notification toast popup
    function showToastNotification(message) {
        let container = document.getElementById("ai-studio-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "ai-studio-toast-container";
            container.className = "fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] flex flex-col gap-2 pointer-events-none select-none";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = "ai-studio-toast flex items-center gap-2 bg-[#111115]/95 backdrop-blur-md border border-indigo-500/20 text-[11px] font-mono font-bold text-white px-4 py-2.5 rounded-lg shadow-2xl opacity-0 transform translate-y-[-10px] pointer-events-auto cursor-pointer";
        toast.innerHTML = `
            <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove("opacity-0", "translate-y-[-10px]");
            toast.classList.add("opacity-100", "translate-y-0");
        });

        // Animate Out
        const removeToast = () => {
            toast.classList.remove("opacity-100", "translate-y-0");
            toast.classList.add("opacity-0", "translate-y-[-10px]");
            setTimeout(() => {
                toast.remove();
            }, 300);
        };

        const autoTimeout = setTimeout(removeToast, 2500);

        // Click to dismiss instantly
        toast.addEventListener("click", () => {
            clearTimeout(autoTimeout);
            removeToast();
        });
    }

    // Serializes active chatHistory stack straight to local browser storage
    function savePersistedHistory() {
        localStorage.setItem("t1era_ai_studio_chat_history", JSON.stringify(chatHistory));
    }

    // Deserializes and re-draws stored history blocks upon page hydration
    function loadPersistedHistory() {
        const saved = localStorage.getItem("t1era_ai_studio_chat_history");
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                chatHistory = parsed;
                
                // Collapse welcome banner immediately since active history exists
                const welcomePane = document.querySelector(".ai-studio-welcome-pane");
                if (welcomePane) {
                    welcomePane.style.display = "none";
                }

                chatHistory.forEach(turn => {
                    if (turn.role === "user") {
                        createCenteredMessageBubble("user", turn.content, "0.0", false);
                    } else if (turn.role === "assistant") {
                        createCenteredMessageBubble("assistant", parseMarkdownToHTML(turn.content), "0.0", false);
                    }
                });
                logToTerminal(`Restored ${chatHistory.length} active discussion bubbles from LocalStorage thread memory.`, "success");
            }
        } catch (err) {
            console.error("Context restore failure:", err);
        }
    }

    // Resolves simple numerical selections (e.g. "5" -> "5 (Context Selection: Option 5 - 'Exit')")
    function resolveOptionSelectionContext(userInput) {
        const targetText = userInput.trim();
        const numMatch = targetText.match(/^(\d+)$/);
        const optMatch = targetText.match(/^option\s*(\d+)$/i);
        const optionNumber = numMatch ? numMatch[1] : (optMatch ? optMatch[1] : null);

        if (!optionNumber) return userInput;

        // Traverse history backward to extract the last AI instruction list block
        let lastAiContent = null;
        for (let i = chatHistory.length - 1; i >= 0; i--) {
            if (chatHistory[i].role === "assistant") {
                lastAiContent = chatHistory[i].content;
                break;
            }
        }

        if (!lastAiContent) return userInput;

        // Parse list formats matching `5.` or `5)`
        const lines = lastAiContent.split(/[\r\n]+/);
        const listPattern = new RegExp(`^\\s*${optionNumber}[\\.\\)]\\s*(.*)$`, 'i');
        
        for (const line of lines) {
            const match = line.match(listPattern);
            if (match) {
                const resolvedLabel = match[1].trim();
                logToTerminal(`Context Tracker: Resolved choice '${userInput}' -> option text: '${resolvedLabel}'`, "success");
                return `${userInput} (Selection Reference Context: Option ${optionNumber} - "${resolvedLabel}")`;
            }
        }
        return userInput;
    }

    // Tracks keyword topic overlap changes, warning of context shifts in the terminal
    let activeTopicKeywords = [];
    function trackTopicKeywordsShift(newPromptText) {
        const stopWords = ["the", "and", "but", "for", "with", "this", "that", "you", "are", "have", "not", "make", "create", "write", "code"];
        const cleanWords = newPromptText.toLowerCase()
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.includes(w));

        if (cleanWords.length === 0) return; // Short message/continuation

        if (activeTopicKeywords.length > 0) {
            const intersection = cleanWords.filter(w => activeTopicKeywords.includes(w));
            const overlapRatio = intersection.length / Math.min(cleanWords.length, activeTopicKeywords.length);
            
            if (overlapRatio < 0.15 && cleanWords.length > 2) {
                logToTerminal("System Context Shift: User changed discussion focus area.", "warning");
            }
        }
        activeTopicKeywords = cleanWords;
    }

    // Inspects user prompt for graphic drawing triggers using advanced regex patterns
    function detectImageGenerationIntent(promptText) {
        const clean = promptText.trim().toLowerCase();
        
        // 1. Slash Command parsing
        if (clean.startsWith("/image")) {
            return promptText.substring(6).trim();
        }
        
        // 2. Semantic RegEx matching standard prompts
        const patterns = [
            /^(?:generate|create|draw|paint|illustrate|make)\s+(?:an?\s+)?(?:image|picture|drawing|painting|graphic|illustration)\s+(?:of\s+)?(.*)$/i,
            /^(?:draw|paint|illustrate|make)\s+(?:an?\s+)?(.*)$/i,
            /^(?:create|generate)\s+(?:an?\s+)?(.*)\s+(?:image|picture|drawing|illustration)$/i
        ];
        
        for (const regex of patterns) {
            const match = clean.match(regex);
            if (match && match[1]) {
                const startIdx = clean.indexOf(match[1]);
                return promptText.substring(startIdx).trim();
            }
        }
        
        // 3. Fallback: simple keyword prefix checks
        const simpleTriggers = ["create image", "generate image", "draw", "paint", "illustrate"];
        for (const trigger of simpleTriggers) {
            if (clean.startsWith(trigger)) {
                return promptText.substring(trigger.length).trim();
            }
        }
        
        return null;
    }

    // -----------------------------------------------------------------
    // 11. Live Backend Prompt Lab Execution Loop
    // -----------------------------------------------------------------
    async function handleSendPrompt() {
        if (!promptInput) return;
        const rawText = promptInput.value.strip ? promptInput.value.strip() : promptInput.value.trim();
        if (!rawText && !attachedFileMetadata) return;

        // Clear welcome helper splash block on first execution run
        const welcomePane = document.querySelector(".ai-studio-welcome-pane");
        if (welcomePane) {
            welcomePane.style.display = "none";
        }

        const isMiniModel = dropdownModel && (dropdownModel.value === "gpt-5.4-mini");

        // Step A: Parse user's selection context heuristics (Option tracking)
        const resolvedText = resolveOptionSelectionContext(rawText);

        // Step B: Evaluate discussion context shifts
        trackTopicKeywordsShift(rawText);

        // Step C: Check if intent is general image generation
        const imagePrompt = detectImageGenerationIntent(rawText);

        // Format message appending references if attached
        let messageOutput = rawText;
        let attachmentSegment = "";
        if (attachedFileMetadata) {
            attachmentSegment = `\n\n[Attached Reference Context: ${attachedFileMetadata.name}]\n\`\`\`\n${attachedFileMetadata.content}\n\`\`\``;
            messageOutput += `<div class="mt-2.5 flex items-center gap-1.5 px-2 py-1 bg-neutral-900 border border-[#1f1f29] rounded text-[10px] text-neutral-400 font-mono w-fit">
                <span>📎 Reference Context: ${attachedFileMetadata.name}</span>
            </div>`;
        }

        const startTime = performance.now();

        // Append User Prompts Centered
        createCenteredMessageBubble("user", messageOutput, "0.0");

        // Save into local history array for back-and-forth continuity
        chatHistory.push({ role: "user", content: resolvedText + attachmentSegment });

        // Clear inputs
        promptInput.value = "";
        promptInput.style.height = "auto";
        attachedFileMetadata = null;
        if (uploadPreview) uploadPreview.classList.add("hidden");
        if (fileUploadInput) fileUploadInput.value = "";

        // Setup empty assistant bubble placeholder
        const assistantBubble = createCenteredMessageBubble("assistant", `
            <div class="flex items-center gap-2 text-neutral-500 font-mono text-[11px] py-1">
                <div class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></div>
                <span class="loading-status-text">Analyzing instructions & dispatching query...</span>
            </div>
        `, "0.0", false); // Do not persist the loading state

        const loadingStatusEl = assistantBubble.querySelector(".loading-status-text");

        // Case 1: Handle live Image Generation Route
        if (imagePrompt) {
            if (loadingStatusEl) loadingStatusEl.innerText = "Connecting to universal graphic engine (DALL-E)...";
            logToTerminal(`AI Studio Image: Requesting universal graphic model for prompt: "${imagePrompt}"`, "system");

            try {
                const imgResponse = await fetch(`${RENDER_BACKEND_URL}/api/ai-studio/generate-image`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: imagePrompt })
                });

                if (!imgResponse.ok) {
                    throw new Error(`Server returned error status: ${imgResponse.status}`);
                }

                const imgData = await imgResponse.json();
                if (imgData.success) {
                    const duration = ((performance.now() - startTime) / 1000).toFixed(1);
                    const htmlCard = `
                        <div class="space-y-3">
                            <p class="text-xs text-neutral-300">Here is your auto-generated drawing illustration:</p>
                            <div class="rounded-lg overflow-hidden border border-[#1f1f29] shadow-2xl max-w-sm my-2 bg-neutral-900">
                                <img src="${imgData.image_url}" class="w-full h-auto object-cover cursor-zoom-in" alt="Universal generated card" onclick="window.open(this.src)">
                            </div>
                        </div>
                    `;
                    
                    const contentBody = assistantBubble.querySelector(".ai-studio-box-body");
                    if (contentBody) contentBody.innerHTML = htmlCard;

                    const outsideMeta = assistantBubble.querySelector(".ai-studio-outside-meta");
                    if (outsideMeta) {
                        const now = new Date();
                        outsideMeta.innerHTML = `<span>[${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span><span>•</span><span>${duration}s response</span>`;
                    }

                    // Save assistant message to chat history
                    chatHistory.push({ role: "assistant", content: `Image generation: ${imagePrompt}` });
                    savePersistedHistory();
                    logToTerminal("AI Studio universal image retrieved.", "success");
                }
            } catch (err) {
                logToTerminal(`AI Studio graphic process failed: ${err.message}`, "error");
                const contentBody = assistantBubble.querySelector(".ai-studio-box-body");
                if (contentBody) contentBody.innerHTML = `<span class="text-red-400 font-mono">Image Generation Failure: ${err.message}</span>`;
            }
            return;
        }

        // Case 2: Handle fallback mock model
        if (!isMiniModel) {
            setTimeout(() => {
                const totalSec = "1.2";
                const contentBody = assistantBubble.querySelector(".ai-studio-box-body");
                if (contentBody) {
                    contentBody.innerHTML = parseMarkdownToHTML("==T1ERA-Ultra-v2== is currently inactive. Select the live **gpt-5.4-mini** model option inside the settings panel to initiate real backend transactions.");
                }
                const outsideMeta = assistantBubble.querySelector(".ai-studio-outside-meta");
                if (outsideMeta) {
                    const now = new Date();
                    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    outsideMeta.innerHTML = `
                        <span>[${timestamp}]</span>
                        <span>•</span>
                        <span>${totalSec}s response</span>
                    `;
                }
                chatHistory.push({ role: "assistant", content: "==T1ERA-Ultra-v2== is currently inactive." });
                savePersistedHistory();
                logToTerminal("Mock model executed.", "success");
            }, 1000);
            return;
        }

        // Setup progressive status logging while request is pending
        let progressTicks = 0;
        const progressInterval = setInterval(() => {
            progressTicks += 5;
            if (progressTicks === 5) {
                if (loadingStatusEl) loadingStatusEl.innerText = "Awaiting container wake up (Render Free Tier cold start)...";
                logToTerminal("No response packet yet. Render container might be booting up...", "warning");
            } else if (progressTicks === 15) {
                if (loadingStatusEl) loadingStatusEl.innerText = "Connecting to standard backend layers...";
            } else if (progressTicks === 30) {
                if (loadingStatusEl) loadingStatusEl.innerText = "Compiling prompt context & calling inference core...";
            }
        }, 5000);

        // AbortController setup to prevent infinite waiting
        const controller = new AbortController();
        const safetyTimeout = setTimeout(() => {
            controller.abort();
        }, 45000); // 45-second fallback abort guard

        try {
            logToTerminal("Dispatching playground prompt packet to live backend...", "system");

            // Compile system settings variables
            const systemInstructions = document.getElementById("setting-ai-studio-system") ? document.getElementById("setting-ai-studio-system").value.trim() : "";
            
            // Build lightweight directory context if LRU is enabled
            let contextPayload = "";
            const isLruActive = extToggleLru && extToggleLru.checked;
            if (isLruActive && typeof window.getWorkspaceFileSystem === 'function') {
                const currentFileSystem = window.getWorkspaceFileSystem();
                const allFilesList = flattenFilesList(currentFileSystem);
                contextPayload += "=== WORKSPACE DIRECTORY INDEX ===\n";
                allFilesList.forEach(file => {
                    contextPayload += `Path: ${file.name} | Type: ${file.isMedia ? 'Media' : 'Code'}\n`;
                });
            }

            const payload = {
                messages: chatHistory,
                workspace_context: contextPayload,
                system_prompt: systemInstructions || null
            };

            const response = await fetch(`${RENDER_BACKEND_URL}/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                signal: controller.signal,
                body: JSON.stringify(payload)
            });

            // Stop loading logging & safety timeout triggers
            clearInterval(progressInterval);
            clearTimeout(safetyTimeout);

            if (!response.ok) {
                throw new Error(`Server returned error status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success === false || data.error) {
                throw new Error(data.error || "Generation error.");
            }

            const aiText = data.content;
            
            // Save inside local log history
            chatHistory.push({ role: "assistant", content: aiText });

            const endTime = performance.now();
            const totalSec = ((endTime - startTime) / 1000).toFixed(1);

            // Print output inside bubble parsing markdown structures
            const contentBody = assistantBubble.querySelector(".ai-studio-box-body");
            if (contentBody) {
                contentBody.innerHTML = parseMarkdownToHTML(aiText);
            }

            // Sync dynamic latency seconds to the outside meta label
            const outsideMeta = assistantBubble.querySelector(".ai-studio-outside-meta");
            if (outsideMeta) {
                const now = new Date();
                const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                outsideMeta.innerHTML = `
                    <span>[${timestamp}]</span>
                    <span>•</span>
                    <span>${totalSec}s response</span>
                `;
            }

            savePersistedHistory();
            logToTerminal("Live backend response packets retrieved successfully.", "success");

        } catch (err) {
            clearInterval(progressInterval);
            clearTimeout(safetyTimeout);
            console.error(err);

            let displayError = err.message;
            if (err.name === "AbortError") {
                displayError = "Request timed out (Render container took >45 seconds to respond. Check if the server is still sleeping).";
                logToTerminal("Downstream transaction aborted: Render server spin-up timed out.", "error");
            } else {
                logToTerminal(`Prompt Lab execution crashed: ${err.message}`, "error");
            }
            
            const contentBody = assistantBubble.querySelector(".ai-studio-box-body");
            if (contentBody) {
                contentBody.innerHTML = `<span class="text-red-400 font-mono">Inference Failure: ${displayError}</span>`;
            }
        }
    }

    if (btnSend) {
        btnSend.addEventListener("click", handleSendPrompt);
    }

    if (promptInput) {
        promptInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendPrompt();
            }
        });
    }

    if (btnClear) {
        btnClear.addEventListener("click", function () {
            chatHistory = [];
            localStorage.removeItem("t1era_ai_studio_chat_history");
            if (chatFeed) {
                chatFeed.innerHTML = `
                    <div class="ai-studio-welcome-pane max-w-3xl mx-auto text-center py-10 space-y-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg">
                            <span class="text-white text-base font-black tracking-wider">T1</span>
                        </div>
                        <div class="space-y-1">
                            <h2 class="text-lg font-bold text-white">Welcome to T1ERA Prompt Lab</h2>
                            <p class="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                                A sandbox combining Claude's structured parameters, Gemini's wide-centered layouts, and ChatGPT's fast conversational flows.
                            </p>
                        </div>
                    </div>
                `;
            }
            logToTerminal("Clear prompt log feed.", "warning");
        });
    }

    // Hydrate saved conversations straight out of storage on startup
    loadPersistedHistory();

});
