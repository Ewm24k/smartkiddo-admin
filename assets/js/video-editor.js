/**
 * T1ERA Studio CapCut Video Editor Timeline Engine
 * Orchestrates re-ordering of image clips, audio dragging offsets,
 * transition modals, and playhead timeline synchronizations.
 */
document.addEventListener("DOMContentLoaded", function () {
    // 1. DOM Elements Query
    const timelineImagesTrack = document.getElementById("timeline-images-track");
    const timelineAudioTrack = document.getElementById("timeline-audio-track");
    const timelineAudioClip = document.getElementById("timeline-audio-clip");
    const timelinePlayhead = document.getElementById("timeline-playhead");
    const timelineRuler = document.getElementById("timeline-ruler");
    const previewImage = document.getElementById("editor-preview-image");
    const previewPlaceholder = document.getElementById("editor-preview-placeholder");
    const fadeOverlay = document.getElementById("editor-fade-overlay");

    const playBtn = document.getElementById("editor-play-btn");
    const pauseBtn = document.getElementById("editor-pause-btn");
    const currentTimeEl = document.getElementById("editor-current-time");
    const totalTimeEl = document.getElementById("editor-total-time");

    // Transition Popup Modal References
    const transModal = document.getElementById("timeline-transition-modal");
    const transModalClose = document.getElementById("transition-modal-close");
    const tabIn = document.getElementById("tab-transition-in");
    const tabOut = document.getElementById("tab-transition-out");
    const optionsContainer = document.getElementById("transition-options-container");

    // 2. State Parameters
    let editorProgressState = {
        scenes: [],
        voiceUrl: "",
        duration: 30.0, // calculated total duration
        currentTime: 0.0,
        isPlaying: false,
        audioOffset: 0.0, // horizontal start offset in seconds
        clipDuration: 5.0, // default seconds allocated per image clip
    };

    let animationFrameId = null;
    let dragSourceElement = null;
    let selectedTransitionNode = null;
    let transitionDirection = "in"; // 'in' or 'out' tab

    const TRACK_WIDTH_PX = 600; // static scaling factor width of the ruler
    const TIMELINE_PADDING_LEFT = 64; // IMAGES track sidebar spacer width

    // -----------------------------------------------------------------
    // 3. Ruler & Grid Render Math
    // -----------------------------------------------------------------
    function buildTimelineRuler() {
        if (!timelineRuler) return;
        timelineRuler.innerHTML = "";
        
        const totalDuration = editorProgressState.duration;
        const totalTicks = Math.ceil(totalDuration);

        for (let s = 0; i = s; s += 2) {
            if (s > totalDuration) break;
            
            const pxLeft = TIMELINE_PADDING_LEFT + ((s / totalDuration) * TRACK_WIDTH_PX);
            
            // Major tick bar
            const tick = document.createElement("div");
            tick.className = "ruler-tick ruler-tick-major";
            tick.style.left = `${pxLeft}px`;
            
            const label = document.createElement("div");
            label.className = "ruler-label";
            label.innerText = `${s}s`;
            label.style.left = `${pxLeft}px`;
            
            timelineRuler.appendChild(tick);
            timelineRuler.appendChild(label);
        }
    }

    // -----------------------------------------------------------------
    // 4. HTML5 Drag-and-Drop Reordering (Track 1)
    // -----------------------------------------------------------------
    function attachDragAndDropClips() {
        const clips = timelineImagesTrack.querySelectorAll(".timeline-image-clip");
        
        clips.forEach(clip => {
            clip.addEventListener("dragstart", function(e) {
                dragSourceElement = this;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/html", this.innerHTML);
                this.classList.add("opacity-50");
            });

            clip.addEventListener("dragover", function(e) {
                if (e.preventDefault) {
                    e.preventDefault();
                }
                this.classList.add("drag-over");
                e.dataTransfer.dropEffect = "move";
                return false;
            });

            clip.addEventListener("dragleave", function() {
                this.classList.remove("drag-over");
            });

            clip.addEventListener("drop", function(e) {
                if (e.stopPropagation) {
                    e.stopPropagation();
                }
                
                if (dragSourceElement !== this) {
                    // Swap scene indices in progress data
                    const sourceIdx = parseInt(dragSourceElement.dataset.index);
                    const targetIdx = parseInt(this.dataset.index);
                    
                    const temp = editorProgressState.scenes[sourceIdx];
                    editorProgressState.scenes[sourceIdx] = editorProgressState.scenes[targetIdx];
                    editorProgressState.scenes[targetIdx] = temp;
                    
                    // Re-render to update sequence
                    renderTimelineClips();
                    updateVideoFramePreview();
                    window.logToStudioConsole(`Re-arranged timeline sequence: Scene ${sourceIdx + 1} swapped with Scene ${targetIdx + 1}.`, "info");
                }
                return false;
            });

            clip.addEventListener("dragend", function() {
                this.classList.remove("opacity-50");
                clips.forEach(c => c.classList.remove("drag-over"));
            });
        });
    }

    // -----------------------------------------------------------------
    // 5. Dynamic Clip & Transition Rendering
    // -----------------------------------------------------------------
    function renderTimelineClips() {
        if (!timelineImagesTrack) return;
        timelineImagesTrack.innerHTML = "";

        const scenes = editorProgressState.scenes;
        if (!scenes || scenes.length === 0) return;

        const totalClips = scenes.length;
        const totalDuration = editorProgressState.duration;
        const allocatedWidthPerClip = TRACK_WIDTH_PX / totalClips;

        scenes.forEach((sc, idx) => {
            // Clip element container
            const clip = document.createElement("div");
            clip.className = "timeline-image-clip flex items-center p-0.5";
            clip.dataset.index = idx;
            clip.setAttribute("draggable", "true");
            clip.style.width = `${allocatedWidthPerClip}px`;

            clip.innerHTML = `
                <div class="w-full h-full relative rounded overflow-hidden select-none pointer-events-none">
                    <img class="w-full h-full object-cover" src="${sc.image_url}" alt="Scene ${sc.scene_number}">
                    <span class="absolute bottom-0.5 right-1 px-1 py-0.5 bg-black/60 rounded text-[7px] font-mono text-white">Scene ${sc.scene_number}</span>
                </div>
            `;
            timelineImagesTrack.appendChild(clip);

            // Append intermediate transition box [+] if not the final item
            if (idx < totalClips - 1) {
                const transNode = document.createElement("button");
                transNode.className = "timeline-transition-node focus:outline-none";
                transNode.dataset.leftIndex = idx;
                transNode.dataset.transitionIn = sc.transitionIn || "none";
                transNode.dataset.transitionOut = sc.transitionOut || "none";
                
                // Set highlight color active indicator if a fade transition is enabled
                if (transNode.dataset.transitionIn === "fade" || transNode.dataset.transitionOut === "fade") {
                    transNode.classList.add("active-fade");
                }
                
                transNode.innerText = "+";
                transNode.addEventListener("click", function(e) {
                    e.stopPropagation();
                    openTransitionPopup(this, e.clientX, e.clientY);
                });
                
                timelineImagesTrack.appendChild(transNode);
            }
        });

        attachDragAndDropClips();
    }

    // -----------------------------------------------------------------
    // 6. Timeline Interaction & Audio Drag offset (Track 2)
    // -----------------------------------------------------------------
    let isDraggingAudio = false;
    let startDragX = 0;
    let initialOffsetPx = 0;

    if (timelineAudioClip) {
        timelineAudioClip.addEventListener("pointerdown", function (e) {
            isDraggingAudio = true;
            timelineAudioClip.setPointerCapture(e.pointerId);
            startDragX = e.clientX;
            initialOffsetPx = parseFloat(timelineAudioClip.style.left) || 0;
            timelineAudioClip.classList.replace("cursor-grab", "cursor-grabbing");
        });

        timelineAudioClip.addEventListener("pointermove", function (e) {
            if (!isDraggingAudio) return;
            const currentX = e.clientX;
            const deltaX = currentX - startDragX;
            
            // Calculate pixel bounds constraints
            let newLeftPx = initialOffsetPx + deltaX;
            const maxLeftPx = TRACK_WIDTH_PX - parseFloat(timelineAudioClip.style.width);
            
            if (newLeftPx < 0) newLeftPx = 0;
            if (newLeftPx > maxLeftPx) newLeftPx = maxLeftPx;

            timelineAudioClip.style.left = `${newLeftPx}px`;

            // Convert pixels back to seconds offset
            const offsetSec = (newLeftPx / TRACK_WIDTH_PX) * editorProgressState.duration;
            editorProgressState.audioOffset = offsetSec;
        });

        timelineAudioClip.addEventListener("pointerup", function (e) {
            if (!isDraggingAudio) return;
            isDraggingAudio = false;
            timelineAudioClip.releasePointerCapture(e.pointerId);
            timelineAudioClip.classList.replace("cursor-grabbing", "cursor-grab");
            
            window.logToStudioConsole(`Adjusted voice offset timestamp to start at: ${editorProgressState.audioOffset.toFixed(1)}s`, "success");
        });
    }

    // -----------------------------------------------------------------
    // 7. Transition Popup Management
    // -----------------------------------------------------------------
    function openTransitionPopup(node, clickX, clientY) {
        selectedTransitionNode = node;
        transitionDirection = "in";
        
        tabIn.className = "flex-1 py-1 text-[10px] font-bold text-center border-b border-indigo-500 text-white select-none focus:outline-none";
        tabOut.className = "flex-1 py-1 text-[10px] font-bold text-center border-b border-transparent text-neutral-500 hover:text-neutral-300 select-none focus:outline-none";

        // Position absolute menu adjacent to clicked node
        if (transModal) {
            transModal.style.left = `${clickX - 100}px`;
            transModal.style.top = `${window.scrollY + clientY - 140}px`;
            transModal.classList.remove("hidden");
        }
        
        highlightActiveTransitionButton(node.dataset.transitionIn);
    }

    function highlightActiveTransitionButton(val) {
        const buttons = optionsContainer.querySelectorAll("button");
        buttons.forEach(btn => {
            btn.className = "w-full text-left text-[11px] py-1 px-2 rounded hover:bg-white/5 text-neutral-300 font-mono select-none";
            if (btn.dataset.transition === val) {
                btn.className = "w-full text-left text-[11px] py-1 px-2 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-mono font-bold select-none";
            }
        });
    }

    if (tabIn) {
        tabIn.addEventListener("click", function() {
            transitionDirection = "in";
            tabIn.className = "flex-1 py-1 text-[10px] font-bold text-center border-b border-indigo-500 text-white select-none focus:outline-none";
            tabOut.className = "flex-1 py-1 text-[10px] font-bold text-center border-b border-transparent text-neutral-500 hover:text-neutral-300 select-none focus:outline-none";
            if (selectedTransitionNode) {
                highlightActiveTransitionButton(selectedTransitionNode.dataset.transitionIn);
            }
        });
    }

    if (tabOut) {
        tabOut.addEventListener("click", function() {
            transitionDirection = "out";
            tabOut.className = "flex-1 py-1 text-[10px] font-bold text-center border-b border-indigo-500 text-white select-none focus:outline-none";
            tabIn.className = "flex-1 py-1 text-[10px] font-bold text-center border-b border-transparent text-neutral-500 hover:text-neutral-300 select-none focus:outline-none";
            if (selectedTransitionNode) {
                highlightActiveTransitionButton(selectedTransitionNode.dataset.transitionOut);
            }
        });
    }

    if (optionsContainer) {
        const buttons = optionsContainer.querySelectorAll("button");
        buttons.forEach(btn => {
            btn.addEventListener("click", function() {
                const effect = this.dataset.transition;
                if (!selectedTransitionNode) return;
                
                const leftIdx = parseInt(selectedTransitionNode.dataset.leftIndex);
                const nextScene = editorProgressState.scenes[leftIdx + 1];

                if (transitionDirection === "in") {
                    selectedTransitionNode.dataset.transitionIn = effect;
                    if (nextScene) nextScene.transitionIn = effect;
                } else {
                    selectedTransitionNode.dataset.transitionOut = effect;
                    if (nextScene) nextScene.transitionOut = effect;
                }

                // Add active highlight state class to timeline node if a transition is active
                if (selectedTransitionNode.dataset.transitionIn === "fade" || selectedTransitionNode.dataset.transitionOut === "fade") {
                    selectedTransitionNode.classList.add("active-fade");
                } else {
                    selectedTransitionNode.classList.remove("active-fade");
                }

                highlightActiveTransitionButton(effect);
                window.logToStudioConsole(`Transition applied: Scene ${leftIdx + 1} ➔ Scene ${leftIdx + 2} set to [${effect.toUpperCase()}] during ${transitionDirection.toUpperCase()} phase.`, "success");
                
                if (transModal) transModal.classList.add("hidden");
            });
        });
    }

    if (transModalClose) {
        transModalClose.addEventListener("click", function() {
            if (transModal) transModal.classList.add("hidden");
        });
    }

    // -----------------------------------------------------------------
    // 8. Playback loop & Frame synchronizations (Transport controls)
    // -----------------------------------------------------------------
    function updatePlayheadPosition() {
        const pct = editorProgressState.currentTime / editorProgressState.duration;
        const leftOffsetPx = TIMELINE_PADDING_LEFT + (pct * TRACK_WIDTH_PX);
        if (timelinePlayhead) {
            timelinePlayhead.style.left = `${leftOffsetPx}px`;
        }
    }

    function formatTimeDisplay(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.floor((sec % 1) * 10);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
    }

    function updateVideoFramePreview() {
        const scenes = editorProgressState.scenes;
        if (!scenes || scenes.length === 0) return;

        const totalDuration = editorProgressState.duration;
        const totalClips = scenes.length;
        const clipWindow = totalDuration / totalClips;

        const currentTime = editorProgressState.currentTime;
        
        // Find which clip matches the active timestamp window
        let activeIdx = Math.floor(currentTime / clipWindow);
        if (activeIdx >= totalClips) activeIdx = totalClips - 1;
        if (activeIdx < 0) activeIdx = 0;

        const targetScene = scenes[activeIdx];
        if (previewImage && targetScene) {
            if (previewPlaceholder) previewPlaceholder.classList.add("hidden");
            previewImage.classList.remove("opacity-0");
            previewImage.classList.add("opacity-100");
            
            // If transition overlap exists, trigger soft visual fade transitions on canvas viewport
            const localOffset = currentTime % clipWindow;
            const threshold = 0.5; // transition overlaps within 0.5s window
            
            if (targetScene.transitionIn === "fade" && localOffset < threshold) {
                const fadePct = (threshold - localOffset) / threshold;
                if (fadeOverlay) fadeOverlay.style.opacity = fadePct;
            } else if (targetScene.transitionOut === "fade" && (clipWindow - localOffset) < threshold) {
                const fadePct = (threshold - (clipWindow - localOffset)) / threshold;
                if (fadeOverlay) fadeOverlay.style.opacity = fadePct;
            } else {
                if (fadeOverlay) fadeOverlay.style.opacity = 0;
            }

            if (previewImage.src !== targetScene.image_url) {
                previewImage.src = targetScene.image_url;
            }
        }

        if (currentTimeEl) {
            currentTimeEl.innerText = formatTimeDisplay(currentTime);
        }
    }

    let lastPlaybackTimestamp = 0;
    function runPlaybackTick() {
        if (!editorProgressState.isPlaying) return;

        const now = performance.now();
        const deltaSec = (now - lastPlaybackTimestamp) / 1000;
        lastPlaybackTimestamp = now;

        editorProgressState.currentTime += deltaSec;

        // Auto stop when timeline ends
        if (editorProgressState.currentTime >= editorProgressState.duration) {
            editorProgressState.currentTime = editorProgressState.duration;
            editorProgressState.isPlaying = false;
            window.logToStudioConsole("Timeline reached end of program. Transport stopped.", "info");
        }

        updatePlayheadPosition();
        updateVideoFramePreview();

        if (editorProgressState.isPlaying) {
            animationFrameId = requestAnimationFrame(runPlaybackTick);
        }
    }

    if (playBtn) {
        playBtn.addEventListener("click", function() {
            if (editorProgressState.isPlaying) return;
            
            // Loop back cleanly if play is clicked at boundary limits
            if (editorProgressState.currentTime >= editorProgressState.duration) {
                editorProgressState.currentTime = 0.0;
            }

            editorProgressState.isPlaying = true;
            lastPlaybackTimestamp = performance.now();
            animationFrameId = requestAnimationFrame(runPlaybackTick);
            
            window.logToStudioConsole("Transport initialized. Playing timeline render tracks...", "info");
        });
    }

    if (pauseBtn) {
        pauseBtn.addEventListener("click", function() {
            if (!editorProgressState.isPlaying) return;
            editorProgressState.isPlaying = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            window.logToStudioConsole("Transport paused.", "info");
        });
    }

    // -----------------------------------------------------------------
    // 9. Global Bridge Initializer (Triggered by Step 4 continue)
    // -----------------------------------------------------------------
    window.initializeVideoEditorTimeline = function(storyState) {
        if (!storyState) return;

        // Copy state values cleanly
        editorProgressState.scenes = [...storyState.scenes];
        editorProgressState.voiceUrl = storyState.voiceUrl;
        
        // Secure calculated audio voice duration dynamically
        const testAudio = new Audio(storyState.voiceUrl);
        testAudio.addEventListener("loadedmetadata", function() {
            const calculatedDuration = Math.ceil(this.duration) || 30.0;
            editorProgressState.duration = calculatedDuration;
            
            executeTimelineInitializationSequence();
        });

        // Fallback bounds checker to guarantee zero initialization hangs if loading metadata lags
        setTimeout(() => {
            if (editorProgressState.duration === 30.0) {
                // Approximate word pacing fallback
                const wordCount = storyState.script.split(/\s+/).filter(w => w.length > 0).length;
                editorProgressState.duration = Math.ceil((wordCount / 130) * 60) || 30.0;
                executeTimelineInitializationSequence();
            }
        }, 1500);
    };

    function executeTimelineInitializationSequence() {
        const totalDuration = editorProgressState.duration;
        
        if (totalTimeEl) totalTimeEl.innerText = formatTimeDisplay(totalDuration);
        if (currentTimeEl) currentTimeEl.innerText = formatTimeDisplay(0.0);

        // Build the time ruler scale ticks
        buildTimelineRuler();

        // Render clip blocks
        renderTimelineClips();

        // Configure audio clip track block length based on its total duration
        if (timelineAudioClip) {
            const scenesCount = editorProgressState.scenes.length;
            const clipWidthPct = 0.85; // audio clip fits inside visual safe width percentage
            const elementWidthPx = TRACK_WIDTH_PX * clipWidthPct;
            
            timelineAudioClip.style.width = `${elementWidthPx}px`;
            timelineAudioClip.style.left = "0px";
            editorProgressState.audioOffset = 0.0;
        }

        // Initialize viewport image values
        updatePlayheadPosition();
        updateVideoFramePreview();

        window.logToStudioConsole(`Video Editor timeline loaded cleanly. Program Duration: ${totalDuration} seconds.`, "success");
    }
});
