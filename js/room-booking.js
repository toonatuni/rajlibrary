// ==========================================
// RAJ LIBRARY
// ROOM BOOKING PAGE
// ==========================================


// ==========================================
// GLOBAL VARIABLES
// ==========================================

let selectedRoom = null;

let currentUser = null;


async function bookingSupportsNotesColumn() {

    try {

        const {
            error
        } = await supabaseClient
            .from("bookings")
            .select("notes")
            .limit(1);

        if (!error) {
            return true;
        }

        const message =
            (error && error.message) || "";

        return !/notes.*column|schema cache|Could not find the 'notes' column/i.test(message);

    } catch (error) {

        const message =
            error && error.message ? error.message : String(error);

        return !/notes.*column|schema cache|Could not find the 'notes' column/i.test(message);

    }

}


function createBookingReceiptHTML(details) {

    const bookingDateText = details.bookingDate
        ? new Date(details.bookingDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
        : "N/A";

    const amountText = Number(details.amount || 0).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR"
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <title>Room Booking Receipt</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 24px;
                    color: #1f2937;
                }
                .receipt {
                    max-width: 640px;
                    margin: 0 auto;
                    border: 1px solid #d1d5db;
                    border-radius: 12px;
                    padding: 24px;
                    background: #fff;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 16px;
                    margin-bottom: 16px;
                }
                .title {
                    font-size: 26px;
                    font-weight: 700;
                    color: #1d4ed8;
                }
                .meta {
                    margin: 10px 0;
                    font-size: 14px;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #f3f4f6;
                }
                .label {
                    color: #4b5563;
                }
                .amount {
                    font-weight: 700;
                    color: #111827;
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <div>
                        <div class="title">Raj Library</div>
                        <div class="meta">Room Booking Receipt</div>
                    </div>
                    <div class="meta">#${details.bookingId || "N/A"}</div>
                </div>

                <div class="row"><span class="label">Booking Type</span><span>${details.bookingType}</span></div>
                <div class="row"><span class="label">Customer</span><span>${details.customerName || "N/A"}</span></div>
                <div class="row"><span class="label">Room</span><span>${details.roomNumber || "N/A"}</span></div>
                <div class="row"><span class="label">Date</span><span>${bookingDateText}</span></div>
                <div class="row"><span class="label">Amount</span><span class="amount">${amountText}</span></div>
                <div class="row"><span class="label">Status</span><span>${details.status || "Booked"}</span></div>
                <div class="row"><span class="label">Downloaded</span><span>${new Date().toLocaleString("en-IN")}</span></div>
            </div>
        </body>
        </html>
    `;

}


function downloadBookingReceipt(details) {

    const html = createBookingReceiptHTML(details);
    const blob = new Blob([html], {
        type: "text/html;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `raj-room-receipt-${Date.now()}.html`;

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);

}


// ==========================================
// GET ROOM ID FROM URL
// ==========================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const roomId =
    urlParams.get(
        "room"
    ) || sessionStorage.getItem("pendingRoomBookingId");


// ==========================================
// CHECK USER LOGIN
// ==========================================

async function checkUserLogin() {

    const {
        data,
        error
    } = await supabaseClient.auth.getUser();

    const isMissingSession =
        error &&
        /AuthSessionMissingError|Auth session missing/i.test(
            (error.name || "") + " " + (error.message || "")
        );

    if (error && !isMissingSession) {
        throw error;
    }

    currentUser = data?.user || null;
    return Boolean(currentUser);


}


async function areBookingsEnabled() {
    const { data, error } = await supabaseClient
        .from("app_settings")
        .select("value")
        .eq("key", "library_settings")
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data?.value?.booking_enabled !== false;
}


function roomBookingDraftKey() {
    return `roomBookingDraft:${roomId || "unknown"}`;
}


function saveRoomBookingDraft() {
    sessionStorage.setItem(roomBookingDraftKey(), JSON.stringify({
        name: document.getElementById("bookingUserName")?.value || "",
        mobile: document.getElementById("bookingMobile")?.value || "",
        date: document.getElementById("bookingDate")?.value || ""
    }));
}


function restoreRoomBookingDraft() {
    const draftValue = sessionStorage.getItem(roomBookingDraftKey());
    if (!draftValue) {
        return;
    }

    try {
        const draft = JSON.parse(draftValue);
        const nameInput = document.getElementById("bookingUserName");
        const mobileInput = document.getElementById("bookingMobile");
        const dateInput = document.getElementById("bookingDate");

        if (nameInput && typeof draft.name === "string") {
            nameInput.value = draft.name;
        }
        if (mobileInput && typeof draft.mobile === "string") {
            mobileInput.value = draft.mobile;
        }
        if (dateInput && typeof draft.date === "string") {
            dateInput.value = draft.date;
        }
    } catch (error) {
        console.error("Room booking draft could not be restored:", error);
        sessionStorage.removeItem(roomBookingDraftKey());
    }
}


// ==========================================
// LOAD ROOM DETAILS
// ==========================================

async function loadRoomDetails() {


    const bookingMessage =
        document.getElementById(
            "bookingMessage"
        );


    // Check Room ID

    if (!roomId) {


        console.warn(
            "Room ID not found in URL; select a room before opening this page."
        );


        if (bookingMessage) {

            bookingMessage.style.color =
                "red";


            bookingMessage.textContent =
                "Room ID not found. Please select a room again.";

        }


        return;

    }


    try {


        const {

            data,

            error

        } =
        await supabaseClient
            .from(
                "rooms"
            )
            .select(
                "*"
            )
            .eq(
                "id",
                roomId
            )
            .single();


        if (error) {

            throw error;

        }


        if (!data) {

            throw new Error(
                "Room not found."
            );

        }


        selectedRoom =
            data;


        // ==================================
        // ROOM NAME
        // ==================================

        const bookingRoomName =
            document.getElementById(
                "bookingRoomName"
            );


        if (bookingRoomName) {

            bookingRoomName.textContent =
                "Room " +
                selectedRoom.room_number;

        }


        // ==================================
        // ROOM NUMBER
        // ==================================

        const bookingRoomNumber =
            document.getElementById(
                "bookingRoomNumber"
            );


        if (bookingRoomNumber) {

            bookingRoomNumber.textContent =
                selectedRoom.room_number;

        }


        // ==================================
        // ROOM CAPACITY
        // ==================================

        const bookingRoomCapacity =
            document.getElementById(
                "bookingRoomCapacity"
            );


        if (bookingRoomCapacity) {

            bookingRoomCapacity.textContent =
                selectedRoom.capacity +
                " Person";

        }


        // ==================================
        // MONTHLY RENT
        // ==================================

        const bookingRoomRent =
            document.getElementById(
                "bookingRoomRent"
            );


        const bookingTotalAmount =
            document.getElementById(
                "bookingTotalAmount"
            );


        if (bookingRoomRent) {

            bookingRoomRent.textContent =
                "₹" +
                selectedRoom.monthly_rent;

        }


        if (bookingTotalAmount) {

            bookingTotalAmount.textContent =
                "₹" +
                selectedRoom.monthly_rent;

        }


        // ==================================
        // ROOM STATUS
        // ==================================

        const bookingRoomStatus =
            document.getElementById(
                "bookingRoomStatus"
            );


        if (bookingRoomStatus) {

            bookingRoomStatus.textContent =
                selectedRoom.status === "available"
                    ? "Available"
                    : "Not Available";

        }


        console.log(
            "Selected Room:",
            selectedRoom
        );


    }
    catch (error) {


        console.error(
            "Room Loading Error:",
            error
        );


        if (bookingMessage) {

            bookingMessage.style.color =
                "red";


            bookingMessage.textContent =
                error.message ||
                "Unable to load room details.";

        }

    }


}


// ==========================================
// SET MINIMUM BOOKING DATE
// ==========================================

function setMinimumDate() {


    const bookingDate =
        document.getElementById(
            "bookingDate"
        );


    if (!bookingDate) {

        return;

    }


    const today =
        new Date()
            .toISOString()
            .split(
                "T"
            )[0];


    bookingDate.min =
        today;


}


// ==========================================
// PREFILL USER NAME
// ==========================================

function loadUserDetails() {


    const bookingUserName =
        document.getElementById(
            "bookingUserName"
        );


    if (
        !currentUser ||
        !bookingUserName
    ) {

        return;

    }


    const userName =

        currentUser
            .user_metadata
            ?.name

        ||

        currentUser
            .user_metadata
            ?.full_name

        ||

        currentUser
            .user_metadata
            ?.user_name

        ||

        currentUser.email
            ?.split(
                "@"
            )[0]

        ||

        "";


    bookingUserName.value =
        userName;


}


// ==========================================
// CREATE ROOM BOOKING
// ==========================================

async function createRoomBooking(
    event
) {


    event.preventDefault();


    const bookingMessage =
        document.getElementById(
            "bookingMessage"
        );


    // ======================================
    // CHECK LOGIN
    // ======================================

    try {
        const loggedIn = await checkUserLogin();
        if (!loggedIn) {
            saveRoomBookingDraft();
            if (selectedRoom?.id) {
                sessionStorage.setItem("pendingRoomBookingId", selectedRoom.id);
            }
            window.location.href = "user-login.html";
            return;
        }

        if (!(await areBookingsEnabled())) {
            if (bookingMessage) {
                bookingMessage.style.color = "red";
                bookingMessage.textContent = "New bookings are currently disabled.";
            }
            return;
        }
    } catch (error) {
        console.error("Room booking eligibility check failed:", error);
        if (bookingMessage) {
            bookingMessage.style.color = "red";
            bookingMessage.textContent = "Unable to verify your login or booking availability. Please try again.";
        }
        return;
    }


    // ======================================
    // CHECK ROOM
    // ======================================

    if (!selectedRoom) {


        if (bookingMessage) {

            bookingMessage.style.color =
                "red";


            bookingMessage.textContent =
                "Room details are still loading. Please wait.";

        }


        return;

    }


    // ======================================
    // GET FORM VALUES
    // ======================================

    const userName =
        window.RajLibraryValidation
            .normalizeName(document
            .getElementById(
                "bookingUserName"
            )
            .value
            );


    const mobile =
        document
            .getElementById(
                "bookingMobile"
            )
            .value;


    const bookingDate =
        document
            .getElementById(
                "bookingDate"
            )
            .value;


    // ======================================
    // VALIDATION
    // ======================================

    if (!userName || !mobile || !bookingDate) {


        if (bookingMessage) {

            bookingMessage.style.color =
                "red";


            bookingMessage.textContent =
                "Please fill all required details.";

        }


        return;

    }

    if (!window.RajLibraryValidation.isValidName(userName)) {
        if (bookingMessage) {
            bookingMessage.style.color = "red";
            bookingMessage.textContent = window.RajLibraryValidation.ERRORS?.NAME || "Name can contain only letters and spaces.";
        }
        return;
    }

    if (!window.RajLibraryValidation.isValidMobile(mobile)) {
        if (bookingMessage) {
            bookingMessage.style.color = "red";
            bookingMessage.textContent = window.RajLibraryValidation.ERRORS?.MOBILE || "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.";
        }
        return;
    }

    if (!currentUser?.email || !window.RajLibraryValidation.isValidEmail(currentUser.email)) {
        if (bookingMessage) {
            bookingMessage.style.color = "red";
            bookingMessage.textContent = window.RajLibraryValidation.ERRORS?.EMAIL || "Enter a valid email address.";
        }
        return;
    }


    try {


        // ==================================
        // LOADING MESSAGE
        // ==================================

        if (bookingMessage) {

            bookingMessage.style.color =
                "#1e3a5f";


            bookingMessage.textContent =
                "Creating your room booking...";

        }


        const confirmButton =
            document.getElementById(
                "confirmRoomBooking"
            );


        if (confirmButton) {

            confirmButton.disabled =
                true;


            confirmButton.textContent =
                "Processing...";

        }


        // ==================================
        // INSERT INTO ROOM_BOOKINGS
        // ==================================

        const bookingNotes = [
            `Name: ${userName}`,
            `Mobile: ${mobile}`,
            `Email: ${currentUser.email}`,
            `Room ID: ${selectedRoom.id}`,
            `Booking date: ${bookingDate}`
        ].join("\n");

        const insertPayload = {
            user_id:
                currentUser.id,

            room_id:
                selectedRoom.id,

            booking_type:
                "room",

            booking_date:
                bookingDate,

            amount:
                selectedRoom.monthly_rent,

            status:
                "pending",
            edit_count:
                0
        };

        const notesSupported = await bookingSupportsNotesColumn();

        if (notesSupported) {
            insertPayload.notes = bookingNotes;
        }

        let data;
        let error;

        ({ data, error } = await supabaseClient
            .from(
                "bookings"
            )
            .insert([
                insertPayload
            ])
            .select());

        if (error && insertPayload.notes && /notes.*column|schema cache|Could not find the 'notes' column/i.test(error.message)) {
            delete insertPayload.notes;
            ({ data, error } = await supabaseClient
                .from(
                    "bookings"
                )
                .insert([
                    insertPayload
                ])
                .select());
        }

        if (error && /edit_count.*column|schema cache|Could not find the 'edit_count' column/i.test(error.message)) {
            delete insertPayload.edit_count;
            ({ data, error } = await supabaseClient
                .from("bookings")
                .insert([
                    insertPayload
                ])
                .select());
        }

        if (error) {

            throw error;

        }


        console.log(
            "Room Booking Created:",
            data
        );

        const createdBooking = data && data[0] ? data[0] : null;
        sessionStorage.removeItem(roomBookingDraftKey());
        sessionStorage.removeItem("pendingRoomBookingId");

        downloadBookingReceipt({
            bookingId: createdBooking && createdBooking.id ? createdBooking.id : "ROOM-" + Date.now(),
            bookingType: "Room",
            customerName: userName || currentUser?.email || "Customer",
            roomNumber: selectedRoom.room_number || selectedRoom.id,
            bookingDate: bookingDate,
            amount: selectedRoom.monthly_rent,
            status: "pending"
        });


        // ==================================
        // SUCCESS MESSAGE
        // ==================================

        if (bookingMessage) {

            bookingMessage.style.color =
                "green";


            bookingMessage.textContent =
                "Room booked successfully!";

        }


        // ==================================
        // REDIRECT
        // ==================================

        setTimeout(


            () => {


                window.location.href =
                    "index.html";


            },


            1500


        );


    }
    catch (error) {


        console.error(
            "Room Booking Error:",
            error
        );


        if (bookingMessage) {

            bookingMessage.style.color =
                "red";


            bookingMessage.textContent =
                error.message ||
                "Unable to create room booking.";

        }


        const confirmButton =
            document.getElementById(
                "confirmRoomBooking"
            );


        if (confirmButton) {

            confirmButton.disabled =
                false;


            confirmButton.textContent =
                "Confirm Booking";

        }

    }


}


// ==========================================
// PAGE LOAD
// ==========================================

document.addEventListener(


    "DOMContentLoaded",


    async () => {


        // Set date

        setMinimumDate();


        try {
            await checkUserLogin();
        } catch (error) {
            console.error("Room session check failed:", error);
        }

        // Prefill user details
        loadUserDetails();

        // Load selected room
        await loadRoomDetails();

        restoreRoomBookingDraft();

        // Booking form

        const roomBookingForm =
            document.getElementById(
                "roomBookingForm"
            );


        if (roomBookingForm) {


            roomBookingForm.addEventListener(


                "submit",


                createRoomBooking


            );


        }


    }


);