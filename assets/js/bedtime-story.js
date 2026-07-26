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

    // Stepper State Data Tracking
    let currentPipelineActiveIndex = 0;
    let pipelineProgressState = {
        title: "The Dreamland Journey",
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
            logToStudioConsole("Bedtime Story workspace dimensions restored to default grid limits.", "info");
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

        // Collect inputs
        const briefVal = inputConceptBrief.value.trim() || "A small rabbit who finds a glowing star in the woods.";
        const ageVal = inputAgeGroup.value;
        const voiceVal = inputVoiceStyle.value;
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

        // --- STEP 1: Story Brief & Concept Concept ---
        switchPipelineStepPanel(0);
        logToStudioConsole("Synthesizing story concept ideas with GPT...", "warning");
        await delay(2000);
        
        pipelineProgressState.title = `The Rabbit and the Whisper of ${musicVal}`;
        pipelineProgressState.brief = `An educational story about curiosity designed for ${ageVal} years old. ${briefVal}`;
        
        if (storyTitleEl) storyTitleEl.innerText = pipelineProgressState.title;
        if (storyBriefEl) storyBriefEl.innerText = pipelineProgressState.brief;
        
        steps[0].classList.add("completed");
        logToStudioConsole("Successfully completed Step 1: Concept Brief generated.", "success");

        // --- STEP 2: Write Story Script Draft ---
        statusBadgeText.innerText = "Writing Script...";
        switchPipelineStepPanel(1);
        logToStudioConsole("Drafting narrative paragraphs and script breakdowns...", "warning");
        await delay(2500);

        pipelineProgressState.script = `Once upon a time, in a sleepy valley hidden behind the blue mountains, there lived a soft, little rabbit named Barnaby. Barnaby was extraordinarily curious about everything.\n\nOne evening, as twilight painted the sky in soft shades of lavender, Barnaby noticed a small, flickering light at the base of the old Oak Tree.\n\n"What could that be?" Barnaby whispered, his ears twitching with excitement. He hopped forward softly, taking care not to crunch any dry leaves under his paws. There, floating gently between two mushrooms, was a tiny star.`;
        if (scriptEditorTextarea) scriptEditorTextarea.value = pipelineProgressState.script;
        
        steps[1].classList.add("completed");
        logToStudioConsole("Successfully completed Step 2: Story script drafted.", "success");

        // --- STEP 3: Narration Audio Generation ---
        statusBadgeText.innerText = "Generating Voice...";
        switchPipelineStepPanel(2);
        logToStudioConsole(`Requesting audio generation with ElevenLabs. Selected voice style: ${voiceVal}...`, "warning");
        await delay(2500);

        if (voiceWaveformContainer) {
            voiceWaveformContainer.innerHTML = "";
            for (let i = 0; i < 24; i++) {
                const bar = document.createElement("div");
                bar.className = "waveform-bar";
                bar.style.animationDelay = `${i * 0.08}s`;
                voiceWaveformContainer.appendChild(bar);
            }
        }
        if (voiceAudioPlayer) {
            voiceAudioPlayer.classList.remove("hidden");
        }

        steps[2].classList.add("completed");
        logToStudioConsole("Successfully completed Step 3: Audio narration voice files rendered.", "success");

        // --- STEP 4: Storyboard Scene Descriptions ---
        statusBadgeText.innerText = "Designing Scenes...";
        switchPipelineStepPanel(3);
        logToStudioConsole("Formulating scene cards and layout prompts...", "warning");
        await delay(3000);

        const mockScenes = [
            { num: 1, text: "Barnaby the curious rabbit looking at the twilight purple sky.", prompt: `watercolor, whimsical, ${visualVal}, cute baby rabbit looking at twilight sky` },
            { num: 2, text: "Barnaby hopping slowly towards a glowing small light under a tree.", prompt: `watercolor, ${visualVal}, glowing magical star under an old oak tree, rabbit hopping towards it` },
            { num: 3, text: "Barnaby carefully touching the glowing star with his paw.", prompt: `watercolor, ${visualVal}, close up of soft cute rabbit paw touching glowing tiny magical star` }
        ];

        if (storyboardGrid) {
            storyboardGrid.innerHTML = "";
            mockScenes.forEach(sc => {
                const card = document.createElement("div");
                card.className = "bg-[#14141e] border border-[#1f1f29] rounded-lg overflow-hidden flex flex-col p-3";
                card.innerHTML = `
                    <div class="h-28 bg-neutral-800 flex items-center justify-center text-xs text-neutral-500 rounded relative overflow-hidden mb-2">
                        <img src="https://picsum.photos/300/150?random=${sc.num}" alt="Scene ${sc.num}" class="w-full h-full object-cover">
                        <span class="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono font-bold text-white uppercase">Scene ${sc.num}</span>
                    </div>
                    <p class="text-[11px] font-semibold text-white truncate">${sc.text}</p>
                    <textarea class="bg-[#0d0d11] border border-neutral-800 text-[10px] text-neutral-400 p-1.5 rounded outline-none font-mono mt-1.5 h-12 leading-relaxed" readonly>${sc.prompt}</textarea>
                    <div class="flex items-center justify-between gap-1 mt-2.5">
                        <button class="flex-1 bg-neutral-800 hover:bg-neutral-700 text-[9px] font-bold py-1 rounded transition-colors text-neutral-300">Regen</button>
                        <button class="flex-1 bg-neutral-800 hover:bg-neutral-700 text-[9px] font-bold py-1 rounded transition-colors text-neutral-300">Edit Prompt</button>
                    </div>
                `;
                storyboardGrid.appendChild(card);
            });
        }

        steps[3].classList.add("completed");
        logToStudioConsole("Successfully completed Step 4: Storyboard descriptions and cover cards ready.", "success");

        // --- STEP 5: Assembling Video Clips ---
        statusBadgeText.innerText = "Compiling Video...";
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

        // --- STEP 6: Publishing & Cover Art Meta Metadata ---
        statusBadgeText.innerText = "Ready to Publish";
        statusBadgeIndicator.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
        switchPipelineStepPanel(5);
        logToStudioConsole("Loading final cover art and database publication setup...", "warning");
        await delay(1500);

        if (publishCoverImage) publishCoverImage.src = "https://picsum.photos/400/300?random=99";
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
