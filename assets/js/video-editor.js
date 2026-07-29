document.addEventListener("DOMContentLoaded", function () {
    // 1. DOM Elements Query
    const timelineImagesTrack = document.getElementById("timeline-images-track");
    const timelineAudioTrack = document.getElementById("timeline-audio-track");
    const timelineAudioClip = document.getElementById("timeline-audio-clip");
    const timelinePlayhead = document.getElementById("timeline-playhead");
    const timelineRuler = document.getElementById("timeline-ruler");
    const previewImage = document.getElementById("editor-preview-image");
    const previewVideo = document.getElementById("editor-preview-video");
    const previewPlaceholder = document.getElementById("editor-preview-placeholder");
    const fadeOverlay = document.getElementById("editor-fade-overlay");

    const playBtn = document.getElementById("editor-play-btn");
    const pauseBtn = document.getElementById("editor-pause-btn");
    const muteBtn = document.getElementById("editor-mute-btn");
    const muteIconMuted = document.getElementById("mute-icon-muted");
    const muteIconUnmuted = document.getElementById("mute-icon-unmuted");
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
        isMuted: false,
        audioOffset: 0.0, // horizontal start offset in seconds
        audioElement: null, // live audio playback element
    };

    let animationFrameId = null;
    let dragSourceElement = null;
    let selectedTransitionNode = null;
    let transitionDirection = "in"; // 'in' or 'out' tab

    const TRACK_WIDTH_PX = 600; // Unified baseline width. Keeps all tracks 100% synced [1, 2]
    const TIMELINE_PADDING_LEFT = 64; // IMAGES track sidebar spacer width

    // Expose active state getter globally to let video-generator.js access it seamlessly without reference-lag bugs [2]
    window.getActiveVideoEditorScenes = function() {
        return editorProgressState.scenes;
    };

    // -----------------------------------------------------------------
    // 3. Ruler & Grid Render Math
    // -----------------------------------------------------------------
    function buildTimelineRuler() {
        if (!timelineRuler) return;
        timelineRuler.innerHTML = "";
        
        const totalDuration = editorProgressState.duration;

        // Set baseline identical widths across the ruler and both tracks to ensure 100% sync [1, 2]
        timelineRuler.style.width = `${TIMELINE_PADDING_LEFT + TRACK_WIDTH_PX}px`;
        if (timelineImagesTrack) timelineImagesTrack.style.width = `${TIMELINE_PADDING_LEFT + TRACK_WIDTH_PX}px`;
        if (timelineAudioTrack) timelineAudioTrack.style.width = `${TIMELINE_PADDING_LEFT + TRACK_WIDTH_PX}px`;

        for (let s = 0; s <= totalDuration; s += 2) {
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
                if (e.target.classList.contains("clip-resize-handle")) {
                    e.preventDefault();
                    return;
                }
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
    // 5. Dynamic Clip & Transition Rendering (With Handles)
    // -----------------------------------------------------------------
    function renderTimelineClips() {
        if (!timelineImagesTrack) return;
        timelineImagesTrack.innerHTML = "";

        const scenes = editorProgressState.scenes;
        if (!scenes || scenes.length === 0) return;

        const totalClips = scenes.length;
        const totalDuration = editorProgressState.duration;

        scenes.forEach((sc, idx) => {
            // Determine dynamic width proportional to its calculated duration using pixels scale
            const duration = sc.duration || (totalDuration / totalClips);
            sc.duration = duration; // Ensure populated
            const allocatedWidth = (duration / totalDuration) * TRACK_WIDTH_PX;

            // Clip element container
            const clip = document.createElement("div");
            clip.className = "timeline-image-clip flex items-center p-0.5";
            clip.dataset.index = idx;
            clip.setAttribute("draggable", "true");
            clip.style.width = `${allocatedWidth}px`;

            clip.innerHTML = `
                <div class="w-full h-full relative rounded overflow-hidden select-none pointer-events-none">
                    <img class="w-full h-full object-cover" src="${sc.image_url}" alt="Scene ${sc.scene_number}">
                    <span class="absolute bottom-0.5 right-1 px-1 py-0.5 bg-black/60 rounded text-[7px] font-mono text-white">Scene ${sc.scene_number}</span>
                </div>
                <!-- Interactive duration resize handle bars -->
                <div class="clip-resize-handle clip-resize-handle-left" data-handle="left"></div>
                <div class="clip-resize-handle clip-resize-handle-right" data-handle="right"></div>
            `;

            // Select clip on click and display handlebars
            clip.addEventListener("click", function(e) {
                if (e.target.classList.contains("clip-resize-handle")) return;
                timelineImagesTrack.querySelectorAll(".timeline-image-clip").forEach(c => c.classList.remove("selected"));
                clip.classList.add("selected");
                
                // Immediately swap the main view preview frame to display the selected scene
                editorProgressState.currentTime = getAccumulatedDurationBeforeScene(idx);
                updatePlayheadPosition();
                updateVideoFramePreview();

                window.logToStudioConsole(`Selected Scene ${idx + 1} for duration scaling. Drag the blue left/right edges to adjust.`, "info");
            });

            // Connect resizing pointer dragging logic to handlebars
            const leftHandle = clip.querySelector(".clip-resize-handle-left");
            const rightHandle = clip.querySelector(".clip-resize-handle-right");

            [leftHandle, rightHandle].forEach(handle => {
                handle.addEventListener("pointerdown", function(pe) {
                    pe.stopPropagation();
                    handle.setPointerCapture(pe.pointerId);

                    const side = this.dataset.handle;
                    const initialWidth = parseFloat(clip.style.width);
                    const startX = pe.clientX;

                    const onPointerMove = function(moveEvent) {
                        const deltaX = moveEvent.clientX - startX;
                        let newWidth = initialWidth;

                        if (side === "right") {
                            newWidth = initialWidth + deltaX;
                        } else {
                            newWidth = initialWidth - deltaX;
                        }

                        // Enforce minimum visual threshold safety limit (30px)
                        if (newWidth < 30) newWidth = 30;

                        // Only modify the width of this specific dragged clip [2]
                        clip.style.width = `${newWidth}px`;
                    };

                    const onPointerUp = function(upEvent) {
                        handle.releasePointerCapture(upEvent.pointerId);
                        handle.removeEventListener("pointermove", onPointerMove);
                        handle.removeEventListener("pointerup", onPointerUp);

                        saveClipWidthsToState();
                    };

                    handle.addEventListener("pointermove", onPointerMove);
                    handle.addEventListener("pointerup", onPointerUp);
                });
            });

            timelineImagesTrack.appendChild(clip);

            // Append intermediate transition box [+] if not the final item
            if (idx < totalClips - 1) {
                const transNode = document.createElement("button");
                transNode.className = "timeline-transition-node focus:outline-none";
                transNode.dataset.leftIndex = idx;
                transNode.dataset.transitionIn = sc.transitionIn || "none";
                transNode.dataset.transitionOut = sc.transitionOut || "none";
                
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

    // Helper to calculate total aggregated duration before a specific scene index
    function getAccumulatedDurationBeforeScene(sceneIdx) {
        let total = 0.0;
        for (let i = 0; i < sceneIdx; i++) {
            total += editorProgressState.scenes[i].duration || 0.0;
        }
        return total;
    }

    // Recalculates other clips proportionally so total width remains TRACK_WIDTH_PX
    function recalculateClipWidthsProportionally(resizedIdx, newWidth) {
        const clips = Array.from(timelineImagesTrack.querySelectorAll(".timeline-image-clip"));
        
        let otherWidthSum = 0;
        clips.forEach((c, i) => {
            if (i !== resizedIdx) {
                otherWidthSum += parseFloat(c.style.width) || (TRACK_WIDTH_PX / clips.length);
            }
        });

        const remainingWidthToDistribute = TRACK_WIDTH_PX - newWidth;

        clips.forEach((c, i) => {
            if (i !== resizedIdx) {
                const currentOtherWidth = parseFloat(c.style.width) || (TRACK_WIDTH_PX / clips.length);
                const ratio = currentOtherWidth / otherWidthSum;
                const distributedWidth = ratio * remainingWidthToDistribute;
                c.style.width = `${Math.max(30, distributedWidth)}px`; // minimum width limit
            }
        });
    }

    // Commits calculated visual width pixels back to duration data states
    function saveClipWidthsToState() {
        const clips = Array.from(timelineImagesTrack.querySelectorAll(".timeline-image-clip"));
        const totalDuration = editorProgressState.duration;

        let accumulatedTime = 0.0;
        let totalImageDurationSum = 0.0;
        
        clips.forEach((c, i) => {
            const width = parseFloat(c.style.width);
            const duration = (width / TRACK_WIDTH_PX) * totalDuration; // Sync duration directly to baseline track width [2]

            editorProgressState.scenes[i].duration = duration;
            totalImageDurationSum += duration;

            const min = Math.floor(accumulatedTime / 60);
            const sec = Math.floor(accumulatedTime % 60);
            editorProgressState.scenes[i].timestamp_marker = `${min}:${sec < 10 ? '0' : ''}${sec}`;

            accumulatedTime += duration;
        });

        // Re-render to update the draggable transition nodes positions accurately
        buildTimelineRuler();
        renderTimelineClips();
        updateVideoFramePreview();
        window.logToStudioConsole("Updated storyboard duration markers and transition pacing offsets.", "success");
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
            initialOffsetPx = parseFloat(timelineAudioClip.style.left) || TIMELINE_PADDING_LEFT;
            timelineAudioClip.classList.replace("cursor-grab", "cursor-grabbing");
        });

        timelineAudioClip.addEventListener("pointermove", function (e) {
            if (!isDraggingAudio) return;
            const currentX = e.clientX;
            const deltaX = currentX - startDragX;
            
            let newLeftPx = initialOffsetPx + deltaX;
            const minLeftPx = TIMELINE_PADDING_LEFT; // Locked to spacer padding [1, 2]
            const maxLeftPx = TIMELINE_PADDING_LEFT + TRACK_WIDTH_PX - parseFloat(timelineAudioClip.style.width);
            
            if (newLeftPx < minLeftPx) newLeftPx = minLeftPx;
            if (newLeftPx > maxLeftPx) newLeftPx = maxLeftPx;

            timelineAudioClip.style.left = `${newLeftPx}px`;

            const offsetSec = ((newLeftPx - TIMELINE_PADDING_LEFT) / TRACK_WIDTH_PX) * editorProgressState.duration; // Convert pixels offset to seconds directly [2]
            editorProgressState.audioOffset = offsetSec;
            
            // Instantly sync audio playback cursor position if dragging offset during play
            syncAudioPlaybackCursor();
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

                if (selectedTransitionNode.dataset.transitionIn === "fade" || selectedTransitionNode.dataset.transitionOut === "fade") {
                    selectedTransitionNode.classList.add("active-fade");
                } else {
                    selectedTransitionNode.classList.remove("active-fade");
                }

                highlightActiveTransitionButton(effect);
                window.logToStudioConsole(`Transition applied: Scene ${leftIdx + 1} ➔ Scene ${leftIdx + 2} set to [${effect.toUpperCase()}].`, "success");
                
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
    // 8. Playback loop & Audio frame/video synchronizations
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

    // Dynamic audio playback sync based on the playhead's current offset
    function syncAudioPlaybackCursor() {
        const audio = editorProgressState.audioElement;
        if (!audio) return;

        const currentPlayheadTime = editorProgressState.currentTime;
        const audioOffset = editorProgressState.audioOffset;
        const targetAudioTime = currentPlayheadTime - audioOffset;

        if (editorProgressState.isPlaying) {
            if (targetAudioTime >= 0 && targetAudioTime < audio.duration) {
                // Play audio if it falls inside the playback window
                if (audio.paused) {
                    audio.currentTime = targetAudioTime;
                    audio.play().catch(e => console.log("Audio play deferred:", e));
                } else {
                    // Sync timeline drift if discrepancy is greater than 0.1s
                    if (Math.abs(audio.currentTime - targetAudioTime) > 0.1) {
                        audio.currentTime = targetAudioTime;
                    }
                }
            } else {
                // Pause if the playhead falls outside the audio clip boundaries
                if (!audio.paused) {
                    audio.pause();
                }
            }
        } else {
            if (!audio.paused) {
                audio.pause();
            }
        }
    }

    // Unifies and triggers precise rendering of standard video tracks or static image frames
    function updateVideoFramePreview() {
        const scenes = editorProgressState.scenes;
        if (!scenes || scenes.length === 0) return;

        const currentTime = editorProgressState.currentTime;

        // Dynamically compute index boundaries based on variable durations
        let accumulatedTime = 0.0;
        let activeIdx = 0;

        for (let i = 0; i < scenes.length; i++) {
            accumulatedTime += scenes[i].duration;
            if (currentTime <= accumulatedTime) {
                activeIdx = i;
                break;
            }
            if (i === scenes.length - 1) {
                activeIdx = scenes.length - 1;
            }
        }

        const targetScene = scenes[activeIdx];
        if (targetScene) {
            if (previewPlaceholder) previewPlaceholder.classList.add("hidden");
            
            // Calculate relative offset within this specific scene clip duration boundaries
            let precedingDurationSum = 0.0;
            for (let i = 0; i < activeIdx; i++) {
                precedingDurationSum += scenes[i].duration;
            }
            const localOffset = currentTime - precedingDurationSum;
            const threshold = 0.5; // transition overlaps within 0.5s window
            
            // Handle cross-scene fade overlays
            if (targetScene.transitionIn === "fade" && localOffset < threshold) {
                const fadePct = (threshold - localOffset) / threshold;
                if (fadeOverlay) fadeOverlay.style.opacity = fadePct;
            } else if (targetScene.transitionOut === "fade" && (targetScene.duration - localOffset) < threshold) {
                const fadePct = (threshold - (targetScene.duration - localOffset)) / threshold;
                if (fadeOverlay) fadeOverlay.style.opacity = fadePct;
            } else {
                if (fadeOverlay) fadeOverlay.style.opacity = 0;
            }

            // DYNAMIC DUAL-MEDIA SWAPPER: Route to HTML5 Video if Sora animated, otherwise use static Image
            if (targetScene.video_url) {
                if (previewImage) previewImage.classList.add("hidden");
                if (previewVideo) {
                    previewVideo.classList.remove("hidden");
                    if (previewVideo.src !== targetScene.video_url) {
                        previewVideo.src = targetScene.video_url;
                        previewVideo.load();
                    }
                    
                    // Sync video element's current playback frame directly to local timestamp offset [2]
                    const targetVideoTime = localOffset;
                    if (Math.abs(previewVideo.currentTime - targetVideoTime) > 0.1) {
                        previewVideo.currentTime = targetVideoTime;
                    }
                    
                    if (editorProgressState.isPlaying) {
                        if (previewVideo.paused && previewVideo.readyState >= 2) {
                            previewVideo.play().catch(ve => console.log("Video frame render deferred:", ve));
                        }
                    } else {
                        if (!previewVideo.paused) {
                            previewVideo.pause();
                        }
                    }
                }
            } else {
                if (previewVideo) {
                    previewVideo.pause();
                    previewVideo.classList.add("hidden");
                }
                if (previewImage) {
                    previewImage.classList.remove("hidden");
                    previewImage.classList.add("opacity-100");
                    if (previewImage.src !== targetScene.image_url) {
                        previewImage.src = targetScene.image_url;
                    }
                }
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
            if (editorProgressState.audioElement) {
                editorProgressState.audioElement.pause();
            }
            if (previewVideo && !previewVideo.paused) {
                previewVideo.pause();
            }
            window.logToStudioConsole("Timeline reached end of program. Transport stopped.", "info");
        }

        updatePlayheadPosition();
        updateVideoFramePreview();
        syncAudioPlaybackCursor(); // Real-time audio play/sync

        if (editorProgressState.isPlaying) {
            animationFrameId = requestAnimationFrame(runPlaybackTick);
        }
    }

    if (playBtn) {
        playBtn.addEventListener("click", function() {
            if (editorProgressState.isPlaying) return;
            
            if (editorProgressState.currentTime >= editorProgressState.duration) {
                editorProgressState.currentTime = 0.0;
            }

            editorProgressState.isPlaying = true;
            lastPlaybackTimestamp = performance.now();
            animationFrameId = requestAnimationFrame(runPlaybackTick);
            
            window.logToStudioConsole("Transport initialized. Playing timeline render tracks with synced audio...", "info");
        });
    }

    if (pauseBtn) {
        pauseBtn.addEventListener("click", function() {
            if (!editorProgressState.isPlaying) return;
            editorProgressState.isPlaying = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (editorProgressState.audioElement) {
                editorProgressState.audioElement.pause();
            }
            if (previewVideo && !previewVideo.paused) {
                previewVideo.pause();
            }
            window.logToStudioConsole("Transport paused.", "info");
        });
    }

    // Real-time Mute / Unmute toggler
    if (muteBtn) {
        muteBtn.addEventListener("click", function() {
            editorProgressState.isMuted = !editorProgressState.isMuted;
            
            if (editorProgressState.isMuted) {
                muteIconUnmuted.classList.add("hidden");
                muteIconMuted.classList.remove("hidden");
                window.logToStudioConsole("Audio muted.", "info");
            } else {
                muteIconMuted.classList.add("hidden");
                muteIconUnmuted.classList.remove("hidden");
                window.logToStudioConsole("Audio unmuted.", "info");
            }

            if (editorProgressState.audioElement) {
                editorProgressState.audioElement.muted = editorProgressState.isMuted;
            }
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
        
        // Reset playback coordinates
        editorProgressState.currentTime = 0.0;
        editorProgressState.isPlaying = false;

        // Initialize dynamic Audio element layer
        if (editorProgressState.audioElement) {
            editorProgressState.audioElement.pause();
        }
        editorProgressState.audioElement = new Audio(storyState.voiceUrl);
        editorProgressState.audioElement.muted = editorProgressState.isMuted;

        const testAudio = new Audio(storyState.voiceUrl);
        testAudio.addEventListener("loadedmetadata", function() {
            // Hot-reload synchronization to automatically snap and grow/shrink both the images track,
            // the voiceover block, and the ruler ticks to perfectly match the true ElevenLabs audio duration! [1, 2]
            const calculatedDuration = Math.ceil(this.duration) || 30.0;
            editorProgressState.duration = calculatedDuration;

            // Force-distribute the image clip durations equally to fit 100% of the true audio duration on first load! [2]
            const totalClips = editorProgressState.scenes.length;
            const equalClipDuration = calculatedDuration / totalClips;
            editorProgressState.scenes.forEach(sc => {
                sc.duration = equalClipDuration;
            });
            
            executeTimelineInitializationSequence();
        });

        // Fallback bounds checker to guarantee zero initialization hangs if loading metadata lags
        setTimeout(() => {
            if (editorProgressState.duration === 30.0) {
                const wordCount = storyState.script.split(/\s+/).filter(w => w.length > 0).length;
                const estimatedDuration = Math.ceil((wordCount / 130) * 60) || 30.0;
                editorProgressState.duration = estimatedDuration;

                const totalClips = editorProgressState.scenes.length;
                const equalClipDuration = estimatedDuration / totalClips;
                editorProgressState.scenes.forEach(sc => {
                    sc.duration = equalClipDuration;
                });

                executeTimelineInitializationSequence();
            }
        }, 1500);
    };

    function executeTimelineInitializationSequence() {
        const totalDuration = editorProgressState.duration;
        
        if (totalTimeEl) totalTimeEl.innerText = formatTimeDisplay(totalDuration);
        if (currentTimeEl) currentTimeEl.innerText = formatTimeDisplay(0.0);

        // Build the time ruler scale ticks based on the dynamic duration
        buildTimelineRuler();

        // Render clip blocks
        renderTimelineClips();

        // Configure audio clip track block length based on its total duration
        if (timelineAudioClip) {
            // Unify: the audio clip visually represents the full vocal track, so its initial width must be exactly 100% of TRACK_WIDTH_PX [1, 2]
            timelineAudioClip.style.width = `${TRACK_WIDTH_PX}px`;
            timelineAudioClip.style.left = `${TIMELINE_PADDING_LEFT}px`;
            editorProgressState.audioOffset = 0.0;
        }

        // Initialize viewport image values
        updatePlayheadPosition();
        updateVideoFramePreview();

        window.logToStudioConsole(`Video Editor timeline loaded cleanly. Program Duration: ${totalDuration} seconds.`, "success");
    }
});
