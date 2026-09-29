// ==========================================
// RAJ LIBRARY
// USER DASHBOARD
// ==========================================


// ==========================================
// GLOBAL USER
// ==========================================

let currentUser = null;
let userRealtimeChannel = null;
let originalDocumentTitle = document.title;


// ==========================================
// GET USER NAME
// ==========================================

function getUserName(user) {


    if (
        user.user_metadata &&
        user.user_metadata.name
    ) {

        return user
            .user_metadata
            .name;

    }


    if (
        user.user_metadata &&
        user.user_metadata.full_name
    ) {

        return user
            .user_metadata
            .full_name;

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
// GET USER INITIALS
// ==========================================

function getUserInitials(name) {


    if (!name) {

        return "U";

    }


    const words =

        name
            .trim()
            .split(" ")
            .filter(Boolean);


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

    ).toUpperCase();

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value) {


    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    const div =

        document.createElement(
            "div"
        );


    div.textContent =
        String(value);


    return div.innerHTML;

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(dateValue) {


    if (!dateValue) {

        return "Not available";

    }


    const date =

        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateValue;

    }


    return date.toLocaleDateString(

        "en-IN",

        {

            day:
                "2-digit",

            month:
                "long",

            year:
                "numeric"

        }

    );

}


// ==========================================
// SET USER DATA IN UI
// ==========================================

function setUserInterface(user) {


    const userName =

        getUserName(
            user
        );


    const initials =

        getUserInitials(
            userName
        );


    const userEmail =

        user.email ||
        "Not provided";

    const userMobile =
        user.user_metadata?.mobile ||
        user.user_metadata?.phone ||
        user.phone ||
        "Not provided";


    // WELCOME NAME

    const welcomeUserName =

        document.getElementById(
            "welcomeUserName"
        );


    if (welcomeUserName) {

        welcomeUserName.textContent =
            userName;

    }


    // WELCOME PROFILE

    const welcomeProfileName =

        document.getElementById(
            "welcomeProfileName"
        );


    if (welcomeProfileName) {

        welcomeProfileName.textContent =
            userName;

    }


    const welcomeProfileEmail =

        document.getElementById(
            "welcomeProfileEmail"
        );


    if (welcomeProfileEmail) {

        welcomeProfileEmail.textContent =
            userEmail;

    }


    const welcomeInitials =

        document.getElementById(
            "welcomeInitials"
        );


    if (welcomeInitials) {

        welcomeInitials.textContent =
            initials;

    }


    // NAVBAR INITIALS

    const dashboardInitials =

        document.getElementById(
            "dashboardInitials"
        );


    if (dashboardInitials) {

        dashboardInitials.textContent =
            initials;

    }


    // DROPDOWN INITIALS

    const dropdownInitials =

        document.getElementById(
            "dropdownInitials"
        );


    if (dropdownInitials) {

        dropdownInitials.textContent =
            initials;

    }


    // DROPDOWN NAME

    const dropdownUserName =

        document.getElementById(
            "dropdownUserName"
        );


    if (dropdownUserName) {

        dropdownUserName.textContent =
            userName;

    }


    // DROPDOWN EMAIL

    const dropdownUserEmail =

        document.getElementById(
            "dropdownUserEmail"
        );


    if (dropdownUserEmail) {

        dropdownUserEmail.textContent =
            userEmail;

    }


    // PROFILE

    const profileContainer =

        document.getElementById(
            "userProfile"
        );


    if (profileContainer) {

        profileContainer.innerHTML = `

            <div class="profile-main-user">

                <div class="profile-main-initials">

                    ${escapeHtml(initials)}

                </div>


                <div>

                    <strong>

                        ${escapeHtml(userName)}

                    </strong>


                    <span>

                        Raj Library User

                    </span>

                </div>


            </div>


            <div class="profile-row">

                <span>

                    Name

                </span>


                <strong>

                    ${escapeHtml(userName)}

                </strong>

            </div>


            <div class="profile-row">

                <span>

                    Email

                </span>


                <strong>

                    ${escapeHtml(userEmail)}

                </strong>

            </div>

            <div class="profile-row">

                <span>
                    Mobile
                </span>

                <strong>
                    ${escapeHtml(userMobile)}
                </strong>

            </div>

        `;

    }

}


// ==========================================
// LOAD USER DASHBOARD
// ==========================================

async function loadUserDashboard() {


    try {


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
                throw error;
            }

            window.location.href = "user-login.html";
            return;

        }


        if (

            !data ||

            !data.user

        ) {


            window.location.href =
                "user-login.html";


            return;

        }


        currentUser =
            data.user;


        setUserInterface(
            currentUser
        );

        setupAccountSettingsForm();

        // Load bookings

        await loadRoomBookings();


        // Library booking
        // Isko next step me exact
        // library table columns ke according
        // connect karenge.

        await loadLibraryBookings();


    } catch (error) {


        console.error(

            "Dashboard Error:",

            error

        );


        window.location.href =
            "user-login.html";

    }

}


