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
  const cardAiStudio = document.querySelector(
    "#view-t1era-studio .glow-card:nth-child(4)",
  ); // Card 4 target element
  const viewStudioSelector = document.getElementById("view-t1era-studio");
  const viewAiStudioSelector = document.getElementById("view-t1era-ai-studio");
  const btnBack = document.getElementById("btn-ai-studio-back");
  const btnSettingsToggle = document.getElementById(
    "btn-ai-studio-settings-toggle",
  );
  const settingsDock = document.getElementById("ai-studio-settings-dock");

  const chatFeed = document.getElementById("ai-studio-chat-feed");
  const promptInput = document.getElementById("ai-studio-prompt-input");
  const btnSend = document.getElementById("btn-ai-studio-send");
  const btnClear = document.getElementById("btn-ai-studio-clear");
  const activeModelBadge = document.getElementById("active-model-badge");
  const dropdownModel = document.getElementById("setting-ai-studio-model");

  // Upload components
  const btnAttach = document.getElementById("btn-ai-studio-attach");
  const fileUploadInput = document.getElementById(
    "ai-studio-file-upload-input",
  );
  const uploadPreview = document.getElementById("ai-studio-upload-preview");
  const uploadedFileName = document.getElementById(
    "ai-studio-uploaded-file-name",
  );
  const btnRemoveUpload = document.getElementById(
    "btn-ai-studio-remove-upload",
  );

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
  const sanitizerGroup = checkSanitizer
    ? checkSanitizer.closest(".flex")
    : null;

  // Generate Contents Kids components (bound-prompt screenshot/clip-to-webapp flow)
  const btnGenerateKids = document.getElementById(
    "btn-ai-studio-generate-kids",
  );
  const kidsUploadInput = document.getElementById(
    "ai-studio-kids-upload-input",
  );

  // Code / Preview split panel components (Claude Artifacts-style)
  const codePanel = document.getElementById("ai-studio-code-panel");
  const codePreviewFrame = document.getElementById(
    "ai-studio-code-preview-frame",
  );
  const codeViewPre = document.getElementById("ai-studio-code-view");
  const codeViewContent = document.getElementById(
    "ai-studio-code-view-content",
  );
  const btnCodeTabPreview = document.getElementById(
    "btn-code-panel-tab-preview",
  );
  const btnCodeTabCode = document.getElementById("btn-code-panel-tab-code");
  const btnCodePanelClose = document.getElementById("btn-code-panel-close");
  const btnCodePanelDownload = document.getElementById(
    "btn-code-panel-download",
  );
  let lastGeneratedCode = "";

  let isRecordingSpeech = false;
  let attachedFileMetadata = null;
  let chatHistory = []; // Local history log storage for T1ERA Studio playground

  // Helper to log actions to standard system terminal console
  function logToTerminal(message, type = "info") {
    if (typeof window.logToTerminal === "function") {
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

      if (
        document.body &&
        !document.body.classList.contains("sidebar-collapsed")
      ) {
        document.body.classList.add("sidebar-collapsed");
        const sidebarToggleIcon = document.getElementById(
          "sidebar-toggle-icon",
        );
        if (sidebarToggleIcon) {
          sidebarToggleIcon.innerHTML = `
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    `;
        }
      }

      const mainContentScroll = document.getElementById("main-content-scroll");
      if (mainContentScroll) {
        mainContentScroll.classList.remove("overflow-y-auto");
        mainContentScroll.classList.add("overflow-hidden");
      }

      const mainContentInner = document.getElementById("main-content-inner");
      if (mainContentInner) {
        mainContentInner.classList.remove(
          "p-8",
          "max-w-7xl",
          "mx-auto",
          "justify-between",
        );
        mainContentInner.classList.add(
          "p-2",
          "h-full",
          "w-full",
          "max-w-none",
          "flex-1",
        );
      }

      // Trigger dynamic locked/unlocked state evaluation based on selected model
      syncActiveModelSettingsLock();

      logToTerminal(
        "Opened T1ERA AI Studio Playground in Fullscreen mode.",
        "system",
      );
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

      const mainContentScroll = document.getElementById("main-content-scroll");
      if (mainContentScroll) {
        mainContentScroll.classList.add("overflow-y-auto");
        mainContentScroll.classList.remove("overflow-hidden");
      }

      const mainContentInner = document.getElementById("main-content-inner");
      if (mainContentInner) {
        mainContentInner.classList.remove(
          "p-2",
          "w-full",
          "max-w-none",
          "flex-1",
        );
        mainContentInner.classList.add(
          "p-8",
          "max-w-7xl",
          "mx-auto",
          "justify-between",
        );
      }

      logToTerminal(
        "Exited AI Studio. Restored main dashboard limits.",
        "system",
      );
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

    const isMiniModel = selectedValue === "gpt-5.4-mini";

    if (isMiniModel) {
      logToTerminal(
        "Target 'gpt-5.4-mini' selected. Disabling unauthorized slide parameters.",
        "warning",
      );

      // Set input nodes to disabled
      if (rangeTemp) rangeTemp.disabled = true;
      if (rangeTokens) rangeTokens.disabled = true;
      if (checkSanitizer) checkSanitizer.disabled = true;

      // Inject warning block styling rules
      if (tempGroup) tempGroup.classList.add("locked-parameter-group");
      if (tokensGroup) tokensGroup.classList.add("locked-parameter-group");
      if (sanitizerGroup)
        sanitizerGroup.classList.add("locked-parameter-group");
    } else {
      // Restore default enabled settings for all other platforms
      if (rangeTemp) rangeTemp.disabled = false;
      if (rangeTokens) rangeTokens.disabled = false;
      if (checkSanitizer) checkSanitizer.disabled = false;

      if (tempGroup) tempGroup.classList.remove("locked-parameter-group");
      if (tokensGroup) tokensGroup.classList.remove("locked-parameter-group");
      if (sanitizerGroup)
        sanitizerGroup.classList.remove("locked-parameter-group");
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

  document.querySelectorAll(".studio-template-card").forEach((card) => {
    card.addEventListener("click", function () {
      const prompt = this.getAttribute("data-prompt");
      if (promptInput && prompt) {
        promptInput.value = prompt;
        promptInput.dispatchEvent(new Event("input"));
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
  // 5. File Context Flattening & Selection (Universal Multimodal FileReader)
  // -----------------------------------------------------------------
  function flattenFilesList(nodes, pathPrefix = "") {
    let files = [];
    nodes.forEach((node) => {
      const absolutePath = pathPrefix
        ? `${pathPrefix}/${node.name}`
        : node.name;
      if (node.type === "file") {
        files.push({
          id: node.id,
          name: node.name,
          path: absolutePath,
          content: node.content,
          isMedia: node.isMedia,
        });
      } else if (node.type === "folder" && Array.isArray(node.children)) {
        files = files.concat(flattenFilesList(node.children, absolutePath));
      }
    });
    return files;
  }

  // Downsamples and compresses high-resolution images down to standard vision-friendly 20KB-40KB sizes
  function compressImageAndGetBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDimension = 600; // Standard vision model baseline width

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed standard JPEG to keep payload small
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        callback(compressedDataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Helper to render dynamic previews inside the attachment bar
  function renderUploadPreview(file, displayUrl) {
    if (uploadedFileName && uploadPreview) {
      let previewHTML = "";
      if (file.type.startsWith("image/")) {
        previewHTML = `<img src="${displayUrl || "#"}" class="w-8 h-8 rounded object-cover border border-indigo-500/30 flex-shrink-0">`;
      } else if (file.type.startsWith("video/")) {
        previewHTML = `
                    <div class="w-8 h-8 rounded bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 flex-shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </div>
                `;
      } else {
        previewHTML = `
                    <div class="w-8 h-8 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                `;
      }

      uploadedFileName.innerHTML = `
                <div class="flex items-center gap-2.5">
                    ${previewHTML}
                    <div class="flex flex-col min-w-0">
                        <span class="truncate font-semibold text-white text-[11px] leading-snug">${file.name}</span>
                        <span class="text-[9px] text-neutral-500 uppercase font-mono tracking-wider">${file.type || "BINARY DOC"} • ${(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                </div>
            `;
      uploadPreview.classList.remove("hidden");
    }
  }

  if (fileUploadInput) {
    fileUploadInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      const isTextType =
        file.type.startsWith("text/") ||
        /\.(json|js|ts|py|html|css|md|yaml|yml|txt)$/i.test(file.name);

      const isImageType = file.type.startsWith("image/");

      logToTerminal(`Processing attached file: ${file.name}...`, "info");

      if (isTextType) {
        reader.onload = function (evt) {
          attachedFileMetadata = {
            name: file.name,
            type: file.type || "text/plain",
            size: file.size,
            content: evt.target.result,
            dataUrl: null,
            displayUrl: null,
          };
          renderUploadPreview(file, null);
        };
        reader.readAsText(file);
      } else if (isImageType) {
        // Compress image asynchronously to protect the context window
        const displayUrl = URL.createObjectURL(file); // Crisp fast local display URL
        compressImageAndGetBase64(file, function (compressedBase64) {
          attachedFileMetadata = {
            name: file.name,
            type: file.type,
            size: file.size,
            content: null,
            dataUrl: compressedBase64, // Small compressed payload (~30KB)
            displayUrl: displayUrl, // Crisp high-res local preview
          };
          renderUploadPreview(file, displayUrl);
        });
      } else {
        // Standard binary file
        reader.onload = function (evt) {
          attachedFileMetadata = {
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            content: null,
            dataUrl: evt.target.result,
            displayUrl: null,
          };
          renderUploadPreview(file, null);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // -----------------------------------------------------------------
  // 6b. Generate Contents Kids (bound-prompt screenshot/clip-to-webapp flow)
  // -----------------------------------------------------------------

  // Fixed prompt bound to the button so the user never has to type it.
  // Adapted from the "Screenshot -> Clickable Webapp" recipe for this
  // chat-only pipeline: there is no server-side PIL/crop tool here, so the
  // model is told to keep the uploaded image whole as the single background
  // layer and lay real, transparent-background buttons on top of it instead
  // of trying to fabricate cropped asset files it cannot actually produce.
  const KIDS_CONTENT_HIDDEN_PROMPT = `You are given a screenshot (or a representative frame from a short clip) of a webpage UI, attached as an image. Turn it into a clickable, kid-friendly HTML/CSS/JS webapp.

Since you cannot crop or export separate image files in this chat, do NOT invent references to cropped asset files. Instead:
1. Use the attached image, unmodified, as the ONE full-bleed background layer, positioned with a #stage element locked to the source image's exact aspect ratio (letterboxed/pillarboxed inside a fixed #stage-wrapper) so nothing drifts at any window size:
   html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; }
   #stage-wrapper { position:fixed; inset:0; width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; overflow:hidden; }
   #stage { position:relative; aspect-ratio: <source width> / <source height>; width:100%; height:100%; max-width:calc(100vh * <source width> / <source height>); max-height:calc(100vw * <source height> / <source width>); background-image:url(<the attached image's own data URL>); background-size:100% 100%; background-repeat:no-repeat; }
2. Identify each clickable element visible in the screenshot (buttons, cards, icons) and lay a real <button> over each one, absolutely positioned inside #stage using PERCENTAGE left/top/width/height (estimated visually against the full image), not pixels.
3. Reset all button chrome so none of them show a stray white/gray box: border:none; outline:none; padding:0; margin:0; background-color:transparent; -webkit-tap-highlight-color:transparent; appearance:none;
4. Add gentle, kid-friendly hover/active feedback (slight scale-up, soft drop-shadow, a little bounce) — nothing jarring or flashing.
5. Wire an onclick handler for every button. If the button's purpose isn't obvious from its label/icon in the screenshot, default to a friendly on-screen message confirming what was tapped rather than leaving it dead.
6. Deliver the ENTIRE result as ONE self-contained file: inline all CSS in a <style> tag and all JS in a <script> tag in the same document, no external files or relative paths. Output nothing except that file, wrapped in a single \`\`\`html fenced code block — no commentary before or after.`;

  // Extracts a still frame from an uploaded video (first loaded frame) and
  // compresses it the same way compressImageAndGetBase64 compresses images,
  // so a video upload can flow through the exact same image-based pipeline.
  function extractVideoFrameAndGetBase64(file, callback) {
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.muted = true;
    videoEl.playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    videoEl.src = objectUrl;

    videoEl.addEventListener(
      "loadeddata",
      function () {
        try {
          const canvas = document.createElement("canvas");
          const maxDimension = 600;
          let width = videoEl.videoWidth || 320;
          let height = videoEl.videoHeight || 240;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(videoEl, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
          callback(compressedDataUrl, objectUrl);
        } catch (err) {
          logToTerminal(
            `Generate Contents Kids: failed to extract a frame from the clip (${err.message}).`,
            "error",
          );
        }
      },
      { once: true },
    );
    videoEl.addEventListener(
      "error",
      function () {
        logToTerminal(
          "Generate Contents Kids: could not read the uploaded clip.",
          "error",
        );
      },
      { once: true },
    );
    videoEl.currentTime = 0.1; // Nudge playback so loadeddata reliably fires on a frame
  }

  if (btnGenerateKids && kidsUploadInput) {
    btnGenerateKids.addEventListener("click", function () {
      kidsUploadInput.click();
    });
  }

  if (kidsUploadInput) {
    kidsUploadInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const isImageType = file.type.startsWith("image/");
      const isVideoType = file.type.startsWith("video/");
      if (!isImageType && !isVideoType) {
        logToTerminal(
          "Generate Contents Kids requires an image or video file.",
          "error",
        );
        kidsUploadInput.value = "";
        return;
      }

      logToTerminal(
        `Generate Contents Kids: processing "${file.name}"...`,
        "info",
      );

      function proceedWithFrame(compressedBase64, displayUrl) {
        attachedFileMetadata = {
          name: file.name,
          type: "image/jpeg",
          size: file.size,
          content: null,
          dataUrl: compressedBase64,
          displayUrl: displayUrl,
        };
        if (promptInput) promptInput.value = KIDS_CONTENT_HIDDEN_PROMPT;
        kidsUploadInput.value = "";
        handleSendPrompt();
      }

      if (isImageType) {
        const displayUrl = URL.createObjectURL(file);
        compressImageAndGetBase64(file, function (compressedBase64) {
          proceedWithFrame(compressedBase64, displayUrl);
        });
      } else {
        extractVideoFrameAndGetBase64(file, proceedWithFrame);
      }
    });
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

  if (extToggleGrep)
    extToggleGrep.addEventListener("change", syncActiveExtensionsBadge);
  if (extToggleLru)
    extToggleLru.addEventListener("change", syncActiveExtensionsBadge);
  syncActiveExtensionsBadge();

  // -----------------------------------------------------------------
  // 8. Markdown Parsing Utility (Protected Block Placeholder Token Pipeline)
  // -----------------------------------------------------------------
  function parseMarkdownToHTML(text) {
    let html = text;

    // Escape raw HTML tags to prevent formatting injection attacks
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const placeholders = [];
    function addPlaceholder(type, htmlContent) {
      const id = placeholders.length;
      placeholders.push({ type: type, html: htmlContent });
      return `<!--T1ERA_PLACEHOLDER_${id}-->`;
    }

    // 1. Extract Code Blocks into placeholders (handles CRLF line-endings and trailing whitespaces)
    html = html.replace(
      /```([a-zA-Z0-9_-]*)[ \t]*[\r\n]*([\s\S]*?)[\r\n]*```/g,
      function (match, lang, code) {
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
                    <pre class="p-3 m-0 overflow-x-auto"><code class="font-mono text-[11px] text-indigo-300 language-${lang || "plaintext"}">${code.trim()}</code></pre>
                </div>
            `;
        return addPlaceholder("code_block", codeHTML);
      },
    );

    // 2. Extract Inline Code blocks to protect nested double-equals symbols
    html = html.replace(/`([^`\r\n]+)`/g, function (match, code) {
      const inlineHTML = `<code class="bg-[#0b0b0f] border border-[#1f1f29] px-1 rounded text-[11px] text-pink-400 font-mono">${code}</code>`;
      return addPlaceholder("inline_code", inlineHTML);
    });

    // 3. Extract Blockquotes
    html = html.replace(/^&gt;\s+(.*)$/gm, function (match, content) {
      const quoteHTML = `<blockquote class="border-l-3 border-indigo-500 bg-indigo-500/5 pl-3 py-1.5 italic text-neutral-400 rounded-r my-2">${content}</blockquote>`;
      return addPlaceholder("blockquote", quoteHTML);
    });

    // 4. Process Header elements (before splitting paragraphs)
    html = html.replace(
      /^###\s+(.*)$/gm,
      '<h4 class="text-sm font-bold text-white mt-3 mb-1.5">$1</h4>',
    );
    html = html.replace(
      /^##\s+(.*)$/gm,
      '<h3 class="text-base font-extrabold text-white mt-4 mb-2">$1</h3>',
    );
    html = html.replace(
      /^#\s+(.*)$/gm,
      '<h2 class="text-lg font-black text-indigo-400 mt-5 mb-3 border-b border-[#1f1f29] pb-1">$1</h2>',
    );

    // 5. Process inline elements
    html = html.replace(
      /==([^==\r\n]+)==/g,
      '<mark class="bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">$1</mark>',
    );
    html = html.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="text-white font-bold">$1</strong>',
    );
    html = html.replace(
      /__([^_]+)__/g,
      '<span class="underline decoration-indigo-500/50">$1</span>',
    );

    // 6. Convert Double Newlines to Paragraphs safely (skipping block containers and headings)
    const parts = html.split(/[\r\n]{2,}/);
    const formattedParts = parts.map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<!--T1ERA_PLACEHOLDER_")
      ) {
        return trimmed;
      }
      return `<p class="mt-2.5 leading-relaxed">${trimmed}</p>`;
    });
    html = formattedParts.filter((p) => p !== "").join("\n");

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
  function createCenteredMessageBubble(
    sender,
    content,
    generationTimeSec = "0.0",
    persist = true,
  ) {
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const wrapper = document.createElement("div");
    // Outer wrapper padding matches the prompt box area padding (`px-6`)
    wrapper.className = "w-full px-6 py-4";

    const isUser = sender === "user";
    const speakerLabel = isUser
      ? "YOU"
      : dropdownModel
        ? dropdownModel.options[dropdownModel.selectedIndex].text.toUpperCase()
        : "T1ERA AI";
    const headerClass = isUser ? "user" : "assistant";
    const alignClass = isUser ? "text-center" : "text-left"; // USER IS CENTERED, ASSISTANT IS LEFT-ALIGNED

    wrapper.innerHTML = `
            <div class="max-w-3xl w-full mx-auto flex flex-col gap-2">
                <div class="ai-studio-msg-box relative w-full">
                    
                    <!-- HEADER SECTION (Centered Alignment with copy button on top-right) -->
                    <div class="ai-studio-box-header ${headerClass}">
                        <span>${isUser ? "👤" : "✨"} ${speakerLabel}</span>
                        <button class="btn-copy-msg text-neutral-500 hover:text-white transition-colors" title="Copy Message text">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                            </svg>
                        </button>
                    </div>

                    <!-- BODY SECTION (Message Text Content - Center for User, Left for AI) -->
                    <div class="ai-studio-box-body ${alignClass}">
                        ${content}
                    </div>

                    <!-- FOOTER SECTION (Centered Alignment, Small Font) -->
                    <div class="ai-studio-box-footer">
                        ${isUser ? "CLIENT INFERENCE PIPELINE REQUEST" : "PROMPT LAB CONTEXT INTERACTION LOG"}
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
      copyBtn.addEventListener("click", function () {
        const textBody = wrapper.querySelector(".ai-studio-box-body");
        if (textBody) {
          const textToCopy = textBody.innerText;
          navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
              showToastNotification("Message copied to clipboard!");
              copyBtn.classList.remove("text-neutral-500");
              copyBtn.classList.add("text-emerald-400");
              setTimeout(() => {
                copyBtn.classList.remove("text-emerald-400");
                copyBtn.classList.add("text-neutral-500");
              }, 1500);
            })
            .catch((err) => {
              logToTerminal("Copy action failed: " + err, "error");
            });
        }
      });
    }

    // Bind individual code block copy triggers
    const codeCopyBtns = wrapper.querySelectorAll(".btn-copy-code");
    codeCopyBtns.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const container = btn.closest(".ai-studio-code-container");
        const codeEl = container ? container.querySelector("pre code") : null;
        if (codeEl) {
          const codeText = codeEl.innerText;
          navigator.clipboard
            .writeText(codeText)
            .then(() => {
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
            })
            .catch((err) => {
              logToTerminal("Failed to copy code: " + err, "error");
            });
        }
      });
    });

    // Bind Image Download triggers dynamically
    const imgDownloadBtns = wrapper.querySelectorAll(
      ".btn-download-studio-img",
    );
    imgDownloadBtns.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const url = btn.getAttribute("data-url");
        if (url) {
          initiateSecureImageDownload(
            url,
            `t1era_studio_graphic_${Date.now()}.webp`,
          );
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
      container.className =
        "fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] flex flex-col gap-2 pointer-events-none select-none";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className =
      "ai-studio-toast flex items-center gap-2 bg-[#111115]/95 backdrop-blur-md border border-indigo-500/20 text-[11px] font-mono font-bold text-white px-4 py-2.5 rounded-lg shadow-2xl opacity-0 transform translate-y-[-10px] pointer-events-auto cursor-pointer";
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

  // Dynamic zoom using existing Dashboard Lightbox modal
  window.zoomAIStudioImage = function (src) {
    const lightbox = document.getElementById("story-image-lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");
    const lightboxTag = document.getElementById("lightbox-scene-tag");

    if (lightbox && lightboxImg) {
      lightboxImg.src = src;
      if (lightboxCaption)
        lightboxCaption.innerText =
          "T1ERA Prompt Lab Generated Widescreen Asset";
      if (lightboxTag) lightboxTag.innerText = "PLAYGROUND CANVAS";
      lightbox.classList.remove("hidden");
      logToTerminal("Opened graphic asset zoom lightbox overlay.", "system");
    }
  };

  // Client-side secure downloader bypassing standard browser CORS navigation locks
  function initiateSecureImageDownload(url, filename) {
    logToTerminal("Preparing binary graphic download stream...", "system");

    if (url.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToastNotification("Image downloaded successfully!");
    } else {
      // Fetch remote CDN resource as blob to force browser download stream
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error();
          return response.blob();
        })
        .then((blob) => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          showToastNotification("Image downloaded successfully!");
        })
        .catch(() => {
          // Fallback to direct tab opening if CDN CORS fails
          window.open(url, "_blank");
          showToastNotification("Opened original asset in new tab.");
        });
    }
  }

  // -----------------------------------------------------------------
  // 6c. Code / Preview Split Panel (Claude Artifacts-style)
  // -----------------------------------------------------------------

  // Pulls the first fenced code block out of a reply (```html ... ``` or a
  // bare ``` ... ``` block), since that's what the split panel renders.
  function extractFirstCodeBlock(text) {
    if (!text) return null;
    const match = text.match(/```(?:html|htm)?\s*\r?\n([\s\S]*?)```/i);
    return match ? match[1].trim() : null;
  }

  function showCodePanelTab(which) {
    const showPreview = which === "preview";
    if (codePreviewFrame)
      codePreviewFrame.classList.toggle("hidden", !showPreview);
    if (codeViewPre) codeViewPre.classList.toggle("hidden", showPreview);
    if (btnCodeTabPreview) {
      btnCodeTabPreview.classList.toggle("bg-indigo-600", showPreview);
      btnCodeTabPreview.classList.toggle("text-white", showPreview);
      btnCodeTabPreview.classList.toggle("text-neutral-400", !showPreview);
    }
    if (btnCodeTabCode) {
      btnCodeTabCode.classList.toggle("bg-indigo-600", !showPreview);
      btnCodeTabCode.classList.toggle("text-white", !showPreview);
      btnCodeTabCode.classList.toggle("text-neutral-400", showPreview);
    }
  }

  function openCodePanel() {
    if (!codePanel) return;
    codePanel.classList.remove("hidden");
    codePanel.classList.add("flex");
    showCodePanelTab("preview");
  }

  function closeCodePanel() {
    if (!codePanel) return;
    codePanel.classList.add("hidden");
    codePanel.classList.remove("flex");
  }

  // Called after any live reply renders — if it contains a code block, open
  // (or refresh) the split panel with a live iframe preview + code view.
  function detectAndRenderCodePanel(aiText) {
    const code = extractFirstCodeBlock(aiText);
    if (!code) return;

    lastGeneratedCode = code;
    if (codeViewContent) {
      codeViewContent.textContent = code;
      if (typeof Prism !== "undefined") {
        Prism.highlightElement(codeViewContent);
      }
    }
    if (codePreviewFrame) codePreviewFrame.srcdoc = code;
    openCodePanel();
    logToTerminal(
      "Code block detected in reply — opened split preview panel.",
      "success",
    );
  }

  if (btnCodeTabPreview) {
    btnCodeTabPreview.addEventListener("click", function () {
      showCodePanelTab("preview");
    });
  }
  if (btnCodeTabCode) {
    btnCodeTabCode.addEventListener("click", function () {
      showCodePanelTab("code");
    });
  }
  if (btnCodePanelClose) {
    btnCodePanelClose.addEventListener("click", closeCodePanel);
  }
  if (btnCodePanelDownload) {
    btnCodePanelDownload.addEventListener("click", function () {
      if (!lastGeneratedCode) return;
      const blob = new Blob([lastGeneratedCode], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `t1era_generated_page_${Date.now()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    });
  }

  // Serializes active chatHistory stack straight to local browser storage
  function savePersistedHistory() {
    localStorage.setItem(
      "t1era_ai_studio_chat_history",
      JSON.stringify(chatHistory),
    );
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

        chatHistory.forEach((turn) => {
          if (turn.role === "user") {
            createCenteredMessageBubble("user", turn.content, "0.0", false);
          } else if (turn.role === "assistant") {
            // Support both text and dynamic image render parsing in storage hydration
            if (turn.content.startsWith("Image generation: ")) {
              // Extract prompt and rebuild image payload mock if re-loaded
              const promptText = turn.content.substring(18);
              createCenteredMessageBubble(
                "assistant",
                `
                                <div class="space-y-3 w-full flex flex-col items-center">
                                    <p class="text-xs text-neutral-300 w-full text-left">Auto-restored drawing illustration for prompt: "<em>${promptText}</em>"</p>
                                    <div class="rounded-lg overflow-hidden border border-[#1f1f29] shadow-2xl w-full my-2 bg-neutral-900">
                                        <p class="p-4 text-[10px] font-mono text-neutral-500 text-center">Reference URL expired. Request a new image to re-render.</p>
                                    </div>
                                </div>
                            `,
                "0.0",
                false,
              );
            } else {
              createCenteredMessageBubble(
                "assistant",
                parseMarkdownToHTML(turn.content),
                "0.0",
                false,
              );
            }
          }
        });
        logToTerminal(
          `Restored ${chatHistory.length} active discussion bubbles from LocalStorage thread memory.`,
          "success",
        );
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
    const optionNumber = numMatch ? numMatch[1] : optMatch ? optMatch[1] : null;

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
    const listPattern = new RegExp(
      `^\\s*${optionNumber}[\\.\\)]\\s*(.*)$`,
      "i",
    );

    for (const line of lines) {
      const match = line.match(listPattern);
      if (match) {
        const resolvedLabel = match[1].trim();
        logToTerminal(
          `Context Tracker: Resolved choice '${userInput}' -> option text: '${resolvedLabel}'`,
          "success",
        );
        return `${userInput} (Selection Reference Context: Option ${optionNumber} - "${resolvedLabel}")`;
      }
    }
    return userInput;
  }

  // Tracks keyword topic overlap changes, warning of context shifts in the terminal
  let activeTopicKeywords = [];
  function trackTopicKeywordsShift(newPromptText) {
    const stopWords = [
      "the",
      "and",
      "but",
      "for",
      "with",
      "this",
      "that",
      "you",
      "are",
      "have",
      "not",
      "make",
      "create",
      "write",
      "code",
    ];
    const cleanWords = newPromptText
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.includes(w));

    if (cleanWords.length === 0) return; // Short message/continuation

    if (activeTopicKeywords.length > 0) {
      const intersection = cleanWords.filter((w) =>
        activeTopicKeywords.includes(w),
      );
      const overlapRatio =
        intersection.length /
        Math.min(cleanWords.length, activeTopicKeywords.length);

      if (overlapRatio < 0.15 && cleanWords.length > 2) {
        logToTerminal(
          "System Context Shift: User changed discussion focus area.",
          "warning",
        );
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
      /^(?:generate|create|draw|paint|illustrate|make|design)\s+(?:an?\s+)?(?:image|picture|drawing|painting|graphic|illustration|poster|logo|banner|flyer|art|sketch|photo|photograph|wallpaper|icon|avatar)\s+(?:of|about|for\s+)?(.*)$/i,
      /^(?:draw|paint|illustrate|make|design)\s+(?:an?\s+)?(.*)$/i,
      /^(?:create|generate)\s+(?:an?\s+)?(.*)\s+(?:image|picture|drawing|illustration|poster|logo|banner|flyer|art|sketch|photo|photograph|wallpaper|icon|avatar)$/i,
    ];

    for (const regex of patterns) {
      const match = clean.match(regex);
      if (match && match[1]) {
        const startIdx = clean.indexOf(match[1]);
        return promptText.substring(startIdx).trim();
      }
    }

    // 3. Fallback: simple keyword prefix checks
    const simpleTriggers = [
      "create image",
      "generate image",
      "create poster",
      "generate poster",
      "create logo",
      "generate logo",
      "create banner",
      "generate banner",
      "draw",
      "paint",
      "illustrate",
      "design",
    ];
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
    const rawText = promptInput.value.strip
      ? promptInput.value.strip()
      : promptInput.value.trim();
    if (!rawText && !attachedFileMetadata) return;

    // Clear welcome helper splash block on first execution run
    const welcomePane = document.querySelector(".ai-studio-welcome-pane");
    if (welcomePane) {
      welcomePane.style.display = "none";
    }

    const isMiniModel = dropdownModel && dropdownModel.value === "gpt-5.4-mini";

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
      // Support both Base64 inline segments and plain text code parsing beautifully
      if (attachedFileMetadata.dataUrl) {
        let safeDataUrl = attachedFileMetadata.dataUrl;

        // Safe context window truncation guard
        if (safeDataUrl.length > 120000) {
          safeDataUrl =
            safeDataUrl.substring(0, 120000) +
            "\n... [Binary content truncated to protect model context window limits] ...";
        }

        const isImageFile = attachedFileMetadata.type.startsWith("image/");
        const isVideoFile = attachedFileMetadata.type.startsWith("video/");

        if (isImageFile) {
          // Send the highly compressed background dataUrl to the model, but render the high-res local image for display
          attachmentSegment = `\n\n=== ATTACHED IMAGE CONTEXT ===\nFilename: ${attachedFileMetadata.name}\nMIME Type: ${attachedFileMetadata.type}\nData URL (Compressed Payload):\n${attachedFileMetadata.dataUrl}`;

          messageOutput += `
                        <div class="mt-3 rounded-lg overflow-hidden border border-[#1f1f29] max-w-sm bg-neutral-900 shadow-lg">
                            <img src="${attachedFileMetadata.displayUrl}" class="w-full h-auto object-cover cursor-zoom-in" alt="Attached preview" onclick="zoomAIStudioImage(this.src)">
                        </div>
                    `;
        } else if (isVideoFile) {
          attachmentSegment = `\n\n=== ATTACHED VIDEO CONTEXT ===\nFilename: ${attachedFileMetadata.name}\nMIME Type: ${attachedFileMetadata.type}\nData URL Payload:\n${safeDataUrl}`;

          messageOutput += `
                        <div class="mt-3 rounded-lg overflow-hidden border border-[#1f1f29] max-w-sm bg-neutral-900 shadow-lg">
                            <video src="${attachedFileMetadata.dataUrl}" controls class="w-full h-auto max-h-[240px]"></video>
                        </div>
                    `;
        } else {
          attachmentSegment = `\n\n=== ATTACHED FILE CONTEXT ===\nFilename: ${attachedFileMetadata.name}\nMIME Type: ${attachedFileMetadata.type}\nPayload:\n${safeDataUrl}`;

          messageOutput += `
                        <div class="mt-2.5 flex items-center gap-2 p-2 bg-neutral-900 border border-[#1f1f29] rounded text-[10px] text-neutral-300 font-mono w-fit">
                            <svg class="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            <span>📎 Document: ${attachedFileMetadata.name}</span>
                        </div>
                    `;
        }
      } else {
        attachmentSegment = `\n\n[Attached Reference Context: ${attachedFileMetadata.name}]\n\`\`\`\n${attachedFileMetadata.content}\n\`\`\``;
        messageOutput += `<div class="mt-2.5 flex items-center gap-1.5 px-2 py-1 bg-neutral-900 border border-[#1f1f29] rounded text-[10px] text-neutral-400 font-mono w-fit">
                    <span>📎 Reference Context: ${attachedFileMetadata.name}</span>
                </div>`;
      }
    }

    const startTime = performance.now();

    // Append User Prompts Centered
    createCenteredMessageBubble("user", messageOutput, "0.0");

    // Save into local history array for back-and-forth continuity
    chatHistory.push({
      role: "user",
      content: resolvedText + attachmentSegment,
    });

    // Clear inputs
    promptInput.value = "";
    promptInput.style.height = "auto";
    attachedFileMetadata = null;
    if (uploadPreview) uploadPreview.classList.add("hidden");
    if (fileUploadInput) fileUploadInput.value = "";

    // Setup empty assistant bubble placeholder
    const assistantBubble = createCenteredMessageBubble(
      "assistant",
      `
            <div class="flex items-center gap-2 text-neutral-500 font-mono text-[11px] py-1">
                <div class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></div>
                <span class="loading-status-text">Analyzing instructions & dispatching query...</span>
            </div>
        `,
      "0.0",
      false,
    ); // Do not persist the loading state

    const loadingStatusEl = assistantBubble.querySelector(
      ".loading-status-text",
    );

    // Case 1: Handle live Image Generation Route (Centered Full-Width rendering with download tool)
    if (imagePrompt) {
      if (loadingStatusEl)
        loadingStatusEl.innerText =
          "Connecting to universal graphic engine (DALL-E)...";
      logToTerminal(
        `AI Studio Image: Requesting universal graphic model for prompt: "${imagePrompt}"`,
        "system",
      );

      try {
        const imgResponse = await fetch(
          `${RENDER_BACKEND_URL}/api/ai-studio/generate-image`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: imagePrompt }),
          },
        );

        if (!imgResponse.ok) {
          throw new Error(
            `Server returned error status: ${imgResponse.status}`,
          );
        }

        const imgData = await imgResponse.json();
        if (imgData.success) {
          const duration = ((performance.now() - startTime) / 1000).toFixed(1);

          // Rendered full-width (w-full) centered inside padded block container
          const htmlCard = `
                        <div class="space-y-4 w-full flex flex-col items-center">
                            <p class="text-xs text-neutral-300 w-full text-left">Here is your auto-generated drawing illustration:</p>
                            <div class="rounded-lg overflow-hidden border border-[#1f1f29] shadow-2xl w-full my-2 bg-neutral-900">
                                <img src="${imgData.image_url}" class="w-full h-auto object-cover cursor-zoom-in max-h-[480px]" alt="Universal generated card" onclick="zoomAIStudioImage(this.src)">
                            </div>
                            <!-- Centered Action buttons below image block -->
                            <div class="flex items-center justify-center gap-2 w-full">
                                <button class="btn-download-studio-img flex items-center gap-1.5 px-3 py-1.5 bg-[#17171e] hover:bg-neutral-800 border border-[#1f1f29] rounded text-[10px] text-neutral-300 font-mono font-bold transition-all" data-url="${imgData.image_url}">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    <span>DOWNLOAD ASSET</span>
                                </button>
                            </div>
                        </div>
                    `;

          const contentBody = assistantBubble.querySelector(
            ".ai-studio-box-body",
          );
          if (contentBody) contentBody.innerHTML = htmlCard;

          const outsideMeta = assistantBubble.querySelector(
            ".ai-studio-outside-meta",
          );
          if (outsideMeta) {
            const now = new Date();
            outsideMeta.innerHTML = `<span>[${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}]</span><span>•</span><span>${duration}s response</span>`;
          }

          // Re-bind download trigger for newly rendered image card
          const dlBtn = assistantBubble.querySelector(
            ".btn-download-studio-img",
          );
          if (dlBtn) {
            dlBtn.addEventListener("click", function (e) {
              e.stopPropagation();
              initiateSecureImageDownload(
                imgData.image_url,
                `t1era_studio_graphic_${Date.now()}.webp`,
              );
            });
          }

          // Save assistant message to chat history
          chatHistory.push({
            role: "assistant",
            content: `Image generation: ${imagePrompt}`,
          });
          savePersistedHistory();
          logToTerminal("AI Studio universal image retrieved.", "success");
        }
      } catch (err) {
        logToTerminal(
          `AI Studio graphic process failed: ${err.message}`,
          "error",
        );
        const contentBody = assistantBubble.querySelector(
          ".ai-studio-box-body",
        );
        if (contentBody)
          contentBody.innerHTML = `<span class="text-red-400 font-mono flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>Image Generation Failure: ${err.message}</span>`;
      }
      return;
    }

    // Case 2: Handle fallback mock model
    if (!isMiniModel) {
      setTimeout(() => {
        const totalSec = "1.2";
        const contentBody = assistantBubble.querySelector(
          ".ai-studio-box-body",
        );
        if (contentBody) {
          contentBody.innerHTML = parseMarkdownToHTML(
            "==T1ERA-Ultra-v2== is currently inactive. Select the live **gpt-5.4-mini** model option inside the settings panel to initiate real backend transactions.",
          );
        }
        const outsideMeta = assistantBubble.querySelector(
          ".ai-studio-outside-meta",
        );
        if (outsideMeta) {
          const now = new Date();
          const timestamp = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          outsideMeta.innerHTML = `
                        <span>[${timestamp}]</span>
                        <span>•</span>
                        <span>${totalSec}s response</span>
                    `;
        }
        chatHistory.push({
          role: "assistant",
          content: "==T1ERA-Ultra-v2== is currently inactive.",
        });
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
        if (loadingStatusEl)
          loadingStatusEl.innerText =
            "Awaiting container wake up (Render Free Tier cold start)...";
        logToTerminal(
          "No response packet yet. Render container might be booting up...",
          "warning",
        );
      } else if (progressTicks === 15) {
        if (loadingStatusEl)
          loadingStatusEl.innerText =
            "Still waiting for container boot (can take up to 75 seconds on first call)...";
      } else if (progressTicks === 35) {
        if (loadingStatusEl)
          loadingStatusEl.innerText =
            "Connecting to standard backend layers...";
      } else if (progressTicks === 55) {
        if (loadingStatusEl)
          loadingStatusEl.innerText =
            "Compiling prompt context & calling inference core...";
      }
    }, 5000);

    // AbortController setup to prevent infinite waiting
    const controller = new AbortController();
    const safetyTimeout = setTimeout(() => {
      controller.abort();
    }, 95000); // 95-second dynamic safety timeout for cold starts

    try {
      logToTerminal(
        "Dispatching playground prompt packet to live backend...",
        "system",
      );

      // Compile system settings variables
      const systemInstructions = document.getElementById(
        "setting-ai-studio-system",
      )
        ? document.getElementById("setting-ai-studio-system").value.trim()
        : "";

      // Build lightweight directory context if LRU is enabled
      let contextPayload = "";
      const isLruActive = extToggleLru && extToggleLru.checked;
      if (isLruActive && typeof window.getWorkspaceFileSystem === "function") {
        const currentFileSystem = window.getWorkspaceFileSystem();
        const allFilesList = flattenFilesList(currentFileSystem);
        contextPayload += "=== WORKSPACE DIRECTORY INDEX ===\n";
        allFilesList.forEach((file) => {
          contextPayload += `Path: ${file.name} | Type: ${file.isMedia ? "Media" : "Code"}\n`;
        });
      }

      const payload = {
        messages: chatHistory,
        workspace_context: contextPayload,
        system_prompt: systemInstructions || null,
      };

      const response = await fetch(`${RENDER_BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify(payload),
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

      // If the reply contains a code block, mirror it into the split panel
      detectAndRenderCodePanel(aiText);

      // Sync dynamic latency seconds to the outside meta label
      const outsideMeta = assistantBubble.querySelector(
        ".ai-studio-outside-meta",
      );
      if (outsideMeta) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        outsideMeta.innerHTML = `
                    <span>[${timestamp}]</span>
                    <span>•</span>
                    <span>${totalSec}s response</span>
                `;
      }

      savePersistedHistory();
      logToTerminal(
        "Live backend response packets retrieved successfully.",
        "success",
      );
    } catch (err) {
      clearInterval(progressInterval);
      clearTimeout(safetyTimeout);
      console.error(err);

      let displayError = err.message;
      if (err.name === "AbortError") {
        displayError =
          "Request timed out (Render container took >95 seconds to respond. Check if the server is still sleeping).";
        logToTerminal(
          "Downstream transaction aborted: Render server spin-up timed out.",
          "error",
        );
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
