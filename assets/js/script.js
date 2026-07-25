document.addEventListener("DOMContentLoaded", function () {
    
    // -----------------------------------------------------------------
    // 0. Configuration Setup (Set your Render app link here)
    // -----------------------------------------------------------------
    const RENDER_BACKEND_URL = "https://smartkiddo-admin.onrender.com"; // Your live Render URL

    // -----------------------------------------------------------------
    // 1. DOM Element Declarations (Scoped to Top to prevent ReferenceErrors)
    // -----------------------------------------------------------------
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
    const bodyElement = document.body;

    const studioWorkspace = document.getElementById('studio-workspace');
    const mainContentInner = document.getElementById('main-content-inner');
    const mainContentScroll = document.getElementById('main-content-scroll');
    const studioMaximizeBtn = document.getElementById('studio-maximize-btn');

    const terminalPanel = document.getElementById('studio-terminal');
    const terminalToggleBtn = document.getElementById('terminal-toggle-btn');
    const terminalToggleIcon = document.getElementById('terminal-toggle-icon');
    const terminalCloseBtn = document.getElementById('terminal-close-btn');
    const tabTerminalToggleBtn = document.getElementById('tab-terminal-toggle-btn');

    const explorerTree = document.getElementById('explorer-file-tree');
    const activeFileNameEl = document.getElementById('editor-active-filename');
    const editorTextarea = document.getElementById('editor-textarea');
    const highlightTarget = document.getElementById('editor-highlight-target');
    const lineNumbersContainer = document.getElementById('editor-line-numbers');
    
    const codeEditorPane = document.getElementById('code-editor-pane');
    const mediaViewerPane = document.getElementById('media-viewer-pane');
    const mediaContentWrapper = document.getElementById('media-content-wrapper');

    const syncPullBtn = document.getElementById('explorer-sync-pull');
    const syncPushBtn = document.getElementById('explorer-sync-push');
    const newFileBtn = document.getElementById('explorer-new-file');
    const newFolderBtn = document.getElementById('explorer-new-folder');
    const fileUploadInput = document.getElementById('explorer-file-upload');
    const breadcrumbTitle = document.getElementById('breadcrumb-title');

    const searchToggleBtn = document.getElementById('editor-search-toggle');
    const searchBar = document.getElementById('editor-search-bar');
    const searchInput = document.getElementById('editor-search-input');
    const searchCountEl = document.getElementById('editor-search-count');

    // SVGs for sidebar status toggling
    const hamburgerIcon = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
    `;

    const arrowLeftIcon = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
        </svg>
    `;

    // -----------------------------------------------------------------
    // 2. TERMINAL LOG UTILITY (Prints structured and timestamped outputs)
    // -----------------------------------------------------------------
    function logToTerminal(message, type = 'info') {
        const output = document.getElementById('terminal-log-output');
        if (!output) return;

        const timestamp = new Date().toLocaleTimeString();
        let colorClass = 'text-neutral-400';
        let prefix = '[info]';

        if (type === 'success') {
            colorClass = 'text-emerald-400';
            prefix = '[success]';
        } else if (type === 'error') {
            colorClass = 'text-red-400';
            prefix = '[error]';
        } else if (type === 'system') {
            colorClass = 'text-neutral-500';
            prefix = '[system]';
        } else if (type === 'warning') {
            colorClass = 'text-amber-400';
            prefix = '[warning]';
        }

        const logRow = document.createElement('div');
        logRow.className = `${colorClass} leading-relaxed font-mono select-text`;
        logRow.innerHTML = `<span class="text-neutral-600 select-none">[${timestamp}]</span> <span class="font-bold select-none">${prefix}</span> ${message}`;
        
        output.appendChild(logRow);
        // Autoscroll to the latest log item
        output.scrollTop = output.scrollHeight;
    }

    // Initialize System Status on Terminal
    logToTerminal("Terminal console logs initialized.", "system");
    logToTerminal(`Endpoint connected: ${RENDER_BACKEND_URL}`, "system");

    // Helper functions to manage screen loader
    function showLoader(message) {
        const overlay = document.getElementById('studio-loader-overlay');
        const text = document.getElementById('studio-loader-text');
        if (overlay && text) {
            text.innerText = message;
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        }
    }

    // Swaps height and overflow visibility rules cleanly to avoid parent collapse bugs [2]
    function hideLoader() {
        const overlay = document.getElementById('studio-loader-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }
    }

    // -----------------------------------------------------------------
    // 3. SIDEBAR AND TAB VIEW NAVIGATION LOGIC
    // -----------------------------------------------------------------
    function updateSidebarToggleIcon() {
        if (sidebarToggleIcon && bodyElement) {
            if (bodyElement.classList.contains('sidebar-collapsed')) {
                sidebarToggleIcon.innerHTML = hamburgerIcon;
            } else {
                sidebarToggleIcon.innerHTML = arrowLeftIcon;
            }
        }
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function () {
            if (bodyElement) bodyElement.classList.toggle('sidebar-collapsed');
            updateSidebarToggleIcon();
        });
    }

    const menuMapping = {
        'btn-t1era-studio': { viewId: 'view-t1era-studio', breadcrumb: 'T1ERA Studio', adjustLayout: false },
        'btn-list-user': { viewId: 'view-list-user', breadcrumb: 'List User', adjustLayout: false },
        'btn-statistic': { viewId: 'view-statistic', breadcrumb: 'Statistic', adjustLayout: false },
        'btn-websources-code': { viewId: 'view-websources-code', breadcrumb: 'websources code', adjustLayout: true }
    };

    Object.keys(menuMapping).forEach(btnId => {
        const button = document.getElementById(btnId);
        if (button) {
            button.addEventListener('click', function (e) {
                e.preventDefault();
                switchTab(btnId);
            });
        }
    });

    function switchTab(clickedId) {
        const layoutConfig = menuMapping[clickedId];
        if (!layoutConfig) return;
        
        // Auto-Collapse sidebar if "websources code" is selected
        if (layoutConfig.adjustLayout) {
            if (bodyElement && !bodyElement.classList.contains('sidebar-collapsed')) {
                bodyElement.classList.add('sidebar-collapsed');
                updateSidebarToggleIcon();
            }
            if (mainContentScroll) {
                // Swaps the scrolling classes cleanly to avoid flexbox height collapse issues [2]
                mainContentScroll.classList.remove('overflow-y-auto');
                mainContentScroll.classList.add('overflow-hidden');
            }
            if (mainContentInner) {
                mainContentInner.classList.remove('p-8');
                mainContentInner.classList.add('p-4');
                mainContentInner.classList.add('h-full');
            }
        } else {
            if (mainContentScroll) {
                mainContentScroll.classList.add('overflow-y-auto');
                mainContentScroll.classList.remove('overflow-hidden');
            }
            if (mainContentInner) {
                mainContentInner.classList.add('p-8');
                mainContentInner.classList.remove('p-4');
                mainContentInner.classList.remove('h-full');
            }
            
            // Cleanly restore workspace from Maximized state if navigating away
            if (studioWorkspace && studioWorkspace.classList.contains('studio-maximized')) {
                toggleMaximize();
            }
        }

        // Toggle visibility of panels
        Object.keys(menuMapping).forEach(btnId => {
            const viewId = menuMapping[btnId].viewId;
            const viewElement = document.getElementById(viewId);
            if (viewElement) {
                if (btnId === clickedId) {
                    viewElement.classList.remove('hidden');
                    viewElement.classList.add('block');
                } else {
                    viewElement.classList.remove('block');
                    viewElement.classList.add('hidden');
                }
            }
        });

        // Set navbar breadcrumb text
        if (breadcrumbTitle) {
            breadcrumbTitle.innerText = layoutConfig.breadcrumb;
        }

        // Apply active styling states to navigation elements
        Object.keys(menuMapping).forEach(btnId => {
            const element = document.getElementById(btnId);
            const svgIcon = element ? element.querySelector('svg') : null;
            if (element) {
                if (btnId === clickedId) {
                    element.className = "flex items-center gap-3 px-4 py-3 rounded-lg text-white bg-indigo-600/10 border border-indigo-500/20 transition-colors group";
                    if (svgIcon) svgIcon.className = "w-5 h-5 text-indigo-400";
                } else {
                    element.className = "flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1a1a22] transition-colors group";
                    if (svgIcon) svgIcon.className = "w-5 h-5 text-neutral-500 group-hover:text-indigo-400";
                }
            }
        });
    }

    // -----------------------------------------------------------------
    // 4. TERMINAL PANEL VISIBILITY CONTROLS
    // -----------------------------------------------------------------
    const terminalIconArrowDown = `
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
    `;

    const terminalIconArrowUp = `
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
        </svg>
    `;

    // Toggle: Minimize or Restore (normal height)
    if (terminalToggleBtn && terminalPanel) {
        terminalToggleBtn.addEventListener('click', function () {
            if (terminalPanel.classList.contains('minimized')) {
                terminalPanel.classList.remove('minimized');
                if (terminalToggleIcon) terminalToggleIcon.innerHTML = terminalIconArrowDown;
                logToTerminal("Terminal panel size restored.", "system");
            } else {
                terminalPanel.classList.add('minimized');
                if (terminalToggleIcon) terminalToggleIcon.innerHTML = terminalIconArrowUp;
                logToTerminal("Terminal panel minimized.", "system");
            }
        });
    }

    // Close: Completely hide terminal panel
    if (terminalCloseBtn && terminalPanel) {
        terminalCloseBtn.addEventListener('click', function () {
            terminalPanel.classList.add('closed');
            logToTerminal("Terminal panel closed.", "system");
        });
    }

    // Header Tab Bar Toggle (Restore / Toggle visibility of terminal)
    if (tabTerminalToggleBtn && terminalPanel) {
        tabTerminalToggleBtn.addEventListener('click', function () {
            if (terminalPanel.classList.contains('closed')) {
                terminalPanel.classList.remove('closed');
                terminalPanel.classList.remove('minimized');
                if (terminalToggleIcon) terminalToggleIcon.innerHTML = terminalIconArrowDown;
                logToTerminal("Terminal panel restored via Workspace Toolbar.", "system");
            } else {
                terminalPanel.classList.add('closed');
                logToTerminal("Terminal panel closed via Workspace Toolbar.", "system");
            }
        });
    }

    // -----------------------------------------------------------------
    // 5. VS Code Studio Maximize Workspace Logic
    // -----------------------------------------------------------------
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

    function toggleMaximize() {
        if (!studioWorkspace || !mainContentInner || !studioMaximizeBtn) return;

        studioWorkspace.classList.toggle('studio-maximized');
        mainContentInner.classList.toggle('container-maximized');

        // Swap icons and update accessibility attributes
        if (studioWorkspace.classList.contains('studio-maximized')) {
            studioMaximizeBtn.innerHTML = shrinkIcon;
            studioMaximizeBtn.setAttribute('title', 'Minimize Workspace');
            logToTerminal("Workspace maximized to full screen height.", "system");
        } else {
            studioMaximizeBtn.innerHTML = expandIcon;
            studioMaximizeBtn.setAttribute('title', 'Maximize Workspace');
            logToTerminal("Workspace restored to default limits.", "system");
        }
    }

    if (studioMaximizeBtn) {
        studioMaximizeBtn.addEventListener('click', toggleMaximize);
    }

    // -----------------------------------------------------------------
    // 6. VS Code Studio Mock File System Logic
    // -----------------------------------------------------------------
    let fileSystem = [
        {
            id: 'f1', name: 'src', type: 'folder', isOpen: true, children: [
                { id: 'c1', name: 'index.html', type: 'file', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>SmartKiddo Universe</title>\n</head>\n<body style="background: #000; color: #fff;">\n    <h1>Welcome to the Universe!</h1>\n</body>\n</html>' },
                { id: 'c2', name: 'styles.css', type: 'file', content: '/* SmartKiddo Custom Stylings */\nbody {\n    background-color: #0f0f12;\n    color: #6366f1;\n    font-family: sans-serif;\n}' }
            ]
        },
        {
            id: 'f2', name: 'scripts', type: 'folder', isOpen: true, children: [
                { id: 'c3', name: 'main.py', type: 'file', content: '# Python child process controller\n\ndef init_universe():\n    print("SmartKiddo engine status: operational")\n\nif __name__ == "__main__":\n    init_universe()' },
                { id: 'c4', name: 'app.js', type: 'file', content: '// Javascript service integration\nconst userGroup = "Administrators";\n\nfunction verifyCredentials() {\n    console.log(`Verifying credentials for: ${userGroup}`);\n}' }
            ]
        },
        {
            id: 'm1', name: 'assets', type: 'folder', isOpen: true, children: [
                { id: 'img1', name: 'kiddo-mascot.png', type: 'file', content: '', isMedia: true, format: 'image', url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=400&q=80' },
                { id: 'vid1', name: 'welcome-intro.mp4', type: 'file', content: '', isMedia: true, format: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
            ]
        }
    ];

    let currentSelectedFile = null;
    if (fileSystem && fileSystem[0] && fileSystem[0].children) {
        currentSelectedFile = fileSystem[0].children[0];
    }
    
    let selectedFolderId = null; // Track current highlighted active directory node
    let activeFileEdited = false; // Prevents logging edits repeatedly per editing session

    // Sync input events to syntax highlight renderer
    if (editorTextarea) {
        editorTextarea.addEventListener('input', function() {
            if (currentSelectedFile && !currentSelectedFile.isMedia) {
                currentSelectedFile.content = this.value;
                updateHighlight();
                updateLineNumbers();

                // If search query is present, re-apply highlights
                if (searchInput && searchInput.value.trim() !== '') {
                    performSearch(searchInput.value);
                }

                // Log edit changes on first interaction
                if (!activeFileEdited) {
                    logToTerminal(`Modifying file: ${currentSelectedFile.name} (In-memory)...`, 'warning');
                    activeFileEdited = true;
                }
            }
        });

        // Link horizontal and vertical scroll values between layers
        editorTextarea.addEventListener('scroll', function() {
            const preElement = document.getElementById('editor-pre');
            const linesLayer = document.getElementById('editor-highlight-lines-layer');
            if (preElement) {
                preElement.scrollTop = this.scrollTop;
                preElement.scrollLeft = this.scrollLeft;
            }
            if (linesLayer) {
                linesLayer.scrollTop = this.scrollTop;
            }
            if (lineNumbersContainer) lineNumbersContainer.scrollTop = this.scrollTop;
        });

        // Tab indentation interceptor
        editorTextarea.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;

                // Set indent width to 4 space characters
                this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 4;
                
                // Dispatch input event to refresh highlighter overlays
                const inputEvent = new Event('input');
                this.dispatchEvent(inputEvent);
            }
        });
    }

    // Identify parser configuration matching file extensions
    function getPrismLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'html') return 'html';
        if (ext === 'css') return 'css';
        if (ext === 'py') return 'python';
        if (ext === 'js' || ext === 'javascript') return 'javascript';
        return 'html'; // Fallback language parsing target
    }

    // Check file path configuration for known media formats
    function assessMediaFormat(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
            return { isMedia: true, format: 'image' };
        }
        if (['mp4', 'webm', 'ogg'].includes(ext)) {
            return { isMedia: true, format: 'video' };
        }
        return { isMedia: false, format: null };
    }

    // Render line metrics on view change
    function updateLineNumbers() {
        if (!lineNumbersContainer || !editorTextarea) return;
        const lineCount = editorTextarea.value.split('\n').length;
        let lineString = '';
        for (let i = 1; i <= lineCount; i++) {
            lineString += `<div>${i}</div>`;
        }
        lineNumbersContainer.innerHTML = lineString;
    }

    // Force code update parsing inside Prism.js
    function updateHighlight() {
        if (!highlightTarget || !editorTextarea || !currentSelectedFile) return;
        
        const lang = getPrismLanguage(currentSelectedFile.name);
        highlightTarget.className = `language-${lang}`;
        
        // Escape characters inside markup files
        let rawContent = editorTextarea.value;
        if (lang === 'html') {
            rawContent = rawContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        
        highlightTarget.innerHTML = rawContent;
        if (window.Prism) {
            window.Prism.highlightElement(highlightTarget);
        }
    }

    // Renders either code editor or media viewers depending on format
    function openFile(file) {
        if (!file) return;
        currentSelectedFile = file;
        if (activeFileNameEl) activeFileNameEl.innerText = file.name;
        activeFileEdited = false; // Reset modifications log state for newly opened files
        
        // Clear active search context on file change
        if (searchInput) searchInput.value = '';
        if (searchCountEl) searchCountEl.innerText = '0 found';
        const linesLayer = document.getElementById('editor-highlight-lines-layer');
        if (linesLayer) linesLayer.innerHTML = '';

        logToTerminal(`Loading file path in viewport: ${file.name}`, 'info');

        if (file.isMedia) {
            // Display media panels
            if (codeEditorPane) codeEditorPane.classList.add('hidden');
            if (mediaViewerPane) mediaViewerPane.classList.remove('hidden');
            
            // Build absolute streaming path via proxy structure
            let mediaUrl = file.url;
            if (mediaUrl && mediaUrl.startsWith('/api/')) {
                mediaUrl = `${RENDER_BACKEND_URL}${file.url}`;
            }

            if (mediaContentWrapper) {
                if (file.format === 'image') {
                    mediaContentWrapper.innerHTML = `<img src="${mediaUrl}" alt="${file.name}" class="object-contain max-h-[300px]">`;
                } else if (file.format === 'video') {
                    mediaContentWrapper.innerHTML = `<video controls src="${mediaUrl}" class="max-h-[300px] w-full"></video>`;
                }
            }
        } else {
            // Display normal code editor
            if (mediaViewerPane) mediaViewerPane.classList.add('hidden');
            if (codeEditorPane) codeEditorPane.classList.remove('hidden');
            
            if (editorTextarea) editorTextarea.value = file.content;
            updateHighlight();
            updateLineNumbers();
        }
        
        renderTree();
    }

    // -----------------------------------------------------------------
    // 7. File Tree UI Generation, Sorting, Recursion
    // -----------------------------------------------------------------

    // Sort folders to the top and files to the bottom of the tree recursively [2]
    function sortFileSystem(nodes) {
        if (!Array.isArray(nodes)) return;
        
        nodes.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1; // Folder goes up [2]
            if (a.type === 'file' && b.type === 'folder') return 1;  // File goes down [2]
            return a.name.localeCompare(b.name); // Sort alphabetically if same type [2]
        });

        nodes.forEach(node => {
            if (node.type === 'folder' && Array.isArray(node.children)) {
                sortFileSystem(node.children);
            }
        });
    }

    function createTreeNodeHTML(node, depth = 0) {
        const paddingLeft = depth * 16 + 12;
        const isActive = currentSelectedFile && currentSelectedFile.id === node.id;
        const isFolderSelected = selectedFolderId === node.id;
        
        if (node.type === 'folder') {
            const folderIcon = node.isOpen ? 
                `<svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>` : 
                `<svg class="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>`;
            
            let html = `
                <div class="explorer-item flex items-center justify-between py-1.5 px-3 cursor-pointer group ${isFolderSelected ? 'bg-indigo-600/10 text-white border-l-2 border-indigo-500' : ''}" style="padding-left: ${paddingLeft}px" data-folder-id="${node.id}">
                    <div class="flex items-center gap-2 flex-1 folder-toggle">
                        ${folderIcon}
                        <span class="font-medium text-neutral-300">${node.name}</span>
                    </div>
                    <button class="delete-node-btn opacity-0 group-hover:opacity-100 p-0.5 text-neutral-500 hover:text-red-400 rounded transition-opacity" data-node-id="${node.id}" title="Delete Folder">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
            
            if (node.isOpen && node.children) {
                node.children.forEach(child => {
                    html += createTreeNodeHTML(child, depth + 1);
                });
            }
            return html;
        } else {
            let fileIcon = `<svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>`;
            if (node.isMedia) {
                if (node.format === 'image') {
                    fileIcon = `<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
                } else {
                    fileIcon = `<svg class="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`;
                }
            } else {
                const ext = node.name.split('.').pop().toLowerCase();
                if (ext === 'py') {
                    fileIcon = `<svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`;
                } else if (ext === 'js') {
                    fileIcon = `<svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`;
                }
            }
            
            return `
                <div class="explorer-item flex items-center justify-between py-1.5 px-3 cursor-pointer group ${isActive ? 'active text-indigo-400 bg-indigo-600/10' : ''}" style="padding-left: ${paddingLeft}px" data-file-id="${node.id}">
                    <div class="flex items-center gap-2 flex-1 file-select">
                        ${fileIcon}
                        <span>${node.name}</span>
                    </div>
                    <button class="delete-node-btn opacity-0 group-hover:opacity-100 p-0.5 text-neutral-500 hover:text-red-400 rounded transition-opacity" data-node-id="${node.id}" title="Delete File">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
        }
    }

    function renderTree() {
        if (!explorerTree) return;
        sortFileSystem(fileSystem); // Force sort folders to top, files to bottom [2]
        let html = '';
        fileSystem.forEach(node => {
            html += createTreeNodeHTML(node, 0);
        });
        explorerTree.innerHTML = html;
        bindTreeEvents();
    }

    function bindTreeEvents() {
        document.querySelectorAll('.folder-toggle').forEach(el => {
            el.addEventListener('click', function(e) {
                const parent = this.parentElement;
                const folderId = parent.getAttribute('data-folder-id');
                const folder = findNodeById(fileSystem, folderId);
                if (folder) {
                    folder.isOpen = !folder.isOpen;
                    selectedFolderId = folder.id;
                    renderTree();
                }
            });
        });

        document.querySelectorAll('[data-folder-id]').forEach(el => {
            el.addEventListener('click', function(e) {
                if (!e.target.closest('.folder-toggle')) return;
                const folderId = this.getAttribute('data-folder-id');
                selectedFolderId = folderId;
                renderTree();
            });
        });

        document.querySelectorAll('.file-select').forEach(el => {
            el.addEventListener('click', function() {
                const parent = this.parentElement;
                const fileId = parent.getAttribute('data-file-id');
                const file = findNodeById(fileSystem, fileId);
                if (file) {
                    openFile(file);
                }
            });
        });

        document.querySelectorAll('.delete-node-btn').forEach(el => {
            el.addEventListener('click', function(e) {
                e.stopPropagation();
                const nodeId = this.getAttribute('data-node-id');
                if (confirm("Are you sure you want to delete this resource?")) {
                    deleteNode(nodeId);
                }
            });
        });
    }

    function findNodeById(nodes, id) {
        for (let node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNodeById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    }

    function deleteNode(id) {
        function removeRecursive(nodes) {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === id) {
                    nodes.splice(i, 1);
                    return true;
                }
                if (nodes[i].children) {
                    const removed = removeRecursive(nodes[i].children);
                    if (removed) return true;
                }
            }
            return false;
        }

        const deletedNode = findNodeById(fileSystem, id);
        if (deletedNode) {
            logToTerminal(`Deleted item from local memory: ${deletedNode.name}`, 'warning');
        }

        removeRecursive(fileSystem);
        
        if (currentSelectedFile && currentSelectedFile.id === id) {
            const firstFile = findFirstFile(fileSystem);
            if (firstFile) {
                openFile(firstFile);
            } else {
                currentSelectedFile = null;
                if (activeFileNameEl) activeFileNameEl.innerText = 'No file open';
                if (editorTextarea) editorTextarea.value = '';
                if (highlightTarget) highlightTarget.innerHTML = '';
                updateLineNumbers();
            }
        }
        renderTree();
    }

    function findFirstFile(nodes) {
        for (let node of nodes) {
            if (node.type === 'file') return node;
            if (node.children) {
                const found = findFirstFile(node.children);
                if (found) return found;
            }
        }
        return null;
    }

    // -----------------------------------------------------------------
    // 8. Creation and Directory Control Elements
    // -----------------------------------------------------------------
    if (newFileBtn) {
        newFileBtn.addEventListener('click', function() {
            const filename = prompt("Enter file name (e.g. script.js, index.html):");
            if (!filename) return;

            const mediaCheck = assessMediaFormat(filename);
            const newFile = {
                id: 'gen_' + Date.now(),
                name: filename,
                type: 'file',
                content: mediaCheck.isMedia ? '' : '/* New file text */',
                isMedia: mediaCheck.isMedia,
                format: mediaCheck.format,
                url: mediaCheck.isMedia ? 'https://picsum.photos/400/300' : ''
            };

            if (selectedFolderId) {
                const folder = findNodeById(fileSystem, selectedFolderId);
                if (folder && folder.type === 'folder') {
                    if (!folder.children) folder.children = [];
                    folder.children.push(newFile);
                    folder.isOpen = true;
                }
            } else {
                fileSystem.push(newFile);
            }
            
            logToTerminal(`Created file in memory: ${filename}`, 'info');
            renderTree();
            openFile(newFile);
        });
    }

    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', function() {
            const foldername = prompt("Enter folder name:");
            if (!foldername) return;

            const newFolder = {
                id: 'gen_' + Date.now(),
                name: foldername,
                type: 'folder',
                isOpen: true,
                children: []
            };

            if (selectedFolderId) {
                const parentFolder = findNodeById(fileSystem, selectedFolderId);
                if (parentFolder && parentFolder.type === 'folder') {
                    if (!parentFolder.children) parentFolder.children = [];
                    parentFolder.children.push(newFolder);
                }
            } else {
                fileSystem.push(newFolder);
            }

            logToTerminal(`Created folder in memory: ${foldername}`, 'info');
            selectedFolderId = newFolder.id;
            renderTree();
        });
    }

    if (fileUploadInput) {
        fileUploadInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            logToTerminal(`Reading uploaded local asset: ${file.name}...`, 'info');

            const reader = new FileReader();
            const mediaCheck = assessMediaFormat(file.name);

            reader.onload = function(evt) {
                let content = '';
                let mediaUrl = '';
                
                if (mediaCheck.isMedia) {
                    mediaUrl = evt.target.result;
                } else {
                    content = evt.target.result;
                }

                const uploadedFile = {
                    id: 'gen_' + Date.now(),
                    name: file.name,
                    type: 'file',
                    content: content,
                    isMedia: mediaCheck.isMedia,
                    format: mediaCheck.format,
                    url: mediaUrl
                };

                if (selectedFolderId) {
                    const parentFolder = findNodeById(fileSystem, selectedFolderId);
                    if (parentFolder && parentFolder.type === 'folder') {
                        if (!parentFolder.children) parentFolder.children = [];
                        parentFolder.children.push(uploadedFile);
                        parentFolder.isOpen = true;
                    }
                } else {
                    fileSystem.push(uploadedFile);
                }

                logToTerminal(`Imported local file: ${file.name}`, 'success');
                renderTree();
                openFile(uploadedFile);
            };

            if (mediaCheck.isMedia) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        });
    }

    // -----------------------------------------------------------------
    // 9. Render-GitHub Synchronization Integration Actions
    // -----------------------------------------------------------------
    if (syncPullBtn) {
        syncPullBtn.addEventListener('click', async function () {
            const confirmPull = confirm("Are you sure you want to sync? This will remove all local files in the workspace and load files directly from GitHub.");
            if (!confirmPull) return;

            logToTerminal("Initiating repository synchronization pull from remote source...", "system");
            showLoader("Syncing from GitHub repo...");
            
            try {
                const response = await fetch(`${RENDER_BACKEND_URL}/api/sync`);
                if (!response.ok) {
                    throw new Error(`Server returned error status: ${response.status}`);
                }
                const newFileSystem = await response.json();
                
                if (Array.isArray(newFileSystem) && newFileSystem.length > 0) {
                    fileSystem = newFileSystem;
                    renderTree();
                    
                    logToTerminal("Sync pull complete! Directory structure successfully retrieved.", "success");

                    // Automatically open the first available file
                    const firstFile = findFirstFile(fileSystem);
                    if (firstFile) {
                        openFile(firstFile);
                    }
                } else {
                    logToTerminal("Repository loaded, but no directory files were found.", "warning");
                    alert("Repository loaded, but it appears to be empty.");
                }
            } catch (err) {
                console.error(err);
                logToTerminal(`Sync failed: ${err.message}`, "error");
                alert(`Sync failed: ${err.message}. Check your terminal logs for details.`);
            } finally {
                hideLoader();
            }
        });
    }

    if (syncPushBtn) {
        syncPushBtn.addEventListener('click', async function () {
            const confirmPush = confirm("Would you like to send changes and sync? This commits your current directory files back to your GitHub main branch.");
            if (!confirmPush) return;

            logToTerminal("Initiating backup sync transaction to GitHub branch 'main'...", "system");
            showLoader("Pushing code revisions to GitHub...");
            
            try {
                const response = await fetch(`${RENDER_BACKEND_URL}/api/send-sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(fileSystem)
                });

                if (!response.ok) {
                    const errorDetail = await response.json();
                    throw new Error(errorDetail.error || `Server status: ${response.status}`);
                }

                const result = await response.json();
                if (result.success) {
                    const commitShaAbbr = result.sha.substring(0, 7);
                    logToTerminal(`Commit successful! Branch HEAD updated. Revision SHA: ${commitShaAbbr}`, "success");
                    alert(`Successfully committed changes to GitHub! Revision SHA: ${commitShaAbbr}`);
                }
            } catch (err) {
                console.error(err);
                logToTerminal(`Send & Sync failed: ${err.message}`, "error");
                alert(`Send & Sync failed: ${err.message}. Check your terminal logs for details.`);
            } finally {
                hideLoader();
            }
        });
    }

    // -----------------------------------------------------------------
    // 10. ACTIVE DOCUMENT SEARCH MECHANISM [2]
    // -----------------------------------------------------------------

    // Visualizes matches by highlighting the whole line on the background layout layer [2]
    function performSearch(query) {
        const linesLayer = document.getElementById('editor-highlight-lines-layer');
        if (!linesLayer) return;

        // Clear previous query state
        linesLayer.innerHTML = '';
        const lineDivs = lineNumbersContainer ? lineNumbersContainer.querySelectorAll('div') : [];
        lineDivs.forEach(div => {
            div.className = ''; // Reset margin panel colors
        });

        if (!query || !editorTextarea || !currentSelectedFile) {
            if (searchCountEl) searchCountEl.innerText = '0 found';
            return;
        }

        // Split text raw lines directly to search symbols, tags, spaces safely [2]
        const textValue = editorTextarea.value;
        const lines = textValue.split('\n');
        let matchesCount = 0;
        let htmlLinesContent = '';

        lines.forEach((lineText, index) => {
            const isMatch = lineText.toLowerCase().includes(query.toLowerCase());
            if (isMatch) {
                matchesCount++;
                htmlLinesContent += '<div class="matching-line-bar"></div>';
                
                // Add highlight styles directly to matching line number block
                if (lineDivs[index]) {
                    lineDivs[index].className = 'bg-yellow-500/20 text-yellow-400 font-bold';
                }
            } else {
                htmlLinesContent += '<div class="empty-line-bar"></div>';
            }
        });

        // Set matching layouts [2]
        linesLayer.innerHTML = htmlLinesContent;
        if (searchCountEl) {
            searchCountEl.innerText = `${matchesCount} found`;
        }
    }

    // Listeners for active search controls
    if (searchToggleBtn && searchBar) {
        searchToggleBtn.addEventListener('click', function () {
            searchBar.classList.toggle('hidden');
            searchBar.classList.toggle('flex');
            if (!searchBar.classList.contains('hidden') && searchInput) {
                searchInput.focus();
                if (searchInput.value !== '') {
                    performSearch(searchInput.value);
                }
            } else {
                // Clear highlights when search pane closes
                performSearch('');
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            performSearch(this.value);
        });
    }

    // -----------------------------------------------------------------
    // 11. Initial Page Load Workspace Hydration
    // -----------------------------------------------------------------
    if (explorerTree) {
        renderTree();
    }
    if (currentSelectedFile) {
        openFile(currentSelectedFile);
    }

    // Expose file tree getter API for contextual AI binding
    window.getWorkspaceFileSystem = function () {
        return fileSystem;
    };
});