// ==========================================
// HELPERS FOR DASHBOARD BOOKINGS
// ==========================================

function extractNoteValue(notes, label) {

    if (!notes || typeof notes !== "string") {
        return "";
    }

    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$");
    const match = notes.match(new RegExp(`${escapedLabel}:\\s*([^\\n]+)`, "i"));

    if (match && match[1]) {
        return match[1].trim();
    }

    return "";
}


function formatMoney(value) {

    const amount = Number(value || 0);

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(amount);
}


// ==========================================
// LOAD ROOM BOOKINGS
// ==========================================

async function loadRoomBookings() {

    const roomBookingContent = document.getElementById("roomBookingContent");
    const roomBookingCount = document.getElementById("roomBookingCount");

    if (!currentUser) {
        return;
    }

    try {
        const {
            data: roomBookings,
            error
        } = await supabaseClient
            .from("bookings")
            .select("*")
            .eq("user_id", currentUser.id)
            .eq("booking_type", "room")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        const bookingCount = roomBookings ? roomBookings.length : 0;

        if (roomBookingCount) {
            roomBookingCount.textContent = String(bookingCount);
        }

        updateTotalBookings();

        if (!roomBookings || roomBookings.length === 0) {
            if (roomBookingContent) {
                roomBookingContent.innerHTML = `
                    <div class="dashboard-empty-state">
                        <h4>No Room Booking</h4>
                        <p>You have not booked a room yet.</p>
                        <a href="rooms.html" class="dashboard-action-button">Explore Rooms</a>
                    </div>
                `;
            }
            return;
        }

        const booking = roomBookings[0];
        const roomEditCount = getBookingEditCount(booking);
        let roomData = null;

        if (booking.room_id) {
            const { data: room, error: roomError } = await supabaseClient
                .from("rooms")
                .select("*")
                .eq("id", booking.room_id)
                .maybeSingle();

            if (!roomError) {
                roomData = room;
            }
        }

        if (roomBookingContent) {
            roomBookingContent.innerHTML = `
                <div class="active-booking-box">
                    <div class="booking-status-row">
                        <span>ACTIVE BOOKING</span>
                        <strong class="booking-status-active">${escapeHtml(normalizeBookingStatus(booking.status))}</strong>
                    </div>

                    <div class="booking-details-grid">
                        <div>
                            <span>Room</span>
                            <strong>${escapeHtml(roomData?.room_number || booking.room_id || "Not available")}</strong>
                        </div>

                        <div>
                            <span>Room Type</span>
                            <strong>${escapeHtml(roomData?.room_type || "Not available")}</strong>
                        </div>

                        <div>
                            <span>Booking Date</span>
                            <strong>${formatDate(booking.booking_date || booking.start_date || booking.created_at)}</strong>
                        </div>

                        <div>
                            <span>Amount</span>
                            <strong>${escapeHtml(formatMoney(booking.amount))}</strong>
                        </div>
                    </div>
                    ${renderBookingEditButton(booking, roomEditCount)}
                </div>
            `;
        }

    } catch (error) {
        console.error("Room Booking Load Error:", error);

        if (roomBookingContent) {
            roomBookingContent.innerHTML = `
                <div class="dashboard-error-state">
                    Unable to load room bookings.
                </div>
            `;
        }
    }
}


