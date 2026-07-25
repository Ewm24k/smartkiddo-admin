document.addEventListener("DOMContentLoaded", function () {
    // -----------------------------------------------------------------
    // 1. Sidebar Collapse Control (Slide & Icon Toggle)
    // -----------------------------------------------------------------
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
    const bodyElement = document.body;

    // SVG graphics representing collapse/expand icon states
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

    if (sidebarToggle && sidebarToggleIcon) {
        sidebarToggle.addEventListener('click', function () {
            // Toggles '.sidebar-collapsed' class on parent body wrapper
            bodyElement.classList.toggle('sidebar-collapsed');

            // Swap icon dynamically to match state
            if (bodyElement.classList.contains('sidebar-collapsed')) {
                sidebarToggleIcon.innerHTML = hamburgerIcon;
            } else {
                sidebarToggleIcon.innerHTML = arrowLeftIcon;
            }
        });
    }

    // -----------------------------------------------------------------
    // 2. View Tab Switching Controls
    // -----------------------------------------------------------------
    const menuMapping = {
        'btn-t1era-studio': { viewId: 'view-t1era-studio', breadcrumb: 'T1ERA Studio' },
        'btn-list-user': { viewId: 'view-list-user', breadcrumb: 'List User' },
        'btn-statistic': { viewId: 'view-statistic', breadcrumb: 'Statistic' },
        'btn-websources-code': { viewId: 'view-websources-code', breadcrumb: 'websources code' }
    };

    // Attach click events to nav nodes
    Object.keys(menuMapping).forEach(btnId => {
        const button = document.getElementById(btnId);
        if (button) {
            button.addEventListener('click', function (e) {
                e.preventDefault();
                switchTab(btnId);
            });
        }
    });

    /**
     * Swaps rendering targets and updates navigation link highlights
     */
    function switchTab(clickedId) {
        // Toggle view container display rules
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

        // Update navigation breadcrumb header
        const breadcrumbTitle = document.getElementById('breadcrumb-title');
        if (breadcrumbTitle) {
            breadcrumbTitle.innerText = menuMapping[clickedId].breadcrumb;
        }

        // Apply active vs. inactive styling choices for links
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
});
