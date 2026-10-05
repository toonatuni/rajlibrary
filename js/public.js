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

        const adminDashboardButton =
            document.getElementById(
                "adminDashboardButton"
            );

        let authRenderVersion = 0;


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
            const quickSeats = document.getElementById("quickAvailableSeats");
            const quickSeatsCaption = document.getElementById("quickAvailableSeatsCaption");
            const quickRooms = document.getElementById("quickAvailableRooms");
            const quickRoomsCaption = document.getElementById("quickAvailableRoomsCaption");
            const seatsTotal = document.getElementById("availableSeatsTotal");
            const seatsPreview = document.getElementById("availableSeatsPreview");
            const roomsTotal = document.getElementById("availableRoomsTotal");
            const roomsPreview = document.getElementById("availableRoomsPreview");
            const settingElements = [
                ["homeContactNumber", "Phone"],
                ["homeLibraryHours", "Opening hours"],
                ["homeLibraryStatus", "Library status"],
                ["homeLibraryAddress", "Address"]
            ];

            if (
                !quickSeats &&
                !quickRooms &&
                !seatsTotal &&
                !seatsPreview &&
                !roomsTotal &&
                !roomsPreview &&
                !settingElements.some(([id]) => document.getElementById(id))
            ) {
                return;
            }

            const showUnavailable = message => {
                if (quickSeats) {
                    quickSeats.textContent = "—";
                }
                if (quickSeatsCaption) {
                    quickSeatsCaption.textContent = message;
                }
                if (quickRooms) {
                    quickRooms.textContent = "—";
                }
                if (quickRoomsCaption) {
                    quickRoomsCaption.textContent = message;
                }
                if (seatsTotal) {
                    seatsTotal.textContent = "—";
                }
                if (roomsTotal) {
                    roomsTotal.textContent = "—";
                }
                if (seatsPreview) {
                    seatsPreview.textContent = message;
                }
                if (roomsPreview) {
                    roomsPreview.textContent = message;
                }
                settingElements.forEach(([id, label]) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = `${label}: ${message}`;
                    }
                });
            };

            if (typeof supabaseClient === "undefined") {
                showUnavailable("Availability and settings are temporarily unavailable.");
                return;
            }

            try {
                const [
                    totalSeatsResult,
                    availableSeatsResult,
                    totalRoomsResult,
                    availableRoomsResult,
                    availableSeats,
                    availableRoomsResultRows,
                    allRoomRents,
                    librarySettingsResult,
                    libraryPricesResult
                ] = await Promise.all([
                    supabaseClient
                        .from("library_seats")
                        .select("id", { count: "exact", head: true }),
                    supabaseClient
                        .from("library_seats")
                        .select("id", { count: "exact", head: true })
                        .eq("status", "available"),
                    supabaseClient
                        .from("rooms")
                        .select("id", { count: "exact", head: true }),
                    supabaseClient
                        .from("rooms")
                        .select("id", { count: "exact", head: true })
                        .eq("status", "available"),
                    (async () => {
                        const pageSize = 1000;
                        const seats = [];
                        for (let offset = 0; ; offset += pageSize) {
                            const { data, error } = await supabaseClient
                                .from("library_seats")
                                .select("id, status, shift_id")
                                .eq("status", "available")
                                .order("id", { ascending: true })
                                .range(offset, offset + pageSize - 1);
                            if (error) {
                                throw error;
                            }
                            seats.push(...(data || []));
                            if (!data || data.length < pageSize) {
                                break;
                            }
                        }
                        return seats;
                    })(),
                    supabaseClient
                        .from("rooms")
                        .select("id, room_number, room_type, capacity, monthly_rent, status")
                        .eq("status", "available")
                        .order("room_number", { ascending: true })
                        .limit(3),
                    (async () => {
                        const pageSize = 1000;
                        const rents = [];
                        for (let offset = 0; ; offset += pageSize) {
                            const { data, error } = await supabaseClient
                                .from("rooms")
                                .select("id, monthly_rent")
                                .order("id", { ascending: true })
                                .range(offset, offset + pageSize - 1);
                            if (error) {
                                throw error;
                            }
                            rents.push(...(data || []));
                            if (!data || data.length < pageSize) {
                                break;
                            }
                        }
                        return rents;
                    })(),
                    supabaseClient
                        .from("app_settings")
                        .select("value")
                        .eq("key", "library_settings")
                        .maybeSingle(),
                    supabaseClient
                        .from("app_settings")
                        .select("value")
                        .eq("key", "library_prices")
                        .maybeSingle()
                ]);

                const failedResult = [
                    totalSeatsResult,
                    availableSeatsResult,
                    totalRoomsResult,
                    availableRoomsResult,
                    availableRoomsResultRows,
                    librarySettingsResult,
                    libraryPricesResult
                ].find(result => result.error);
                if (failedResult) {
                    throw failedResult.error;
                }

                const rowCounts = [
                    totalSeatsResult.count,
                    availableSeatsResult.count,
                    totalRoomsResult.count,
                    availableRoomsResult.count
                ];
                if (rowCounts.some(count => !Number.isInteger(count) || count < 0)) {
                    throw new Error("Supabase did not return exact availability counts.");
                }

                const totalSeatCount = totalSeatsResult.count;
                const availableSeatCount = Math.min(totalSeatCount, Math.max(0, availableSeatsResult.count));
                const totalRoomCount = totalRoomsResult.count;
                const availableRoomCount = Math.min(totalRoomCount, Math.max(0, availableRoomsResult.count));
                const availableRooms = availableRoomsResultRows.data || [];
                const librarySettings = librarySettingsResult.data?.value || {};
                const libraryPrices = libraryPricesResult.data?.value || {};
                const roomRents = allRoomRents
                    .filter(room => room.monthly_rent !== null && room.monthly_rent !== undefined)
                    .map(room => Number(room.monthly_rent))
                    .filter(rent => Number.isFinite(rent) && rent >= 0);
                const formatRent = rent => `₹${rent.toLocaleString("en-IN")}`;

                if (seatsTotal) {
                    seatsTotal.textContent = String(availableSeatCount);
                }
                if (quickSeats) {
                    quickSeats.textContent = `${availableSeatCount} / ${totalSeatCount}`;
                }
                if (quickSeatsCaption) {
                    const shiftRents = ["shift1", "shift2", "shift3", "shift4"]
                        .map(shift => Number(libraryPrices[shift]))
                        .filter(rent => Number.isFinite(rent) && rent >= 0);
                    const rentCaption = shiftRents.length
                        ? ` · Shift rent ${shiftRents.map(formatRent).join(" / ")}`
                        : "";
                    quickSeatsCaption.textContent = `Available / total seats${rentCaption}`;
                }
                if (roomsTotal) {
                    roomsTotal.textContent = String(availableRoomCount);
                }
                if (quickRooms) {
                    quickRooms.textContent = `${availableRoomCount} / ${totalRoomCount}`;
                }
                if (quickRoomsCaption) {
                    const rentCaption = roomRents.length
                        ? ` · Monthly rent ${formatRent(Math.min(...roomRents))}–${formatRent(Math.max(...roomRents))}`
                        : "";
                    quickRoomsCaption.textContent = `Available / total rooms${rentCaption}`;
                }

                const homeContactNumber = document.getElementById("homeContactNumber");
                const homeLibraryHours = document.getElementById("homeLibraryHours");
                const homeLibraryStatus = document.getElementById("homeLibraryStatus");
                const homeLibraryAddress = document.getElementById("homeLibraryAddress");
                if (homeContactNumber) {
                    homeContactNumber.textContent = `Phone: ${librarySettings.contact_number || "Not set"}`;
                }
                if (homeLibraryHours) {
                    homeLibraryHours.textContent =
                        librarySettings.opening_time && librarySettings.closing_time
                            ? `Opening hours: ${librarySettings.opening_time}–${librarySettings.closing_time}`
                            : "Opening hours: Not set";
                }
                if (homeLibraryStatus) {
                    const status = librarySettings.library_open === true
                        ? "Open"
                        : librarySettings.library_open === false
                            ? "Closed"
                            : "Not configured";
                    const bookingStatus = librarySettings.booking_enabled === false
                        ? "Disabled"
                        : "Enabled";
                    homeLibraryStatus.textContent =
                        `Library status: ${status} · Bookings: ${bookingStatus}`;
                }
                if (homeLibraryAddress) {
                    homeLibraryAddress.textContent =
                        `Address: ${librarySettings.address || "Not set"}`;
                }

                renderAvailableSeats(availableSeats, seatsPreview);
                renderAvailableRooms(availableRooms, roomsPreview);
            } catch (error) {
                console.error("Public availability load error:", error);
                showUnavailable("Availability and settings are temporarily unavailable.");
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

            if (adminDashboardButton) {
                adminDashboardButton.classList.add("hidden");
            }


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

            authRenderVersion++;

            if (authButton) {

                authButton.classList.remove(
                    "hidden"
                );

            }

            if (adminDashboardButton) {
                adminDashboardButton.classList.add("hidden");
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

        async function updateAuthenticatedInterface(user) {
            const requestVersion = ++authRenderVersion;
            const { data, error } = await supabaseClient
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();

            if (error) {
                throw error;
            }

            if (requestVersion !== authRenderVersion) {
                return;
            }

            if (String(data?.role || "user").toLowerCase() === "admin") {
                authButton?.classList.add("hidden");
                userProfile?.classList.add("hidden");
                sidebarUser?.classList.add("hidden");
                adminDashboardButton?.classList.remove("hidden");
                return;
            }

            updateUserInterface(user);
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

                    await updateAuthenticatedInterface(data.user);


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

                localStorage.removeItem(
                    "isLoggedIn"
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

                    window.setTimeout(() => {
                        updateAuthenticatedInterface(session.user)
                            .catch(error => {
                                console.error("User role check failed:", error);
                                showLoggedOutInterface();
                            });
                    }, 0);


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