// ==========================================
// LOAD LIBRARY BOOKINGS
// ==========================================

async function loadLibraryBookings() {

    const libraryBookingCount = document.getElementById("libraryBookingCount");
    const libraryBookingContent = document.getElementById("libraryBookingContent");

    if (!currentUser) {
        return;
    }

    try {
        const {
            data: libraryBookings,
            error
        } = await supabaseClient
            .from("bookings")
            .select("*")
            .eq("user_id", currentUser.id)
            .eq("booking_type", "library")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        const bookingCount = libraryBookings ? libraryBookings.length : 0;

        if (libraryBookingCount) {
            libraryBookingCount.textContent = String(bookingCount);
        }

        updateTotalBookings();

        if (!libraryBookings || libraryBookings.length === 0) {
            if (libraryBookingContent) {
                libraryBookingContent.innerHTML = `
                    <div class="dashboard-empty-state">
                        <h4>No Library Booking</h4>
                        <p>You have not booked a library seat yet.</p>
                        <a href="library.html" class="dashboard-action-button">Explore Library</a>
                    </div>
                `;
            }
            return;
        }

        const booking = libraryBookings[0];
        const libraryEditCount = getBookingEditCount(booking);
        const notes = booking.notes || "";
        const shiftName = extractNoteValue(notes, "Shift") || booking.shift_name || "Library Session";
        const shiftTiming = extractNoteValue(notes, "Timing") || booking.shift_timing || "Flexible";
        const bookingDate = booking.booking_date || booking.start_date || booking.created_at;

        if (libraryBookingContent) {
            libraryBookingContent.innerHTML = `
                <div class="active-booking-box">
                    <div class="booking-status-row">
                        <span>LIBRARY BOOKING</span>
                        <strong class="booking-status-active">${escapeHtml(normalizeBookingStatus(booking.status))}</strong>
                    </div>

                    <div class="booking-details-grid">
                        <div>
                            <span>Shift</span>
                            <strong>${escapeHtml(shiftName)}</strong>
                        </div>

                        <div>
                            <span>Timing</span>
                            <strong>${escapeHtml(shiftTiming)}</strong>
                        </div>

                        <div>
                            <span>Booking Date</span>
                            <strong>${formatDate(bookingDate)}</strong>
                        </div>

                        <div>
                            <span>Amount</span>
                            <strong>${escapeHtml(formatMoney(booking.amount))}</strong>
                        </div>
                    </div>
                    ${renderBookingEditButton(booking, libraryEditCount)}
                </div>
            `;
        }

    } catch (error) {
        console.error("Library Booking Load Error:", error);

        if (libraryBookingContent) {
            libraryBookingContent.innerHTML = `
                <div class="dashboard-error-state">
                    Unable to load library bookings.
                </div>
            `;
        }

        if (libraryBookingCount) {
            libraryBookingCount.textContent = "0";
        }
    }

    updateTotalBookings();
}


async function loadBookingHistory() {
    const container = document.getElementById("bookingHistoryContent");
    if (!container || !currentUser) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("bookings")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Booking history load error:", error);
        container.textContent = "Unable to load booking history.";
        return;
    }

    if (!data?.length) {
        container.textContent = "No booking history found.";
        return;
    }

    const roomIds = [...new Set(
        data
            .filter(booking => String(booking.booking_type).toLowerCase() === "room")
            .map(booking => booking.room_id)
            .filter(Boolean)
    )];
    let roomsById = {};
    if (roomIds.length) {
        const { data: rooms, error: roomsError } = await supabaseClient
            .from("rooms")
            .select("id, room_number, room_type")
            .in("id", roomIds);
        if (!roomsError) {
            roomsById = Object.fromEntries((rooms || []).map(room => [String(room.id), room]));
        }
    }

    container.innerHTML = data.map(booking => {
        const type = String(booking.booking_type || "").toLowerCase();
        const room = roomsById[String(booking.room_id)] || {};
        const location = type === "room"
            ? room.room_number || booking.room_id || "-"
            : booking.seat_id || extractNoteValue(booking.notes, "Seat") || "Not assigned";
        const editCount = getBookingEditCount(booking);
        return `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;padding:12px 0;border-bottom:1px solid #e5e7eb;">
                <div><small>Type</small><strong>${escapeHtml(type || "-")}</strong></div>
                <div><small>Room / Seat</small><strong>${escapeHtml(location)}</strong></div>
                <div><small>Date</small><strong>${formatDate(booking.booking_date || booking.start_date || booking.created_at)}</strong></div>
                <div><small>Amount</small><strong>${escapeHtml(formatMoney(booking.amount))}</strong></div>
                <div><small>Status</small><strong>${escapeHtml(booking.status || "pending")}</strong></div>
                <div><small>Created</small><strong>${formatDate(booking.created_at)}</strong></div>
                <div><small>Editing</small><strong>${editCount >= 1 ? "Used" : "Available"}</strong></div>
            </div>
        `;
    }).join("");
}

