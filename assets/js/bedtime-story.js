document.addEventListener("DOMContentLoaded", function () {
    // -----------------------------------------------------------------
    // 1. DOM Elements
    // -----------------------------------------------------------------
    const cardCreateBedtimeStory = document.getElementById("card-create-bedtime-story");
    const viewT1eraStudio = document.getElementById("view-t1era-studio");
    const viewBedtimeStory = document.getElementById("view-bedtime-story");
    const breadcrumbTitle = document.getElementById("breadcrumb-title");

    // Steppers and navigation buttons
    const steps = document.querySelectorAll(".step-item");
    const pipelinePanels = document.querySelectorAll(".pipeline-panel");

    // AI inputs and controls
    const btnGenerateStory = document.getElementById("btn-generate-story");
    const btnContinueGeneration = document.getElementById("btn-story-continue-generation");
    const btnContinueStoryboard = document.getElementById("btn-story-continue-storyboard");
    const btnContinueVideo = document.getElementById("btn-story-continue-video");
    const btnRegenerateStoryboard = document.getElementById("btn-story-regenerate-storyboard");
    const statusBadgeText = document.getElementById("story-status-text");
    const statusBadgeIndicator = document.getElementById("story-status-indicator");
    const storyLogsContainer = document.getElementById("story-generation-logs");

    // UI Interactive Input References
    const inputAgeGroup = document.getElementById("setting-age-group");
    const inputVoiceStyle = document.getElementById("setting-voice-style");
    const inputVisualStyle = document.getElementById("setting-visual-style");
    const inputStoryLength = document.getElementById("setting-story-length");
    const inputMusicMood = document.getElementById("setting-music-mood");
    const inputConceptBrief = document.getElementById("setting-concept-brief");

    // Dynamic Result UI Elements
    const storyTitleEl = document.getElementById("res-story-title");
    const storyBriefEl = document.getElementById("res-story-brief");
    const scriptEditorTextarea = document.getElementById("res-script-textarea");
    const voiceWaveformContainer = document.getElementById("res-voice-waveform");
    const voiceAudioPlayer = document.getElementById("res-voice-player");
    const storyboardGrid = document.getElementById("res-storyboard-grid");
    const videoVideoContainer = document.getElementById("res-video-player-container");
    const publishCoverImage = document.getElementById("res-publish-cover");
    const publishTitleInput = document.getElementById("res-publish-title");
    const publishDescTextarea = document.getElementById("res-publish-desc");

    // Action Trigger Buttons inside views
    const btnStoryBack = document.getElementById("btn-story-back");
    const storyStudioMaximizeBtn = document.getElementById("story-studio-maximize-btn");
    const storyStudioWorkspace = document.getElementById("story-studio-workspace");
    const mainContentInner = document.getElementById("main-content-inner");

    const btnCancelStudio = document.getElementById("btn-story-cancel");
    const btnSaveDraftStudio = document.getElementById("btn-story-save-draft");
    const btnPublishStudio = document.getElementById("btn-story-publish");

    // Scoped Configuration (Must match Render API settings)
    const RENDER_BACKEND_URL = "https://smartkiddo-admin.onrender.com";

    // Stepper State Data Tracking
    let currentPipelineActiveIndex = 0;
    let pipelineProgressState = {
        title: "",
        brief: "",
        script: "",
        voiceUrl: "",
        scenes: [],
        compiledVideoUrl: "",
        isGenerated: false
    };

    // Icons for Expand & Shrink States
    const expandIcon = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4"></path>
        </svg>
    `;

    const shrinkIcon = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h4v4m12-4h-4v-4M4 20h4v-4m12 4h-4v-4"></path>
        </svg>
    `;

    // -----------------------------------------------------------------
    // 2. Logging utility for pipeline console logs
    // -----------------------------------------------------------------
    function logToStudioConsole(message, type = "info") {
        if (!storyLogsContainer) return;
        const timestamp = new Date().toLocaleTimeString();
        let colorClass = "text-neutral-400";
        let prefix = "[info]";

        if (type === "success") {
            colorClass = "text-emerald-400";
            prefix = "[success]";
        } else if (type === "error") {
            colorClass = "text-red-400";
            prefix = "[error]";
        } else if (type === "warning") {
            colorClass = "text-amber-400";
            prefix = "[warning]";
        }

        const logRow = document.createElement("div");
        logRow.className = `${colorClass} text-[10px] leading-relaxed font-mono log-item-animation`;
        logRow.innerHTML = `<span class="text-neutral-600">[${timestamp}]</span> <span class="font-bold">${prefix}</span> ${message}`;
        
        storyLogsContainer.appendChild(logRow);
        storyLogsContainer.scrollTop = storyLogsContainer.scrollHeight;
    }

    // Generates a base64 sleepy cartoon vector illustration to prevent real landscape/portrait photos as fallbacks
    function getCartoonPlaceholder(sceneNumber) {
        const colors = [
            ["#4f46e5", "#1e1b4b", "#818cf8"], // Indigo twilight
            ["#0d9488", "#115e59", "#2dd4bf"], // Teal mystical woods
            ["#db2777", "#831843", "#f472b6"], // Pink candy clouds
            ["#ca8a04", "#713f12", "#fde047"], // Golden sky
        ];
        const c = colors[(sceneNumber - 1) % colors.length];
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="100%" height="100%">
            <defs>
                <linearGradient id="bg-${sceneNumber}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="${c[1]}" />
                    <stop offset="100%" stop-color="${c[0]}" />
                </linearGradient>
            </defs>
            <rect width="400" height="200" fill="url(#bg-${sceneNumber})" />
            <circle cx="50" cy="40" r="1.5" fill="#fff" opacity="0.8" />
            <circle cx="120" cy="30" r="1" fill="#fff" opacity="0.5" />
            <circle cx="280" cy="50" r="2" fill="${c[2]}" opacity="0.9" />
            <circle cx="340" cy="25" r="1.5" fill="#fff" opacity="0.7" />
            <path d="M 0,200 L 0,150 Q 100,120 200,160 T 400,140 L 400,200 Z" fill="${c[1]}" opacity="0.7" />
            <path d="M 0,200 L 0,170 Q 150,140 300,180 T 400,175 L 400,200 Z" fill="${c[0]}" opacity="0.9" />
            <path d="M 320,40 A 15,15 0 1,0 345,55 A 12,12 0 1,1 320,40" fill="#fef08a" />
            <g transform="translate(180, 140) scale(0.6)">
                <ellipse cx="20" cy="25" rx="6" ry="20" fill="#f5f5f5" />
                <ellipse cx="20" cy="25" rx="3" ry="15" fill="#fecdd3" />
                <ellipse cx="35" cy="28" rx="6" ry="18" fill="#f5f5f5" />
                <ellipse cx="35" cy="28" rx="3" ry="13" fill="#fecdd3" />
                <ellipse cx="35" cy="65" rx="22" ry="18" fill="#e5e5e5" />
                <circle cx="30" cy="45" r="15" fill="#f5f5f5" />
                <path d="M 23,45 Q 26,48 29,45" stroke="#1e293b" stroke-width="1.5" fill="none" />
                <path d="M 33,45 Q 36,48 39,45" stroke="#1e293b" stroke-width="1.5" fill="none" />
                <polygon points="30,49 32,49 31,51" fill="#fecdd3" />
                <circle cx="58" cy="68" r="6" fill="#f5f5f5" />
            </g>
            <text x="20" y="30" font-family="monospace" font-size="10" fill="#93c5fd" opacity="0.7">CARTOON ILLUSTRATION PLACEHOLDER</text>
        </svg>`;
        return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    }

    // -----------------------------------------------------------------
    // 3. Navigation Controls
    // -----------------------------------------------------------------
    if (cardCreateBedtimeStory) {
        cardCreateBedtimeStory.addEventListener("click", function () {
            if (viewT1eraStudio && viewBedtimeStory) {
                viewT1eraStudio.classList.add("hidden");
                viewT1eraStudio.classList.remove("block");
                viewBedtimeStory.classList.remove("hidden");
                viewBedtimeStory.classList.add("block");

                if (breadcrumbTitle) {
                    breadcrumbTitle.innerText = "T1ERA Studio / Bedtime Story";
                }
                
                logToStudioConsole("Bedtime Story Studio initialized.", "info");
                logToStudioConsole("Awaiting your parameters... Set settings and click 'Generate Bedtime Story'.", "warning");
            }
        });
    }

    function returnToT1eraStudio() {
        if (viewT1eraStudio && viewBedtimeStory) {
            // Restore window bounds cleanly if left maximized when navigating back
            if (storyStudioWorkspace && storyStudioWorkspace.classList.contains("studio-maximized")) {
                toggleStoryMaximize();
            }

            viewBedtimeStory.classList.add("hidden");
            viewBedtimeStory.classList.remove("block");
            viewT1eraStudio.classList.remove("hidden");
            viewT1eraStudio.classList.add("block");

            if (breadcrumbTitle) {
                breadcrumbTitle.innerText = "T1ERA Studio";
            }
            logToStudioConsole("Exited Bedtime Story Studio.", "info");
        }
    }

    if (btnStoryBack) {
        btnStoryBack.addEventListener("click", function() {
            returnToT1eraStudio();
        });
    }

    if (btnCancelStudio) {
        btnCancelStudio.addEventListener("click", function() {
            if (confirm("Are you sure you want to exit? Your unsaved generation progress will be lost.")) {
                returnToT1eraStudio();
            }
        });
    }

    // -----------------------------------------------------------------
    // 4. Maximize Workspace Toggle Controls
    // -----------------------------------------------------------------
    function toggleStoryMaximize() {
        if (!storyStudioWorkspace || !mainContentInner || !storyStudioMaximizeBtn) return;

        storyStudioWorkspace.classList.toggle("studio-maximized");
        mainContentInner.classList.toggle("container-maximized");

        if (storyStudioWorkspace.classList.contains("studio-maximized")) {
            storyStudioMaximizeBtn.innerHTML = shrinkIcon;
            storyStudioMaximizeBtn.setAttribute("title", "Minimize Workspace");
            logToStudioConsole("Bedtime Story workspace expanded to full dimensions.", "info");
        } else {
            storyStudioMaximizeBtn.innerHTML = expandIcon;
            storyStudioMaximizeBtn.setAttribute("title", "Maximize Workspace");
            logToStudioConsole("Bedtime Story workspace dimensions restored to default limits.", "info");
        }
    }

    if (storyStudioMaximizeBtn) {
        storyStudioMaximizeBtn.addEventListener("click", toggleStoryMaximize);
    }

    // -----------------------------------------------------------------
    // 5. Stepper Interaction logic
    // -----------------------------------------------------------------
    steps.forEach((step, index) => {
        step.addEventListener("click", function () {
            switchPipelineStepPanel(index);
        });
    });

    function switchPipelineStepPanel(index) {
        currentPipelineActiveIndex = index;
        
        // Update active class styles for step tags
        steps.forEach((s, idx) => {
            s.classList.remove("active");
            if (idx === index) {
                s.classList.add("active");
            }
        });

        // Toggle panel interfaces in the center viewport
        pipelinePanels.forEach((panel, idx) => {
            panel.classList.add("hidden");
            panel.classList.remove("block");
            if (idx === index) {
                panel.classList.remove("hidden");
                panel.classList.add("block");
            }
        });

        logToStudioConsole(`Switched to viewer: ${steps[index].querySelector(".step-label").innerText}`, "info");
    }

    // -----------------------------------------------------------------
    // 6. Automated Pipeline Simulation Workflow
    // -----------------------------------------------------------------
    if (btnGenerateStory) {
        btnGenerateStory.addEventListener("click", function () {
            if (pipelineProgressState.isGenerated) {
                if (!confirm("A bedtime story is already active. Do you wish to restart the generation pipeline?")) {
                    return;
                }
            }
            startPipelineSimulation();
        });
    }

    async function startPipelineSimulation() {
        pipelineProgressState.isGenerated = false;
        btnGenerateStory.disabled = true;
        btnGenerateStory.innerText = "Generating...";
        btnGenerateStory.classList.add("opacity-50");

        // Hide continue buttons during initial generation
        if (btnContinueGeneration) {
            btnContinueGeneration.classList.add("hidden");
        }
        if (btnContinueStoryboard) {
            btnContinueStoryboard.classList.add("hidden");
        }
        if (btnContinueVideo) {
            btnContinueVideo.classList.add("hidden");
        }
        if (btnRegenerateStoryboard) {
            btnRegenerateStoryboard.classList.add("hidden");
        }

        // Dynamically query DOM references directly to protect parameter integrity
        const ageVal = inputAgeGroup.value;
        const voiceVal = inputVoiceStyle.value;
        
        const openaiVoiceEl = document.getElementById("setting-openai-voice");
        const openaiVoiceVal = openaiVoiceEl ? openaiVoiceEl.value.trim().toLowerCase() : "nova";

        const briefVal = inputConceptBrief.value.trim() || "A small rabbit who finds a glowing star in the woods.";
        const visualVal = inputVisualStyle.value;
        const lengthVal = inputStoryLength.value;
        const musicVal = inputMusicMood.value;

        // Reset elements
        statusBadgeText.innerText = "Generating Concept...";
        statusBadgeIndicator.className = "w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
        storyLogsContainer.innerHTML = "";

        // Set Step Completed classes
        steps.forEach(s => s.className = "step-item flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors");

        logToStudioConsole("Kicking off bedtime story AI sequence...", "info");
        logToStudioConsole(`Target age demographic: ${ageVal} | Theme direction: ${briefVal}`, "info");
        logToStudioConsole(`Selected OpenAI Voice model character: ${openaiVoiceVal}`, "info");

        // --- STEP 1: Story Brief & Concept Generation (LIVE API CALL) ---
        switchPipelineStepPanel(0);
        logToStudioConsole("Contacting OpenAI proxy server to synthesize story concept...", "warning");
        
        try {
            const apiResponse = await fetch(`${RENDER_BACKEND_URL}/api/bedtime-story/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    concept_brief: briefVal,
                    age_group: ageVal,
                    voice_style: voiceVal,
                    openai_voice: openaiVoiceVal,
                    visual_style: visualVal,
                    story_length: lengthVal,
                    music_mood: musicVal
                })
            });

            if (!apiResponse.ok) {
                throw new Error(`Server returned error status code: ${apiResponse.status}`);
            }

            const apiData = await apiResponse.json();

            if (apiData.success) {
                pipelineProgressState.title = apiData.title;
                pipelineProgressState.brief = apiData.brief;
                pipelineProgressState.script = apiData.script;

                // Populate Step 1 and Step 2 UI containers with live AI content
                if (storyTitleEl) storyTitleEl.innerText = pipelineProgressState.title;
                if (storyBriefEl) storyBriefEl.innerText = pipelineProgressState.brief;
                if (scriptEditorTextarea) scriptEditorTextarea.value = pipelineProgressState.script;

                steps[0].classList.add("completed");
                logToStudioConsole(`Successfully completed Step 1: Concept Brief generated. Title: "${pipelineProgressState.title}"`, "success");
            } else {
                throw new Error(apiData.error || "Failed to generate story details.");
            }

        } catch (apiError) {
            console.error("OpenAI API Bedtime Story Generator crashed:", apiError);
            logToStudioConsole(`Generation crashed: ${apiError.message}`, "error");
            alert(`AI Pipeline Failed: ${apiError.message}. Fallback simulation values will be used to protect the session.`);

            // Fallback content in case API/Token credentials are empty on Render
            pipelineProgressState.title = `The Whispering Star of ${musicVal}`;
            pipelineProgressState.brief = `An adorable story about discovery and dreams for ages ${ageVal}.`;
            pipelineProgressState.script = `Once upon a time, there lived a soft, little rabbit named Barnaby. Barnaby noticed a small, flickering light at the base of the old Oak Tree. He discovered a tiny star shining gently under the mushroom caps.`;
            
            if (storyTitleEl) storyTitleEl.innerText = pipelineProgressState.title;
            if (storyBriefEl) storyBriefEl.innerText = pipelineProgressState.brief;
            if (scriptEditorTextarea) scriptEditorTextarea.value = pipelineProgressState.script;
        }

        // --- STEP 2: Write Story Script Draft (PRE-HYDRATED BY STEP 1) ---
        statusBadgeText.innerText = "Writing Script...";
        switchPipelineStepPanel(1);
        logToStudioConsole("Drafting narrative paragraphs and script breakdowns...", "warning");
        await delay(1500);

        steps[1].classList.add("completed");
        logToStudioConsole("Successfully completed Step 2: Story script drafted.", "success");

        // PAUSE POINT: Stop automatic continuation to let the user review and edit the draft script
        statusBadgeText.innerText = "Review Script";
        statusBadgeIndicator.className = "w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse";
        logToStudioConsole("Pipeline paused. You can edit the narrative script now in the editor container.", "warning");
        logToStudioConsole("Click the 'Continue Generation' button inside the editor viewport when ready.", "info");

        if (btnContinueGeneration) {
            btnContinueGeneration.classList.remove("hidden");
        }

        // Restore the generate button so user can restart settings if needed
        btnGenerateStory.disabled = false;
        btnGenerateStory.innerText = "Re-Generate Bedtime Story";
        btnGenerateStory.classList.remove("opacity-50");
    }

    // Connect event listener to Continue button on Step 2
    if (btnContinueGeneration) {
        btnContinueGeneration.addEventListener("click", function() {
            // Secure edited text from textarea and write back to progress state
            if (scriptEditorTextarea) {
                pipelineProgressState.script = scriptEditorTextarea.value;
            }
            btnContinueGeneration.classList.add("hidden");
            continuePipelineSimulation();
        });
    }

    // Continues the workflow to generate dynamic voice narration based on the Step 2 script
    async function continuePipelineSimulation() {
        btnGenerateStory.disabled = true;
        btnGenerateStory.innerText = "Compiling...";
        btnGenerateStory.classList.add("opacity-50");

        // Hide downstream continuation trigger
        if (btnContinueStoryboard) {
            btnContinueStoryboard.classList.add("hidden");
        }

        // Dynamically query DOM selectors to capture current settings securely
        const voiceStyleEl = document.getElementById("setting-voice-style");
        const openaiVoiceEl = document.getElementById("setting-openai-voice");

        const voiceVal = voiceStyleEl ? voiceStyleEl.value : "animated";
        const openaiVoiceVal = openaiVoiceEl ? openaiVoiceEl.value.trim().toLowerCase() : "nova";

        // --- STEP 3: Narration Audio Generation (LIVE OPENAI TTS API CALL) ---
        statusBadgeText.innerText = "Generating Voice...";
        statusBadgeIndicator.className = "w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
        switchPipelineStepPanel(2);
        logToStudioConsole(`Requesting voice synthesis with OpenAI gpt-4o-mini-tts. Target Voice character: "${openaiVoiceVal}" | Tone style: "${voiceVal}"`, "warning");

        // Render active animated voice waveform visualizer block
        if (voiceWaveformContainer) {
            voiceWaveformContainer.innerHTML = "";
            for (let i = 0; i < 24; i++) {
                const bar = document.createElement("div");
                bar.className = "waveform-bar";
                bar.style.animationDelay = `${i * 0.08}s`;
                voiceWaveformContainer.appendChild(bar);
            }
        }

        try {
            // POST request targeting the voice backend proxy endpoint
            const voiceResponse = await fetch(`${RENDER_BACKEND_URL}/api/bedtime-story/generate-voice`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: pipelineProgressState.script,
                    voice: openaiVoiceVal,
                    voice_style: voiceVal,
                    response_format: "wav",
                    speed: 1.0
                })
            });

            if (!voiceResponse.ok) {
                throw new Error(`Server returned voice synthesis status: ${voiceResponse.status}`);
            }

            const voiceData = await voiceResponse.json();

            if (voiceData.success && voiceData.audio) {
                if (voiceAudioPlayer) {
                    voiceAudioPlayer.src = voiceData.audio;
                    voiceAudioPlayer.classList.remove("hidden");
                }
                pipelineProgressState.voiceUrl = voiceData.audio;
                steps[2].className = "step-item flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors completed";
                logToStudioConsole(`Successfully completed Step 3: Audio narration voice generated. System verified voice character: "${openaiVoiceVal}"`, "success");
            } else {
                throw new Error(voiceData.error || "Voice response was invalid.");
            }

        } catch (voiceError) {
            console.error("OpenAI Voice synthesis failed:", voiceError);
            logToStudioConsole(`Voice generation failed: ${voiceError.message}. Utilizing local simulation fallback.`, "error");
            
            // Fallback simulated file player if API/Token keys are missing
            if (voiceAudioPlayer) {
                voiceAudioPlayer.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
                voiceAudioPlayer.classList.remove("hidden");
            }
            steps[2].className = "step-item flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors completed";
        }

        // PAUSE POINT: Stop automatic continuation at Step 3 to let user listen to generated audio before designing scenes
        statusBadgeText.innerText = "Review Voice";
        statusBadgeIndicator.className = "w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse";
        logToStudioConsole("Pipeline paused at Step 3. Please listen to the voice output above.", "warning");
        logToStudioConsole("Click the 'Continue to Storyboard' button inside the viewport when ready.", "info");

        if (btnContinueStoryboard) {
            btnContinueStoryboard.classList.remove("hidden");
        }

        btnGenerateStory.disabled = false;
        btnGenerateStory.innerText = "Re-Generate Bedtime Story";
        btnGenerateStory.classList.remove("opacity-50");
    }

    // Connect event listener to Continue to Storyboard button on Step 3
    if (btnContinueStoryboard) {
        btnContinueStoryboard.addEventListener("click", function() {
            btnContinueStoryboard.classList.add("hidden");
            startStoryboardPipeline();
        });
    }

    // --- STEP 4 STORYBOARD STAGE COORDINATION (NEW LIVE PIPELINE FLOW) ---
    async function startStoryboardPipeline() {
        btnGenerateStory.disabled = true;
        btnGenerateStory.innerText = "Planning...";
        btnGenerateStory.classList.add("opacity-50");

        if (btnContinueVideo) {
            btnContinueVideo.classList.add("hidden");
        }
        if (btnRegenerateStoryboard) {
            btnRegenerateStoryboard.classList.add("hidden");
        }

        statusBadgeText.innerText = "Planning Scenes...";
        statusBadgeIndicator.className = "w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
        switchPipelineStepPanel(3);

        // Determine audio duration (use read duration pacing fallback if metadata is loading)
        let duration = voiceAudioPlayer ? voiceAudioPlayer.duration : 0;
        if (!duration || isNaN(duration) || duration <= 0) {
            const wordCount = pipelineProgressState.script.split(/\s+/).filter(w => w.length > 0).length;
            duration = Math.ceil((wordCount / 130) * 60);
            logToStudioConsole(`Audio metadata not fully loaded yet. Calculated estimated pacing duration: ${duration}s`, "warning");
        } else {
            duration = Math.ceil(duration);
            logToStudioConsole(`Voice audio duration confirmed: ${duration} seconds.`, "success");
        }

        const ageVal = inputAgeGroup.value;
        const visualVal = inputVisualStyle.value;

        logToStudioConsole("Contacting OpenAI to plan scene segments and visual prompt themes...", "warning");

        // Display planning loader directly inside grid
        if (storyboardGrid) {
            storyboardGrid.innerHTML = `
                <div class="text-center py-10 text-neutral-400 text-xs font-mono">
                    <div class="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2"></div>
                    AI is currently partitioning the script and writing prompts for gpt-image-1-mini...
                </div>
            `;
        }

        try {
            // CALL THE PLANNER ENDPOINT
            const planResponse = await fetch(`${RENDER_BACKEND_URL}/api/bedtime-story/plan-storyboard`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    story_script: pipelineProgressState.script,
                    audio_duration: duration,
                    visual_style: visualVal,
                    target_age: ageVal
                })
            });

            if (!planResponse.ok) {
                throw new Error(`Server returned planning status code: ${planResponse.status}`);
            }

            const planData = await planResponse.json();

            if (planData.success && planData.scenes && planData.scenes.length > 0) {
                pipelineProgressState.scenes = planData.scenes;
                logToStudioConsole(`Storyboard planned successfully. Partitioned story into ${planData.scenes.length} scenes.`, "success");
                
                // EXECUTE PARALLEL IMAGE GENERATIONS
                await executeParallelSceneGenerations();
            } else {
                throw new Error("Invalid scene data returned from planner.");
            }

        } catch (planError) {
            console.error("Storyboard planning failed:", planError);
            logToStudioConsole(`Planning failed: ${planError.message}. Utilizing simulation storyboard setup as backup.`, "error");
            
            // Simulation Fallback in case of backend limits (Now using dynamic suggested image boundaries matching specifications)
            // below 40s -> 4 scenes, 60s (1m) -> 6 scenes
            let suggestedCount = duration <= 40 ? 4 : (duration <= 60 ? 6 : 8);
            pipelineProgressState.scenes = [];
            for (let i = 1; i <= suggestedCount; i++) {
                const mark = Math.floor((duration / suggestedCount) * (i - 1));
                const min = Math.floor(mark / 60);
                const sec = mark % 60;
                const timestamp = `${min}:${sec < 10 ? '0' : ''}${sec}`;
                
                pipelineProgressState.scenes.push({
                    scene_number: i,
                    timestamp_marker: timestamp,
                    narration_segment: `Part ${i} of Barnaby's exciting child story adventure. Details match visual style parameters.`,
                    image_prompt: `Cute sleepy baby rabbit in a magical grassy forest, watercolor vector, ${visualVal}, cartoon style`
                });
            }
            await executeParallelSceneGenerations();
        }
    }

    // Coordinates concurrent generation calls utilizing gpt-image-1-mini low quality tier
    async function executeParallelSceneGenerations() {
        statusBadgeText.innerText = "Rendering Art...";
        logToStudioConsole(`Requesting parallel image generations via gpt-image-1-mini ($0.005/img tier)...`, "warning");

        if (storyboardGrid) {
            storyboardGrid.innerHTML = `
                <div class="text-center py-10 text-neutral-400 text-xs font-mono">
                    <div class="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2"></div>
                    Generating ${pipelineProgressState.scenes.length} illustrations in parallel on OpenAI...
                </div>
            `;
        }

        const visualVal = inputVisualStyle.value;

        try {
            const genResponse = await fetch(`${RENDER_BACKEND_URL}/api/bedtime-story/generate-scenes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prompts: pipelineProgressState.scenes.map(s => ({
                        scene_number: s.scene_number,
                        image_prompt: s.image_prompt
                    })),
                    visual_style: visualVal
                })
            });

            if (!genResponse.ok) {
                throw new Error(`Server returned image generation status: ${genResponse.status}`);
            }

            const genData = await genResponse.json();

            if (genData.success && genData.scenes) {
                // Merge generated image URLs back into our main state array
                pipelineProgressState.scenes.forEach(mainScene => {
                    const matchedGen = genData.scenes.find(gs => gs.scene_number === mainScene.scene_number);
                    if (matchedGen) {
                        mainScene.image_url = matchedGen.image_url;
                    } else {
                        mainScene.image_url = getCartoonPlaceholder(mainScene.scene_number);
                    }
                });

                logToStudioConsole("Successfully completed Step 4: Parallel storyboard illustrations rendered.", "success");
            } else {
                throw new Error("Invalid image data returned from generator.");
            }

        } catch (genError) {
            console.error("Parallel scene generation crashed:", genError);
            logToStudioConsole(`Generation crashed: ${genError.message}. Appending illustrative cartoon vector placeholders instead of photos.`, "error");

            // Cartoon vector placeholders fallback
            pipelineProgressState.scenes.forEach(s => {
                s.image_url = getCartoonPlaceholder(s.scene_number);
            });
        }

        // Render fully complete scene cards dynamically into the grid viewport
        renderStoryboardCards();
    }

    // Handles DOM template generation for each planned storyboard segment
    function renderStoryboardCards() {
        if (!storyboardGrid) return;
        storyboardGrid.innerHTML = "";

        pipelineProgressState.scenes.forEach(sc => {
            const card = document.createElement("div");
            card.className = "bg-[#14141e] border border-[#1f1f29] rounded-lg overflow-hidden flex flex-col p-3";
            card.innerHTML = `
                <div class="h-28 bg-neutral-800 flex items-center justify-center text-xs text-neutral-500 rounded relative overflow-hidden mb-2">
                    <img src="${sc.image_url}" alt="Scene ${sc.scene_number}" class="w-full h-full object-cover">
                    <span class="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono font-bold text-white uppercase">Scene ${sc.scene_number} [${sc.timestamp_marker}]</span>
                </div>
                <p class="text-[11px] font-semibold text-white leading-relaxed mb-1 leading-relaxed line-clamp-2" title="${sc.narration_segment}">${sc.narration_segment}</p>
                <textarea class="bg-[#0d0d11] border border-[#1f1f29] text-[9px] text-neutral-400 p-1.5 rounded outline-none font-mono h-12 leading-relaxed resize-none" readonly>${sc.image_prompt}</textarea>
            `;
            storyboardGrid.appendChild(card);
        });

        // Toggle state classes to match complete review steps
        steps[3].className = "step-item flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors completed";
        
        statusBadgeText.innerText = "Review Storyboard";
        statusBadgeIndicator.className = "w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse";
        logToStudioConsole("Pipeline paused at Step 4. Validate scene visual cards.", "warning");
        logToStudioConsole("Click 'Continue to Video Compile' inside the viewport when ready, or 'Regenerate' to refresh.", "info");

        // Display user controls
        if (btnContinueVideo) {
            btnContinueVideo.classList.remove("hidden");
        }
        if (btnRegenerateStoryboard) {
            btnRegenerateStoryboard.classList.remove("hidden");
        }

        btnGenerateStory.disabled = false;
        btnGenerateStory.innerText = "Re-Generate Bedtime Story";
        btnGenerateStory.classList.remove("opacity-50");
    }

    // Connect event listener to "Regenerate Storyboard" button inside Step 4 Viewport
    if (btnRegenerateStoryboard) {
        btnRegenerateStoryboard.addEventListener("click", function() {
            if (confirm("Are you sure you want to regenerate all storyboard illustrations? This will execute parallel OpenAI gpt-image-1-mini calls matching your latest style.")) {
                startStoryboardPipeline();
            }
        });
    }

    // Connect event listener to Continue to Video Compile button inside Step 4 Viewport
    if (btnContinueVideo) {
        btnContinueVideo.addEventListener("click", function() {
            btnContinueVideo.classList.add("hidden");
            if (btnRegenerateStoryboard) {
                btnRegenerateStoryboard.classList.add("hidden");
            }
            continueVideoToPublishSimulation();
        });
    }

    // Completes the remaining mockup stages (Steps 5 and 6)
    async function continueVideoToPublishSimulation() {
        btnGenerateStory.disabled = true;
        btnGenerateStory.innerText = "Compiling...";
        btnGenerateStory.classList.add("opacity-50");

        const ageVal = inputAgeGroup.value;

        // --- STEP 5: Assembling Video Clips (MOCK PROCESS) ---
        statusBadgeText.innerText = "Compiling Video...";
        statusBadgeIndicator.className = "w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
        switchPipelineStepPanel(4);
        logToStudioConsole("Combining assets, voice-over audio files, and frames into high quality video render...", "warning");
        await delay(3500);

        if (videoVideoContainer) {
            videoVideoContainer.innerHTML = `
                <video controls class="w-full h-48 rounded object-cover border border-neutral-800" src="https://www.w3schools.com/html/mov_bbb.mp4"></video>
            `;
        }

        steps[4].className = "step-item flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors completed";
        logToStudioConsole("Successfully completed Step 5: Full bedtime-story video segment synthesized.", "success");

        // --- STEP 6: Publishing & Cover Art Metadata (MOCK PROCESS) ---
        statusBadgeText.innerText = "Ready to Publish";
        statusBadgeIndicator.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
        switchPipelineStepPanel(5);
        logToStudioConsole("Loading final cover art and database publication setup...", "warning");
        await delay(1500);

        // Bind first generated scene illustration dynamically as official cover art rather than dummy placeholder
        if (publishCoverImage) {
            publishCoverImage.src = (pipelineProgressState.scenes && pipelineProgressState.scenes.length > 0) 
                ? pipelineProgressState.scenes[0].image_url 
                : getCartoonPlaceholder(1);
        }
        if (publishTitleInput) publishTitleInput.value = pipelineProgressState.title;
        if (publishDescTextarea) publishDescTextarea.value = `Join Barnaby the Curious Rabbit in this delightful sleep-time story. Designed for children ages ${ageVal}.`;

        steps[5].className = "step-item flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors completed";
        logToStudioConsole("Successfully completed Step 6: Core pipeline complete! Validate metadata and click Publish.", "success");

        // Complete state update
        pipelineProgressState.isGenerated = true;
        btnGenerateStory.disabled = false;
        btnGenerateStory.innerText = "Re-Generate Bedtime Story";
        btnGenerateStory.classList.remove("opacity-50");
    }

    // Custom helper time delayer
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Publish event handler
    if (btnPublishStudio) {
        btnPublishStudio.addEventListener("click", function() {
            if (!pipelineProgressState.isGenerated) {
                alert("Please run and complete the bedtime story generation pipeline before publishing.");
                return;
            }
            showLoader("Publishing story to main database...");
            setTimeout(() => {
                hideLoader();
                window.logToTerminal(`Database updated: Published story '${pipelineProgressState.title}' into client application.`, "success");
                logToStudioConsole("Successfully published story to student database!", "success");
                alert(`Successfully published '${pipelineProgressState.title}' to the client app!`);
                returnToT1eraStudio();
            }, 2000);
        });
    }

    if (btnSaveDraftStudio) {
        btnSaveDraftStudio.addEventListener("click", function() {
            logToStudioConsole("Draft revisions cached in offline memory storage.", "success");
            alert("Draft saved locally!");
        });
    }

    function showLoader(message) {
        const overlay = document.getElementById('studio-loader-overlay');
        const text = document.getElementById('studio-loader-text');
        if (overlay && text) {
            text.innerText = message;
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        }
    }

    function hideLoader() {
        const overlay = document.getElementById('studio-loader-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }
    }
});
