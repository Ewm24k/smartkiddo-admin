/**
 * T1ERA AI Studio Workspace Playground Frontend Script
 * ChatGPT + Gemini + Claude Hybrid Interface
 */
document.addEventListener("DOMContentLoaded", function () {
    
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

    let isRecordingSpeech = false;
    let attachedFileMetadata = null;

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
            // Unhide Playground view
            if (viewStudioSelector && viewAiStudioSelector) {
                viewStudioSelector.classList.add("hidden");
                viewStudioSelector.classList.remove("block");
                viewAiStudioSelector.classList.remove("hidden");
                viewAiStudioSelector.classList.add("block");
            }
            
            // Auto-collapse navigation sidebar for maximum playground clearance
            if (document.body && !document.body.classList.contains('sidebar-collapsed')) {
                document.body.classList.add('sidebar-collapsed');
                // Force sync hamburger toggle state
                const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
                if (sidebarToggleIcon) {
                    sidebarToggleIcon.innerHTML = `
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    `;
                }
            }

            // Sync main scroll styles to lock height
            const mainContentScroll = document.getElementById('main-content-scroll');
            if (mainContentScroll) {
                mainContentScroll.classList.remove('overflow-y-auto');
                mainContentScroll.classList.add('overflow-hidden');
            }

            // Expand outer content wrapper fully (Remove max-width restrictions and side spaces)
            const mainContentInner = document.getElementById('main-content-inner');
            if (mainContentInner) {
                mainContentInner.classList.remove('p-8', 'max-w-7xl', 'mx-auto', 'justify-between');
                mainContentInner.classList.add('p-2', 'h-full', 'w-full', 'max-w-none', 'flex-1');
            }

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

            // Restore scroll styles
            const mainContentScroll = document.getElementById('main-content-scroll');
            if (mainContentScroll) {
                mainContentScroll.classList.add('overflow-y-auto');
                mainContentScroll.classList.remove('overflow-hidden');
            }

            // Restore default container layout metrics (Re-apply original spaces & limits)
            const mainContentInner = document.getElementById('main-content-inner');
            if (mainContentInner) {
                mainContentInner.classList.remove('p-2', 'w-full', 'max-w-none', 'flex-1');
                mainContentInner.classList.add('p-8', 'max-w-7xl', 'mx-auto', 'justify-between');
            }

            logToTerminal("Exited AI Studio. Restored main dashboard limits.", "system");
        });
    }

    // -----------------------------------------------------------------
    // 3. UI Controls and Custom Sliders Binding
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

    if (dropdownModel && activeModelBadge) {
        dropdownModel.addEventListener("change", function () {
            const selectedText = this.options[this.selectedIndex].text;
            activeModelBadge.innerText = `${selectedText} (Manual)`;
            logToTerminal(`AI Studio active model swapped: ${this.value}`, "system");
        });
    }

    // Bind Quick Select Prompt Template Cards
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
    // 5. File Upload Simulation
    // -----------------------------------------------------------------
    if (btnAttach && fileUploadInput) {
        btnAttach.addEventListener("click", function (e) {
            e.stopPropagation();
            fileUploadInput.click();
        });
    }

    if (fileUploadInput) {
        fileUploadInput.addEventListener("change", function (e) {
            const file = e.target.files[0];
            if (!file) return;

            attachedFileMetadata = {
                name: file.name,
                size: file.size
            };

            if (uploadedFileName && uploadPreview) {
                uploadedFileName.innerText = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                uploadPreview.classList.remove("hidden");
            }
            logToTerminal(`AI Studio attached reference context: ${file.name}`, "info");
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
                
                // Set mock speech result text after a delay
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
            e.stopPropagation(); // Avoid closing dropdown when clicking elements inside
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
    // 8. Centered Chat Message Generation Layouts (Centered Box Block Structure)
    // -----------------------------------------------------------------
    function createCenteredMessageBubble(sender, content, generationTimeSec = "0.0") {
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const wrapper = document.createElement("div");
        wrapper.className = "ai-studio-message-turn-container w-full py-4";

        const isUser = sender === "user";
        const speakerLabel = isUser ? "YOU" : (dropdownModel ? dropdownModel.options[dropdownModel.selectedIndex].text.toUpperCase() : "T1ERA AI");
        const headerClass = isUser ? "user" : "assistant";

        // Structured inside standard centered reading viewport
        wrapper.innerHTML = `
            <div class="ai-studio-reading-pane mx-auto">
                <div class="ai-studio-msg-box relative">
                    
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
                    <div class="ai-studio-box-body">
                        ${content}
                    </div>

                    <!-- FOOTER SECTION (Centered Alignment, Small Font) -->
                    <div class="ai-studio-box-footer">
                        ${isUser ? 'CLIENT INFERENCE PIPELINE REQUEST' : 'PROMPT LAB CONTEXT INTERACTION LOG'}
                    </div>

                </div>
                
                <!-- OUTSIDE BOTTOM LABEL (Below box outside on left corner) -->
                <div class="ai-studio-outside-meta select-none flex items-center gap-1.5 font-mono">
                    <span>[${timestamp}]</span>
                    <span>•</span>
                    <span>${generationTimeSec}s response</span>
                </div>
            </div>
        `;

        // Bind Copy Button Clipboard trigger
        const copyBtn = wrapper.querySelector(".btn-copy-msg");
        if (copyBtn) {
            copyBtn.addEventListener("click", function() {
                const textBody = wrapper.querySelector(".ai-studio-box-body");
                if (textBody) {
                    const textToCopy = textBody.innerText;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        logToTerminal("Message copied to clipboard.", "success");
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

        if (chatFeed) {
            chatFeed.appendChild(wrapper);
            chatFeed.scrollTop = chatFeed.scrollHeight;
        }

        return wrapper;
    }

    async function handleSendPrompt() {
        if (!promptInput) return;
        const rawText = promptInput.value.trim();
        if (!rawText && !attachedFileMetadata) return;

        // Clear welcome helper splash block on first execution run
        const welcomePane = document.querySelector(".ai-studio-welcome-pane");
        if (welcomePane) {
            welcomePane.style.display = "none";
        }

        // Format message appending references if attached
        let messageOutput = rawText;
        if (attachedFileMetadata) {
            messageOutput += `<div class="mt-2.5 flex items-center gap-1.5 px-2 py-1 bg-neutral-900 border border-[#1f1f29] rounded text-[10px] text-neutral-400 font-mono w-fit">
                <span>📎 Reference Context: ${attachedFileMetadata.name}</span>
            </div>`;
        }

        const startTime = performance.now();

        // Append User Prompts Centered
        createCenteredMessageBubble("user", messageOutput, "0.0");

        // Clear fields
        promptInput.value = "";
        promptInput.style.height = "auto";
        attachedFileMetadata = null;
        if (uploadPreview) uploadPreview.classList.add("hidden");
        if (fileUploadInput) fileUploadInput.value = "";

        // Trigger loading mock streaming response centered
        logToTerminal("AI Studio compiling parameters context...", "system");
        
        // Setup empty assistant bubble placeholder
        const assistantBubble = createCenteredMessageBubble("assistant", `
            <div class="flex items-center gap-2 text-neutral-500 font-mono text-[11px] py-1">
                <div class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></div>
                <span>Generating concepts...</span>
            </div>
        `);

        // Simulate streaming response delay
        setTimeout(() => {
            const finalMockResponse = `I have updated your AI sandbox configurations in real-time. Here are the parameters applied:
            <br><br>
            1. <strong>Temperature</strong> is set to <code>${rangeTemp ? rangeTemp.value : '0.7'}</code>.
            <br>
            2. <strong>Lexical Sanitizer</strong> filters are active to prevent vocabulary leaks in Malaysian translations.
            <br><br>
            You can edit physical character traits and system constraints inside the parameter dock. What script element would you like to review next?`;
            
            const endTime = performance.now();
            const totalSec = ((endTime - startTime) / 1000).toFixed(1);

            const contentBody = assistantBubble.querySelector(".ai-studio-message-body");
            if (contentBody) {
                contentBody.innerHTML = finalMockResponse;
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

            logToTerminal("AI Studio response completed successfully.", "success");
        }, 1500);
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

});