async function cancelUserBooking(bookingId) {
    if (!bookingId) {
        return;
    }

    const confirmed = confirm("Are you sure you want to cancel this booking?");
    if (!confirmed) {
        return;
    }

    try {
        const { data: booking, error: findError } = await supabaseClient
            .from("bookings")
            .select("*")
            .eq("id", bookingId)
            .eq("user_id", currentUser.id)
            .maybeSingle();

        if (findError) {
            throw findError;
        }

        if (!booking) {
            throw new Error("Booking not found.");
        }

        const { error } = await supabaseClient
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", bookingId)
            .eq("user_id", currentUser.id);

        if (error) {
            throw error;
        }

        if (String(booking.booking_type || "").toLowerCase() === "room" && booking.room_id) {
            await supabaseClient
                .from("rooms")
                .update({ status: "available" })
                .eq("id", booking.room_id);
        }

        if (String(booking.booking_type || "").toLowerCase() === "library" && booking.seat_id) {
            await supabaseClient
                .from("library_seats")
                .update({ status: "available" })
                .eq("id", booking.seat_id);
        }

        await loadUserDashboard();
        await loadBookingHistory();
        alert("Booking cancelled successfully.");
    } catch (error) {
        console.error("Booking cancellation error:", error);
        alert(error.message || "Unable to cancel booking.");
    }
}

function notifyUserOfRealtimeChange(message) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Raj Library", { body: message });
        return;
    }

    document.title = "New update - Raj Library";
    window.setTimeout(() => {
        document.title = originalDocumentTitle;
    }, 3000);
}

function setupUserRealtimeNotifications() {
    if (!currentUser || userRealtimeChannel) {
        return;
    }

    userRealtimeChannel = supabaseClient
        .channel(`user-bookings-${currentUser.id}`)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "bookings",
            filter: `user_id=eq.${currentUser.id}`
        }, async payload => {
            const booking = payload.new || payload.old || {};
            const status = String(booking.status || "").toLowerCase();
            const message = payload.eventType === "UPDATE" && status
                ? `Your ${booking.booking_type || ""} booking is now ${status}.`
                : payload.eventType === "INSERT"
                    ? "Your booking was submitted successfully."
                    : "Your booking was removed.";
            notifyUserOfRealtimeChange(message);
            await loadUserDashboard();
            await loadBookingHistory();
        })
        .subscribe(status => {
            if (status === "CHANNEL_ERROR") {
                console.error("User realtime subscription failed.");
            }
        });
}

// ==========================================
// UPDATE TOTAL BOOKINGS
// ==========================================

function updateTotalBookings() {


    const roomBookingCount =

        document.getElementById(
            "roomBookingCount"
        );


    const libraryBookingCount =

        document.getElementById(
            "libraryBookingCount"
        );


    const totalBookingCount =

        document.getElementById(
            "totalBookingCount"
        );


    const roomCount =

        parseInt(
            roomBookingCount
                ?.textContent || "0"
        );


    const libraryCount =

        parseInt(
            libraryBookingCount
                ?.textContent || "0"
        );


    if (totalBookingCount) {

        totalBookingCount.textContent =

            roomCount +
            libraryCount;

    }

}


