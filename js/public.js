// ==========================================
// RAJ LIBRARY
// PUBLIC JAVASCRIPT
// NAVBAR + SIDEBAR + DARK THEME
// USER PROFILE + SUPABASE AUTH
// ==========================================


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        document.querySelectorAll("[data-social-platform][data-account]").forEach(link => {
            const platform = link.dataset.socialPlatform;
            const account = link.dataset.account.trim();

            if (!account) {
                return;
            }

            let destination;

            if (/^(https?:\/\/|www\.|(?:youtube\.com|youtu\.be|wa\.me|whatsapp\.com|facebook\.com|instagram\.com)\/)/i.test(account)) {
                const normalizedAccount = /^www\./i.test(account)
                    || /^(youtube\.com|youtu\.be|wa\.me|whatsapp\.com|facebook\.com|instagram\.com)\//i.test(account)
                    ? `https://${account}`
                    : account.replace(/^http:\/\//i, "https://");

                try {
                    const accountUrl = new URL(normalizedAccount);
                    if (accountUrl.protocol === "https:") {
                        destination = accountUrl.href;
                    }
                } catch (error) {
                    console.warn("Ignoring invalid social profile link.", error);
                }
            } else {
                const value = account.replace(/^@/, "");

                switch (platform) {
                    case "youtube":
                        destination = value.startsWith("UC")
                            ? `https://www.youtube.com/channel/${encodeURIComponent(value)}`
                            : `https://www.youtube.com/@${encodeURIComponent(value)}`;
                        break;
                    case "whatsapp": {
                        const phoneNumber = account.replace(/\D/g, "");
                        if (phoneNumber.length >= 7) {
                            destination = `https://wa.me/${phoneNumber}`;
                        }
                        break;
                    }
                    case "facebook":
                        destination = `https://www.facebook.com/${encodeURIComponent(value)}`;
                        break;
                    case "instagram":
                        destination = `https://www.instagram.com/${encodeURIComponent(value)}/`;
                        break;
                }
            }

            if (!destination) {
                return;
            }

            link.href = destination;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.removeAttribute("aria-disabled");
        });


        // ==========================================
        // GET ELEMENTS
        // ==========================================

        const menuButton =
            document.getElementById(
                "menuButton"
            );


        const sideMenu =
            document.getElementById(
                "sideMenu"
            );


        const closeMenu =
            document.getElementById(
                "closeMenu"
            );


        const menuOverlay =
            document.getElementById(
                "menuOverlay"
            );


        const themeToggle =
            document.getElementById(
                "themeToggle"
            );


        const logoutButton =
            document.getElementById(
                "logoutButton"
            );


        const authButton =
            document.getElementById(
                "authButton"
            );


        const userProfile =
            document.getElementById(
                "userProfile"
            );


        const profileButton =
            document.getElementById(
                "profileButton"
            );


        const profileDropdown =
            document.getElementById(
                "profileDropdown"
            );


        const profileLogoutButton =
            document.getElementById(
                "profileLogoutButton"
            );


        const userInitials =
            document.getElementById(
                "userInitials"
            );


        const dropdownInitials =
            document.getElementById(
                "dropdownInitials"
            );


        const sidebarInitials =
            document.getElementById(
                "sidebarInitials"
            );


        const profileUserName =
            document.getElementById(
                "profileUserName"
            );


        const profileUserEmail =
            document.getElementById(
                "profileUserEmail"
            );


        const sidebarUserName =
            document.getElementById(
                "sidebarUserName"
            );


        const sidebarUserEmail =
            document.getElementById(
                "sidebarUserEmail"
            );


        const sidebarUser =
            document.getElementById(
                "sidebarUser"
            );


        // ==========================================
        // LIVE AVAILABILITY
        // ==========================================

        async function loadAvailability() {

            const quickSeats =
                document.getElementById(
                    "quickAvailableSeats"
                );

            const quickRooms =
                document.getElementById(
                    "quickAvailableRooms"
                );

            const seatsTotal =
                document.getElementById(
                    "availableSeatsTotal"
                );

            const seatsPreview =
                document.getElementById(
                    "availableSeatsPreview"
                );

            const roomsTotal =
                document.getElementById(
                    "availableRoomsTotal"
                );

            const roomsPreview =
                document.getElementById(
                    "availableRoomsPreview"
                );

            if (
                !seatsTotal &&
                !seatsPreview &&
                !roomsTotal &&
                !roomsPreview
            ) {
                return;
            }

            if (
                typeof supabaseClient ===
                "undefined"
            ) {
                const message =
                    "Availability is temporarily unavailable.";

                if (seatsPreview) {
                    seatsPreview.textContent = message;
                }

                if (roomsPreview) {
                    roomsPreview.textContent = message;
                }

                return;
            }

            try {
                const [
                    seatsResult,
                    roomsResult
                ] = await Promise.all([
                    supabaseClient
                        .from("library_seats")
                        .select("id, status, shift_id")
                        .eq("status", "available"),
                    supabaseClient
                        .from("rooms")
                        .select("id, room_number, room_type, capacity, status")
                        .eq("status", "available")
                        .order("room_number", {
                            ascending: true
                        })
                ]);

                if (seatsResult.error) {
                    throw seatsResult.error;
                }

                if (roomsResult.error) {
                    throw roomsResult.error;
                }

                const availableSeats =
                    seatsResult.data || [];

                const availableRooms =
                    roomsResult.data || [];

                if (seatsTotal) {
                    seatsTotal.textContent =
                        String(availableSeats.length);
                }

                if (quickSeats) {
                    quickSeats.textContent =
                        String(availableSeats.length);
                }

                if (roomsTotal) {
                    roomsTotal.textContent =
                        String(availableRooms.length);
                }

                if (quickRooms) {
                    quickRooms.textContent =
                        String(availableRooms.length);
                }

                renderAvailableSeats(
                    availableSeats,
                    seatsPreview
                );

                renderAvailableRooms(
                    availableRooms,
                    roomsPreview
                );
            } catch (error) {
                console.error(
                    "Public availability load error:",
                    error
                );

                if (seatsTotal) {
                    seatsTotal.textContent = "—";
                }

                if (quickSeats) {
                    quickSeats.textContent = "—";
                }

                if (roomsTotal) {
                    roomsTotal.textContent = "—";
                }

                if (quickRooms) {
                    quickRooms.textContent = "—";
                }

                if (seatsPreview) {
                    seatsPreview.textContent =
                        "Availability is temporarily unavailable.";
                }

                if (roomsPreview) {
                    roomsPreview.textContent =
                        "Availability is temporarily unavailable.";
                }
            }
        }


        function renderAvailableSeats(
            seats,
            container
        ) {
            if (!container) {
                return;
            }

            if (!seats.length) {
                container.textContent =
                    "No library seats are available right now.";
                return;
            }

            const shiftCounts = {};

            seats.forEach(seat => {
                const shiftId =
                    seat.shift_id || "Other";

                shiftCounts[shiftId] =
                    (shiftCounts[shiftId] || 0) + 1;
            });

            const shiftNames = {
                shift1: "Morning Shift",
                shift2: "Day Shift",
                shift3: "Afternoon Shift",
                shift4: "Evening Shift"
            };

            container.innerHTML =
                Object.entries(shiftCounts)
                    .map(([shiftId, count]) => `
                        <div class="availability-row">
                            <span>${escapeHTML(shiftNames[shiftId] || shiftId)}</span>
                            <strong>${count} available</strong>
                        </div>
                    `)
                    .join("");
        }


        function renderAvailableRooms(
            rooms,
            container
        ) {
            if (!container) {
                return;
            }

            if (!rooms.length) {
                container.textContent =
                    "No rooms are available right now.";
                return;
            }

            container.innerHTML =
                rooms
                    .slice(0, 3)
                    .map(room => {
                        const roomName =
                            room.room_number ||
                            room.room_type ||
                            room.id;

                        const details = [
                            room.room_type,
                            room.capacity
                                ? `Capacity ${room.capacity}`
                                : ""
                        ].filter(Boolean);

                        return `
                            <div class="availability-row">
                                <span>${escapeHTML(String(roomName))}</span>
                                <strong>${escapeHTML(details.join(" · ") || "Available")}</strong>
                            </div>
                        `;
                    })
                    .join("");
        }


        function escapeHTML(value) {
            return value
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }



        // ==========================================
        // OPEN SIDEBAR
        // ==========================================

        if (
            menuButton &&
            sideMenu &&
            menuOverlay
        ) {

            menuButton.addEventListener(
                "click",
                () => {


                    sideMenu.classList.add(
                        "open"
                    );


                    menuOverlay.classList.add(
                        "active"
                    );


                    document.body.style.overflow =
                        "hidden";


                }
            );

        }



        // ==========================================
        // CLOSE SIDEBAR
        // ==========================================

        function closeSidebar() {


            if (sideMenu) {

                sideMenu.classList.remove(
                    "open"
                );

            }


            if (menuOverlay) {

                menuOverlay.classList.remove(
                    "active"
                );

            }


            document.body.style.overflow =
                "";


        }



        // ==========================================
        // CLOSE BUTTON
        // ==========================================

        if (closeMenu) {

            closeMenu.addEventListener(
                "click",
                closeSidebar
            );

        }



        // ==========================================
        // OVERLAY CLOSE
        // ==========================================

        if (menuOverlay) {

            menuOverlay.addEventListener(
                "click",
                closeSidebar
            );

        }



        // ==========================================
        // SIDEBAR LINKS CLOSE MENU
        // ==========================================

        const sideLinks =
            document.querySelectorAll(
                ".side-nav a"
            );


        sideLinks.forEach(
            (link) => {


                link.addEventListener(
                    "click",
                    () => {

                        closeSidebar();

                    }
                );


            }
        );



        // ==========================================
        // DARK THEME
        // ==========================================

        if (themeToggle) {


            const savedTheme =
                localStorage.getItem(
                    "rajLibraryTheme"
                );


            if (
                savedTheme === "dark"
            ) {


                document.body.classList.add(
                    "dark-theme"
                );


                themeToggle.checked =
                    true;


            }



            themeToggle.addEventListener(
                "change",
                () => {


                    if (
                        themeToggle.checked
                    ) {


                        document.body.classList.add(
                            "dark-theme"
                        );


                        localStorage.setItem(
                            "rajLibraryTheme",
                            "dark"
                        );


                    }

                    else {


                        document.body.classList.remove(
                            "dark-theme"
                        );


                        localStorage.setItem(
                            "rajLibraryTheme",
                            "light"
                        );


                    }


                }
            );


        }



        // ==========================================
        // GET USER INITIALS
        // ==========================================

        function getInitials(
            name,
            email
        ) {


            if (
                name &&
                name.trim() !== ""
            ) {


                const words =
                    name
                        .trim()
                        .split(
                            " "
                        );


                if (
                    words.length === 1
                ) {

                    return words[0]
                        .charAt(0)
                        .toUpperCase();

                }


                return (
                    words[0]
                        .charAt(0) +

                    words[
                        words.length - 1
                    ]
                        .charAt(0)
                )
                    .toUpperCase();


            }



            if (email) {


                return email
                    .charAt(0)
                    .toUpperCase();


            }


            return "U";


        }



        // ==========================================
        // GET USER NAME
        // ==========================================

        function getUserName(
            user
        ) {


            if (
                user.user_metadata &&
                user.user_metadata.full_name
            ) {


                return user.user_metadata
                    .full_name;


            }



            if (
                user.user_metadata &&
                user.user_metadata.name
            ) {


                return user.user_metadata
                    .name;


            }



            if (
                user.user_metadata &&
                user.user_metadata.user_name
            ) {


                return user.user_metadata
                    .user_name;


            }



            if (
                user.email
            ) {


                return user.email
                    .split("@")[0];


            }


            return "User";


        }



        // ==========================================
        // UPDATE USER INTERFACE
        // ==========================================

        function updateUserInterface(
            user
        ) {


            const userName =
                getUserName(
                    user
                );


            const email =
                user.email ||
                "";


            const initials =
                getInitials(
                    userName,
                    email
                );



            // HIDE SIGN IN

            if (authButton) {

                authButton.classList.add(
                    "hidden"
                );

            }



            // SHOW PROFILE

            if (userProfile) {

                userProfile.classList.remove(
                    "hidden"
                );

            }



            // SHOW SIDEBAR USER

            if (sidebarUser) {

                sidebarUser.classList.remove(
                    "hidden"
                );

            }



            // NAVBAR INITIALS

            if (userInitials) {

                userInitials.textContent =
                    initials;

            }



            // DROPDOWN INITIALS

            if (dropdownInitials) {

                dropdownInitials.textContent =
                    initials;

            }



            // SIDEBAR INITIALS

            if (sidebarInitials) {

                sidebarInitials.textContent =
                    initials;

            }



            // DROPDOWN NAME

            if (profileUserName) {

                profileUserName.textContent =
                    userName;

            }



            // DROPDOWN EMAIL

            if (profileUserEmail) {

                profileUserEmail.textContent =
                    email;

            }



            // SIDEBAR NAME

            if (sidebarUserName) {

                sidebarUserName.textContent =
                    userName;

            }



            // SIDEBAR EMAIL

            if (sidebarUserEmail) {

                sidebarUserEmail.textContent =
                    email;

            }


        }



        // ==========================================
        // SHOW LOGGED OUT INTERFACE
        // ==========================================

        function showLoggedOutInterface() {


            if (authButton) {

                authButton.classList.remove(
                    "hidden"
                );

            }


            if (userProfile) {

                userProfile.classList.add(
                    "hidden"
                );

            }


            if (sidebarUser) {

                sidebarUser.classList.add(
                    "hidden"
                );

            }


        }



        // ==========================================
        // CHECK SUPABASE LOGIN
        // ==========================================

        async function checkUserLogin() {


            try {


                if (
                    typeof supabaseClient ===
                    "undefined"
                ) {


                    console.warn(
                        "Supabase client not found."
                    );


                    return;


                }



                const {

                    data,

                    error

                } =
                await supabaseClient
                    .auth
                    .getUser();



                if (error) {

                    const isMissingSessionError =
                        /AuthSessionMissingError|Auth session missing/i.test(
                            (error.name || "") + " " + (error.message || "")
                        );

                    if (!isMissingSessionError) {
                        console.error(
                            "Auth Error:",
                            error
                        );
                    }

                    showLoggedOutInterface();
                    return;
                }



                if (
                    data &&
                    data.user
                ) {


                    updateUserInterface(
                        data.user
                    );


                }

                else {


                    showLoggedOutInterface();


                }


            }

            catch (error) {


                console.error(
                    "User Check Error:",
                    error
                );


                showLoggedOutInterface();


            }


        }



        // ==========================================
        // PROFILE DROPDOWN
        // ==========================================

        if (
            profileButton &&
            profileDropdown
        ) {


            profileButton.addEventListener(
                "click",
                (event) => {


                    event.stopPropagation();


                    profileDropdown.classList.toggle(
                        "open"
                    );


                }
            );


        }



        // ==========================================
        // CLOSE PROFILE WHEN CLICK OUTSIDE
        // ==========================================

        document.addEventListener(
            "click",
            (event) => {


                if (
                    userProfile &&
                    profileDropdown &&
                    !userProfile.contains(
                        event.target
                    )
                ) {


                    profileDropdown.classList.remove(
                        "open"
                    );


                }


            }
        );



        // ==========================================
        // LOGOUT FUNCTION
        // ==========================================

        async function logoutUser() {


            const confirmLogout =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (
                !confirmLogout
            ) {

                return;

            }


            try {


                if (
                    typeof supabaseClient !==
                    "undefined"
                ) {


                    const {

                        error

                    } =
                    await supabaseClient
                        .auth
                        .signOut();


                    if (error) {

                        throw error;

                    }


                }



                // REMOVE LOCAL STORAGE

                localStorage.removeItem(
                    "user"
                );


                localStorage.removeItem(
                    "currentUser"
                );


                localStorage.removeItem(
                    "userSession"
                );


                // REDIRECT

                window.location.href =
                    "index.html";


            }

            catch (error) {


                console.error(
                    "Logout Error:",
                    error
                );


                alert(
                    error.message ||
                    "Logout failed."
                );


            }


        }



        // ==========================================
        // SIDEBAR LOGOUT
        // ==========================================

        if (logoutButton) {


            logoutButton.addEventListener(
                "click",
                logoutUser
            );


        }



        // ==========================================
        // PROFILE DROPDOWN LOGOUT
        // ==========================================

        if (profileLogoutButton) {


            profileLogoutButton.addEventListener(
                "click",
                logoutUser
            );


        }



        // ==========================================
        // AUTH STATE CHANGE
        // ==========================================

        if (
            typeof supabaseClient !==
            "undefined"
        ) {


            supabaseClient
                .auth
                .onAuthStateChange(
                    (
                        event,
                        session
                    ) => {


                        if (
                            session &&
                            session.user
                        ) {


                            updateUserInterface(
                                session.user
                            );


                        }

                        else {


                            showLoggedOutInterface();


                        }


                    }
                );


        }



        // ==========================================
        // INITIAL LOGIN CHECK
        // ==========================================

        await checkUserLogin();
        await loadAvailability();

        if (
            document.getElementById("quickAvailableSeats") ||
            document.getElementById("quickAvailableRooms")
        ) {
            window.setInterval(
                loadAvailability,
                30000
            );
        }


    }
);