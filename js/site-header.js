(() => {
    const icons = {
        home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        library: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h7"/>',
        rooms: '<path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3"/>',
        about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
        contact: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.8L7.7 9.6a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 1.8-.6l2.8.5a2 2 0 0 1 1.7 2.7Z"/>',
        location: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
        dashboard: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
        bookings: '<path d="M8 3v4M16 3v4M4 9h16"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="m9 15 2 2 4-4"/>',
        reports: '<path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-6"/><path d="M15 7h4v4"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8Z"/>',
        profile: '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
        logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>'
    };

    const icon = name => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "1.7");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("aria-hidden", "true");
        svg.innerHTML = icons[name] || icons.home;
        svg.classList.add("sidebar-nav-icon");
        return svg;
    };

    const addIconAndLabel = (element, name) => {
        const label = document.createElement("span");
        label.textContent = element.textContent.trim();
        element.replaceChildren(icon(name), label);
    };

    const standardizeSidebar = sidebar => {
        const header = sidebar.querySelector(".side-menu-header");
        if (header) {
            header.innerHTML = `
                <a class="sidebar-brand" href="index.html">
                    <span class="sidebar-brand-logo" aria-hidden="true">RL</span>
                    <span class="sidebar-brand-text">
                        <strong>Raj Library</strong>
                        <small>Library &amp; Room Management</small>
                    </span>
                </a>
                <button class="menu-close" id="closeMenu" type="button" aria-label="Close navigation">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
                </button>
            `;
        }

        sidebar.querySelectorAll(".side-nav a").forEach(link => {
            const href = link.getAttribute("href") || "";
            const text = link.textContent.trim().toLowerCase();
            const name = text === "home" ? "home"
                : text === "library" ? "library"
                    : text === "rooms" ? "rooms"
                        : text === "about" ? "about"
                            : text === "contact" ? "contact"
                                : text === "location" ? "location"
                                    : href.includes("#about") ? "about"
                                        : href.includes("#contact") ? "contact"
                                            : href.includes("#location") ? "location" : "home";
            addIconAndLabel(link, name);
        });
    };

    const sidebarMarkup = `
        <div class="menu-overlay" id="menuOverlay"></div>
        <aside class="side-menu" id="sideMenu">
            <div class="side-menu-header">
                <div></div>
            </div>
            <nav class="side-nav" aria-label="Main navigation">
                <a href="index.html">Home</a>
                <a href="library.html">Library</a>
                <a href="rooms.html">Rooms</a>
                <a href="index.html#about">About</a>
                <a href="index.html#contact">Contact</a>
                <a href="index.html#location">Location</a>
            </nav>
            <div class="theme-section">
                <span>Dark Theme</span>
                <label class="theme-switch">
                    <input type="checkbox" id="themeToggle">
                    <span class="theme-slider"></span>
                </label>
            </div>
        </aside>
    `;

    const headerMarkup = `
        <header class="main-navbar site-header">
            <div class="navbar-left">
                <button class="hamburger" id="menuButton" type="button" aria-label="Open navigation">
                    <span></span><span></span><span></span>
                </button>
                <a href="index.html" class="brand">
                    <div class="brand-logo">RL</div>
                    <div class="brand-text">
                        <h1>Raj Library</h1>
                        <p>Study • Focus • Grow</p>
                    </div>
                </a>
            </div>
            <div class="navbar-auth">
                <a href="user-login.html" class="signin-btn" id="authButton">Sign In</a>
                <div class="user-profile hidden" id="userProfile">
                    <button type="button" class="profile-button" id="profileButton" aria-label="Open profile menu">
                        <span id="userInitials">U</span>
                    </button>
                    <div class="profile-dropdown" id="profileDropdown">
                        <div class="profile-user-info">
                            <div class="profile-avatar-large" id="dropdownInitials">U</div>
                            <div><strong id="profileUserName">User</strong><p id="profileUserEmail">user@example.com</p></div>
                        </div>
                        <div class="profile-divider"></div>
                        <a href="user-dashboard.html">My Dashboard</a>
                        <a href="profile.html">My Profile</a>
                        <a href="my-library-bookings.html">My Library Bookings</a>
                        <a href="my-room-bookings.html">My Room Bookings</a>
                        <a href="settings.html">Account Settings</a>
                        <button type="button" class="profile-logout" id="profileLogoutButton">Logout</button>
                    </div>
                </div>
            </div>
        </header>
    `;

    const body = document.body;
    const oldHeader = body.querySelector(
        ".auth-navbar, .booking-navbar, .library-booking-navbar"
    );
    let header = body.querySelector("header.site-header");

    if (!header) {
        const template = document.createElement("template");
        template.innerHTML = headerMarkup.trim();
        header = template.content.firstElementChild;

        if (oldHeader) {
            oldHeader.replaceWith(header);
        } else {
            body.prepend(header);
        }
    }

    if (!body.querySelector(".site-header-spacer")) {
        const spacer = document.createElement("div");
        spacer.className = "site-header-spacer";
        spacer.setAttribute("aria-hidden", "true");
        header.after(spacer);
    }

    if (header.querySelector("#menuButton") && !body.querySelector("#sideMenu")) {
        const template = document.createElement("template");
        template.innerHTML = sidebarMarkup.trim();
        body.prepend(template.content);
    }

    const sideMenu = body.querySelector("#sideMenu");
    if (sideMenu && !sideMenu.dataset.standardized) {
        standardizeSidebar(sideMenu);
        sideMenu.dataset.standardized = "true";
    }

    const adminSidebar = body.querySelector("#adminSidebar");
    if (adminSidebar) {
        adminSidebar.querySelectorAll(".admin-nav-item").forEach(button => {
            const name = button.dataset.section || "dashboard";
            const iconName = name === "libraryBookings"
                ? "library"
                : name === "roomBookings"
                    ? "rooms"
                    : name;
            addIconAndLabel(button, iconName);
        });
        const logout = adminSidebar.querySelector("#adminLogoutBtn");
        if (logout) addIconAndLabel(logout, "logout");
    }

    const menuButton = body.querySelector("#menuButton");
    const menuOverlay = body.querySelector("#menuOverlay");
    const closeMenu = body.querySelector("#closeMenu");

    if (menuButton && sideMenu && menuOverlay) {
        const openMenu = () => {
            sideMenu.classList.add("open");
            menuOverlay.classList.add("active");
            menuButton.setAttribute("aria-expanded", "true");
        };
        const closeSidebar = () => {
            sideMenu.classList.remove("open");
            menuOverlay.classList.remove("active");
            menuButton.setAttribute("aria-expanded", "false");
        };

        menuButton.addEventListener("click", openMenu);
        closeMenu?.addEventListener("click", closeSidebar);
        menuOverlay.addEventListener("click", closeSidebar);
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeSidebar();
        });
    }
})();