function getBookingEditCount(booking) {
    if (Number.isFinite(Number(booking.edit_count))) {
        return Number(booking.edit_count);
    }

    const match = String(booking.notes || "").match(/User edits:\s*(\d+)/i);
    return match ? Number(match[1]) : 0;
}


function normalizeBookingStatus(status) {
    const value = String(status || "pending").trim().toLowerCase();

    if (["approved", "active", "confirmed", "booked", "available"].includes(value)) {
        return "approved";
    }

    if (["cancelled", "canceled"].includes(value)) {
        return "cancelled";
    }

    if (["rejected", "declined"].includes(value)) {
        return "rejected";
    }

    if (["pending", "in_review"].includes(value)) {
        return "pending";
    }

    return value || "pending";
}


function renderBookingEditButton(booking, editCount) {
    const status = normalizeBookingStatus(booking.status);
    const canEdit = editCount < 1 && !["cancelled", "rejected"].includes(status);
    const canCancel = !["cancelled", "rejected"].includes(status);

    const buttons = [];
    if (canEdit) {
        buttons.push(`<button type="button" class="dashboard-action-button" data-edit-booking-id="${escapeHtml(booking.id)}" style="border:none; cursor:pointer;">Edit Booking (1 time)</button>`);
    } else {
        buttons.push(`<div style="margin-top:14px; color:#6b7280; font-size:13px;">Booking editing limit used (1/1).</div>`);
    }

    if (canCancel) {
        buttons.push(`<button type="button" class="dashboard-action-button" data-cancel-booking-id="${escapeHtml(booking.id)}" style="border:none; background:#a63d3d; cursor:pointer; margin-top:10px;">Cancel Booking</button>`);
    }

    return `<div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; align-items:center;">${buttons.join("")}</div>`;
}


function openUserBookingEditor(booking) {
    const modal = document.createElement("div");
    modal.id = "userBookingEditModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(15,30,50,.6);display:flex;align-items:center;justify-content:center;padding:20px;z-index:3000;";
    modal.innerHTML = `
        <form id="userBookingEditForm" style="width:100%;max-width:440px;background:#fff;border-radius:14px;padding:24px;display:grid;gap:14px;">
            <h3 style="margin:0;color:#1e3a5f;">Edit Booking</h3>
            <p style="margin:0;color:#6b7280;">You can edit this booking only once.</p>
            <label style="display:grid;gap:6px;color:#1e3a5f;font-weight:600;">
                Booking Date
                <input name="booking_date" type="date" value="${escapeHtml((booking.booking_date || booking.start_date || "").slice(0, 10))}" required style="padding:10px 12px;border:1px solid #d9e0e8;border-radius:8px;">
            </label>
            <label style="display:grid;gap:6px;color:#1e3a5f;font-weight:600;">
                Mobile
                <input name="mobile" type="tel" inputmode="numeric" value="${escapeHtml(booking.mobile || extractNoteValue(booking.notes, "Mobile"))}" required style="padding:10px 12px;border:1px solid #d9e0e8;border-radius:8px;">
            </label>
            <div style="display:flex;justify-content:flex-end;gap:10px;">
                <button type="submit" style="padding:10px 16px;border:none;border-radius:8px;background:#1e3a5f;color:#fff;cursor:pointer;font-weight:700;">Save Edit</button>
                <button type="button" data-close-user-booking-edit style="padding:10px 16px;border:none;border-radius:8px;background:#eef2f6;color:#1e3a5f;cursor:pointer;font-weight:700;">Close</button>
            </div>
        </form>
    `;

    modal.addEventListener("click", event => {
        if (event.target === modal || event.target.closest("[data-close-user-booking-edit]")) {
            modal.remove();
        }
    });

    modal.querySelector("form").addEventListener("submit", event => saveUserBookingEdit(event, booking, modal));
    document.body.appendChild(modal);
}


