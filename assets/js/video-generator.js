/**
 * T1ERA Studio CapCut Video Editor - Sora 2 Image-to-Video Generator
 * Coordinates selection boundaries, dynamically captures timeline durations,
 * handles prompt overrides, and hydates live video clips.
 */
document.addEventListener("DOMContentLoaded", function () {
    const generatorPanel = document.getElementById("editor-generator-panel");
    const generateVideoBtn = document.getElementById("btn-editor-generate-video");
    const videoPromptInput = document.getElementById("setting-video-prompt");
    const videoLoaderOverlay = document.getElementById("editor-video-loader");
    const videoLoaderText = document.getElementById("editor-video-loader-text");

    const timelineImagesTrack = document.getElementById("timeline-images-track");
    const previewVideo = document.getElementById("editor-preview-video");
    const previewImage = document.getElementById("editor-preview-image");

    const RENDER_BACKEND_URL = "https://smartkiddo-admin.onrender.com";

    // Monitor timeline track selection to toggle the Generator UI Panel
    if (timelineImagesTrack) {
        timelineImagesTrack.addEventListener("click", function (e) {
            // Find parent clip container that was clicked
            const clipEl = e.target.closest(".timeline-image-clip");
            if (!clipEl) return;

            const sceneIdx = parseInt(clipEl.dataset.index);
            const activeScenesList = window.initializeVideoEditorTimeline ? getActiveScenesState() : null;

            if (activeScenesList && activeScenesList[sceneIdx]) {
                const selectedScene = activeScenesList[sceneIdx];
                
                // Unhide generator panel
                if (generatorPanel) {
                    generatorPanel.classList.remove("hidden");
                }

                // Pre-populate input placeholder with Step 4 story narration segment as prompt fallback
                if (videoPromptInput) {
                    videoPromptInput.value = ""; // clear previous overrides
                    videoPromptInput.setAttribute("placeholder", `Use story segment: "${selectedScene.narration_segment}"`);
                    videoPromptInput.dataset.activeIndex = sceneIdx;
                }
            }
        });
    }

    // Triggers the live OpenAI Sora 2 Image-to-Video generation pipeline
    if (generateVideoBtn) {
        generateVideoBtn.addEventListener("click", async function () {
            const activeIdx = parseInt(videoPromptInput.dataset.activeIndex);
            const activeScenesList = getActiveScenesState();

            if (isNaN(activeIdx) || !activeScenesList || !activeScenesList[activeIdx]) {
                alert("Please select a storyboard image clip on the timeline first.");
                return;
            }

            const targetScene = activeScenesList[activeIdx];
            
            // Get duration directly from the scaled timeline clip (guarantees accurate duration sync)
            const durationSec = Math.ceil(targetScene.duration) || 5;

            // Fetch prompt override or fall back strictly to the Step 4 story text
            const finalPrompt = videoPromptInput.value.trim() || targetScene.narration_segment;

            // Trigger localized video viewport loading overlay
            if (videoLoaderOverlay) {
                if (videoLoaderText) {
                    videoLoaderText.innerText = `Prompt: "${finalPrompt.substring(0, 30)}..." | Duration: ${durationSec}s`;
                }
                videoLoaderOverlay.classList.remove("hidden");
                videoLoaderOverlay.classList.add("flex");
            }

            window.logToStudioConsole(`Contacting OpenAI Sora 2 model... Animating Scene ${targetScene.scene_number} for exactly ${durationSec} seconds.`, "warning");

            try {
                const response = await fetch(`${RENDER_BACKEND_URL}/api/bedtime-story/generate-video`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        scene_number: targetScene.scene_number,
                        image_url: targetScene.image_url,
                        prompt: finalPrompt,
                        duration: durationSec
                    })
                });

                if (!response.ok) {
                    const errorPayload = await response.json();
                    throw new Error(errorPayload.detail || "Server rejected animation request.");
                }

                const data = await response.json();

                if (data.success && data.video_url) {
                    // Commit generated video URL to our global storyboard state
                    targetScene.video_url = data.video_url;

                    // Instantly load and play the video in the main viewport player to display success
                    if (previewImage) previewImage.classList.add("hidden");
                    if (previewVideo) {
                        previewVideo.src = data.video_url;
                        previewVideo.classList.remove("hidden");
                        previewVideo.currentTime = 0;
                        previewVideo.play().catch(pe => console.log("Video preview autoplay blocked:", pe));
                    }

                    window.logToStudioConsole(`Successfully completed Sora 2 animation for Scene ${targetScene.scene_number}! Video loaded into preview viewport.`, "success");
                } else {
                    throw new Error("No valid video payload received from backend.");
                }

            } catch (err) {
                console.error("OpenAI Sora 2 generation failed:", err);
                window.logToStudioConsole(`Sora 2 generation failed: ${err.message}. Fallback simulation stream will be loaded.`, "error");

                // Seamless fallback to a standard placeholder video if credits/modells are constrained
                const fallbackVideoUrl = "https://www.w3schools.com/html/mov_bbb.mp4";
                targetScene.video_url = fallbackVideoUrl;

                if (previewImage) previewImage.classList.add("hidden");
                if (previewVideo) {
                    previewVideo.src = fallbackVideoUrl;
                    previewVideo.classList.remove("hidden");
                    previewVideo.currentTime = 0;
                    previewVideo.play().catch(pe => console.log("Video preview autoplay blocked:", pe));
                }
            } finally {
                // Remove loading overlay
                if (videoLoaderOverlay) {
                    videoLoaderOverlay.classList.remove("flex");
                    videoLoaderOverlay.classList.add("hidden");
                }
            }
        });
    }

    // Helper accessor to fetch active scenes list inside the parent closure
    function getActiveScenesState() {
        const DOM_editorState_bridge = timelineImagesTrack ? timelineImagesTrack.parentElement : null;
        // Search globally inside the timeline workspace tracker state variables
        return window.editorProgressState_bridge || null;
    }
});
