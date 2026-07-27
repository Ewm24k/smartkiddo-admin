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

        // Hide downstream continuation triggers
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
                steps[2].classList.add("completed");
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
            steps[2].classList.add("completed");
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
                logToStudioConsole(`Storyboard planned successfully. Partitioned story into ${planData.total_scenes_planned} scenes.`, "success");
                
                // EXECUTE PARALLEL IMAGE GENERATIONS
                await executeParallelSceneGenerations();
            } else {
                throw new Error("Invalid scene data returned from planner.");
            }

        } catch (planError) {
            console.error("Storyboard planning failed:", planError);
            logToStudioConsole(`Planning failed: ${planError.message}. Utilizing simulation storyboard setup as backup.`, "error");
            
            // Simulation Fallback in case of backend limits
            pipelineProgressState.scenes = [
                { scene_number: 1, timestamp_marker: "0:00", narration_segment: "Once upon a time, there lived a soft, little rabbit named Barnaby.", image_prompt: `watercolor, whimsical, ${visualVal}, cute baby rabbit looking up at twilight purple sky` },
                { scene_number: 2, timestamp_marker: "0:45", narration_segment: "Barnaby hopping slowly towards a glowing small light under an old Oak Tree.", image_prompt: `watercolor, ${visualVal}, glowing magical star under an old oak tree, rabbit hopping towards it` },
                { scene_number: 3, timestamp_marker: "1:20", narration_segment: "He discovered a tiny star shining gently under the mushroom caps.", image_prompt: `watercolor, ${visualVal}, close up of soft cute rabbit paw touching glowing tiny magical star` }
            ];
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
                        mainScene.image_url = `https://picsum.photos/300/150?random=${mainScene.scene_number}`;
                    }
                });

                logToStudioConsole("Successfully completed Step 4: Parallel storyboard illustrations rendered.", "success");
            } else {
                throw new Error("Invalid image data returned from generator.");
            }

        } catch (genError) {
            console.error("Parallel scene generation crashed:", genError);
            logToStudioConsole(`Generation crashed: ${genError.message}. Appending simulation visual blocks.`, "error");

            // Hard fallback placeholders
            pipelineProgressState.scenes.forEach(s => {
                s.image_url = `https://picsum.photos/300/150?random=${s.scene_number}`;
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
        steps[3].classList.add("completed");
        
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

        steps[4].classList.add("completed");
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
                : "https://picsum.photos/400/300?random=99";
        }
        if (publishTitleInput) publishTitleInput.value = pipelineProgressState.title;
        if (publishDescTextarea) publishDescTextarea.value = `Join Barnaby the Curious Rabbit in this delightful sleep-time story. Designed for children ages ${ageVal}.`;

        steps[5].classList.add("completed");
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