async function saveUserBookingEdit(event, booking, modal) {
    event.preventDefault();
    const form = event.target;
    const bookingDate = form.elements.booking_date.value;
    const mobile = form.elements.mobile.value;
    const editCount = getBookingEditCount(booking);

    if (editCount >= 1) {
        alert("This booking has already been edited.");
        return;
    }

    if (!window.RajLibraryValidation.isValidMobile(mobile)) {
        alert(window.RajLibraryValidation.ERRORS?.MOBILE || "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
        return;
    }

    if (!currentUser?.email || !window.RajLibraryValidation.isValidEmail(currentUser.email)) {
        alert(window.RajLibraryValidation.ERRORS?.EMAIL || "Enter a valid email address.");
        return;
    }

    const notes = String(booking.notes || "")
        .replace(/User edits:\s*\d+/i, "")
        .trim();
    const nextNotes = `${notes}${notes ? "\n" : ""}Mobile: ${mobile}\nUser edits: 1`;
    const payload = {
        booking_date: bookingDate,
        notes: nextNotes,
        edit_count: 1
    };

    try {
        let { error } = await supabaseClient
            .from("bookings")
            .update(payload)
            .eq("id", booking.id)
            .eq("user_id", currentUser.id);

        if (error && /edit_count.*column|schema cache|Could not find the 'edit_count' column/i.test(error.message)) {
            delete payload.edit_count;
            ({ error } = await supabaseClient
                .from("bookings")
                .update(payload)
                .eq("id", booking.id)
                .eq("user_id", currentUser.id));
        }

        if (error) {
            throw error;
        }

        modal.remove();
        await loadUserDashboard();
        await loadBookingHistory();
        setupUserRealtimeNotifications();
        alert("Booking updated successfully. No further edits are allowed.");
    } catch (error) {
        console.error("Booking edit error:", error);
        alert("Unable to update booking.");
    }
}


function extractNoteValue(notes, label) {
    const match = String(notes || "").match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
    return match?.[1]?.trim() || "";
}

function setupAccountSettingsForm() {
    const form = document.getElementById("accountSettingsForm");
    if (!form) {
        return;
    }

    if (form.dataset.bound === "true") {
        const nameInput = document.getElementById("accountName");
        const emailInput = document.getElementById("accountEmail");
        const mobileInput = document.getElementById("accountMobile");

        if (currentUser) {
            const userName = getUserName(currentUser);
            if (nameInput) {
                nameInput.value = userName;
            }
            if (emailInput) {
                emailInput.value = currentUser.email || "";
            }
            if (mobileInput) {
                mobileInput.value = currentUser.user_metadata?.mobile || currentUser.user_metadata?.phone || currentUser.phone || "";
            }
        }
        return;
    }

    form.dataset.bound = "true";

    form.addEventListener("submit", async event => {
        event.preventDefault();
        const nameInput = document.getElementById("accountName");
        const mobileInput = document.getElementById("accountMobile");

        if (!currentUser) {
            alert("Please login again to update your settings.");
            return;
        }

        const name = String(nameInput?.value || "");
        const mobile = String(mobileInput?.value || "");

        if (!name) {
            alert("Please enter your name.");
            return;
        }

        const normalizedName = window.RajLibraryValidation.normalizeName(name);
        if (!window.RajLibraryValidation.isValidName(normalizedName)) {
            alert(window.RajLibraryValidation.ERRORS?.NAME || "Name can contain only letters and spaces.");
            return;
        }

        if (mobile && !window.RajLibraryValidation.isValidMobile(mobile)) {
            alert(window.RajLibraryValidation.ERRORS?.MOBILE || "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
            return;
        }

        const email = currentUser?.email || document.getElementById("accountEmail")?.value || "";
        if (!email || !window.RajLibraryValidation.isValidEmail(email)) {
            alert(window.RajLibraryValidation.ERRORS?.EMAIL || "Enter a valid email address.");
            return;
        }

        try {
            const { error: profileError } = await supabaseClient
                .from("profiles")
                .upsert({
                    id: currentUser.id,
                    email: currentUser.email,
                    name: normalizedName,
                    mobile: mobile || null,
                    role: "user"
                }, { onConflict: "id" });

            if (profileError) {
                throw profileError;
            }

            const { error: authError } = await supabaseClient.auth.updateUser({
                data: {
                    name: normalizedName,
                    mobile: mobile || ""
                }
            });

            if (authError) {
                throw authError;
            }

            currentUser = {
                ...currentUser,
                user_metadata: {
                    ...(currentUser.user_metadata || {}),
                    name: normalizedName,
                    mobile: mobile || ""
                },
                email: currentUser.email
            };

            const nameInputEl = document.getElementById("accountName");
            if (nameInputEl) {
                nameInputEl.value = normalizedName;
            }

            setUserInterface(currentUser);
            alert("Account settings saved successfully.");
        } catch (error) {
            console.error("Account settings save error:", error);
            alert(error.message || "Unable to save account settings.");
        }
    });

    const nameInput = document.getElementById("accountName");
    const emailInput = document.getElementById("accountEmail");
    const mobileInput = document.getElementById("accountMobile");

    if (currentUser) {
        const userName = getUserName(currentUser);
        if (nameInput) {
            nameInput.value = userName;
        }
        if (emailInput) {
            emailInput.value = currentUser.email || "";
        }
        if (mobileInput) {
            mobileInput.value = currentUser.user_metadata?.mobile || currentUser.user_metadata?.phone || currentUser.phone || "";
        }
    }
}


// ==========================================
// PROFILE DROPDOWN
// ==========================================

function setupProfileDropdown() {


    const profileButton =

        document.getElementById(
            "dashboardProfileButton"
        );


    const dropdown =

        document.getElementById(
            "dashboardProfileDropdown"
        );


    if (

        !profileButton ||

        !dropdown

    ) {

        return;

    }


    profileButton.addEventListener(

        "click",

        function (event) {


            event.stopPropagation();


            dropdown.classList.toggle(
                "show"
            );


        }

    );


    document.addEventListener(

        "click",

        function (event) {


            if (

                !dropdown.contains(
                    event.target
                ) &&

                !profileButton.contains(
                    event.target
                )

            ) {


                dropdown.classList.remove(
                    "show"
                );

            }


        }

    );

}


// ==========================================
// LOGOUT
// ==========================================

async function logoutUser() {


    try {


        const {

            error

        } =

        await supabaseClient
            .auth
            .signOut();


        if (error) {

            throw error;

        }


        window.location.href =
            "index.html";


    } catch (error) {


        console.error(

            "Logout Error:",

            error

        );


        alert(

            error.message ||

            "Unable to logout."

        );

    }

}


// ==========================================
// PAGE LOAD
// ==========================================

document.addEventListener(

    "DOMContentLoaded",

    async () => {


        setupProfileDropdown();
        setupAccountSettingsForm();
        document.addEventListener("click", event => {
            const editButton = event.target.closest("[data-edit-booking-id]");
            if (editButton) {
                const bookingId = editButton.dataset.editBookingId;
                loadBookingForEdit(bookingId);
                return;
            }

            const cancelButton = event.target.closest("[data-cancel-booking-id]");
            if (cancelButton) {
                cancelUserBooking(cancelButton.dataset.cancelBookingId);
            }
        });


        await loadUserDashboard();
        await loadBookingHistory();


        const logoutBtn =

            document.getElementById(
                "logoutBtn"
            );


            async function loadBookingForEdit(bookingId) {
                const { data, error } = await supabaseClient
                    .from("bookings")
                    .select("*")
                    .eq("id", bookingId)
                    .eq("user_id", currentUser.id)
                    .maybeSingle();

                if (error) {
                    console.error("Booking edit load error:", error);
                    alert("Unable to load booking.");
                    return;
                }

                if (!data || getBookingEditCount(data) >= 1) {
                    alert("This booking has already been edited.");
                    return;
                }

                openUserBookingEditor(data);
            }


        const dropdownLogoutBtn =

            document.getElementById(
                "dropdownLogoutBtn"
            );


        if (logoutBtn) {

            logoutBtn.addEventListener(

                "click",

                logoutUser

            );

        }


        if (dropdownLogoutBtn) {

            dropdownLogoutBtn.addEventListener(

                "click",

                logoutUser

            );

        }


    }

);