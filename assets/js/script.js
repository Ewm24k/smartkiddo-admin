document.addEventListener("DOMContentLoaded", function () {
    // Collect all navigatable options and map them to their views
    const menuMapping = {
        'btn-t1era-studio': { viewId: 'view-t1era-studio', breadcrumb: 'T1ERA Studio' },
        'btn-list-user': { viewId: 'view-list-user', breadcrumb: 'List User' },
        'btn-statistic': { viewId: 'view-statistic', breadcrumb: 'Statistic' },
        'btn-websources-code': { viewId: 'view-websources-code', breadcrumb: 'websources code' }
    };

    // Initialize click listeners
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
     * Controls view rendering swapping and selection states
     */
    function switchTab(clickedId) {
        // Toggle active views visibility
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
        const breadcrumbTitle = document.getElementById('breadcrumb-title');
        if (breadcrumbTitle) {
            breadcrumbTitle.innerText = menuMapping[clickedId].breadcrumb;
        }

        // Apply active vs. inactive styling states for navigation links
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
