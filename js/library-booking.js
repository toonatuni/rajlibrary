/* =========================================
   RAJ LIBRARY
   LIBRARY BOOKING JAVASCRIPT
========================================= */


/* =========================================
   SHIFT DATA
========================================= */

const libraryShifts = {

    shift1: {

        name: "Shift 1",

        timing: "06:00 AM - 10:00 AM",

        fee: 500

    },


    shift2: {

        name: "Shift 2",

        timing: "10:00 AM - 02:00 PM",

        fee: 600

    },


    shift3: {

        name: "Shift 3",

        timing: "02:00 PM - 06:00 PM",

        fee: 700

    },


    shift4: {

        name: "Shift 4",

        timing: "06:00 PM - 10:00 PM",

        fee: 800

    }

};


async function loadLibraryPrices() {
    try {
        const { data, error } = await supabaseClient
            .from("app_settings")
            .select("value")
            .eq("key", "library_prices")
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (data?.value) {
            const prices = typeof data.value === "string"
                ? JSON.parse(data.value)
                : data.value;

            Object.keys(libraryShifts).forEach(shiftId => {
                if (Number.isFinite(Number(prices[shiftId]))) {
                    libraryShifts[shiftId].fee = Number(prices[shiftId]);
                }
            });
        }
    } catch (error) {
        console.warn("Library prices could not be loaded; using default prices.", error);
    }
}


/* =========================================
   ELEMENTS
========================================= */

const libraryBookingForm =
    document.getElementById(
        "libraryBookingForm"
    );


const libraryShift =
    document.getElementById(
        "libraryShift"
    );


const selectedShiftName =
    document.getElementById(
        "selectedShiftName"
    );


const selectedShiftTiming =
    document.getElementById(
        "selectedShiftTiming"
    );


const selectedShiftFee =
    document.getElementById(
        "selectedShiftFee"
    );


const libraryTotalAmount =
    document.getElementById(
        "libraryTotalAmount"
    );


const selectedShiftStatus =
    document.getElementById(
        "selectedShiftStatus"
    );


const libraryBookingMessage =
    document.getElementById(
        "libraryBookingMessage"
    );


const libraryStartDate =
    document.getElementById(
        "libraryStartDate"
    );


const confirmLibraryBooking =
    document.getElementById(
        "confirmLibraryBooking"
    );


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

    const dateText = details.bookingDate
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
            <title>Raj Library Receipt</title>
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
                        <div class="meta">Booking Receipt</div>
                    </div>
                    <div class="meta">#${details.bookingId || "N/A"}</div>
                </div>

                <div class="row"><span class="label">Booking Type</span><span>${details.bookingType}</span></div>
                <div class="row"><span class="label">Customer</span><span>${details.customerName || "N/A"}</span></div>
                <div class="row"><span class="label">Shift</span><span>${details.shiftName || "N/A"}</span></div>
                <div class="row"><span class="label">Timing</span><span>${details.shiftTiming || "N/A"}</span></div>
                <div class="row"><span class="label">Start Date</span><span>${dateText}</span></div>
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
    const fileName = `raj-library-receipt-${Date.now()}.html`;

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);

}


function loadSelectedShift() {

    const selectedShiftId =
        localStorage.getItem(
            "selectedShiftId"
        );

    if (
        selectedShiftId &&
        libraryShift &&
        libraryShifts[selectedShiftId]
    ) {
        libraryShift.value =
            selectedShiftId;

        updateShiftDetails();
    }

}


async function checkUserLogin() {

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
        return false;
    }

    if (!data || !data.user) {
        window.location.href =
            "user-login.html";

        return false;
    }

    currentUser =
        data.user;

    return true;

}


/* =========================================
   SET MINIMUM DATE
========================================= */

if (libraryStartDate) {

    const today =
        new Date()
        .toISOString()
        .split("T")[0];


    libraryStartDate.min =
        today;

}


/* =========================================
   FORMAT AMOUNT
========================================= */

function formatAmount(amount) {

    return new Intl.NumberFormat(
        "en-IN",
        {

            style:
                "currency",

            currency:
                "INR",

            maximumFractionDigits:
                0

        }
    ).format(amount);

}


/* =========================================
   UPDATE SHIFT DETAILS
========================================= */

function updateShiftDetails() {

    const selectedValue =
        libraryShift.value;


    /* NO SHIFT SELECTED */

    if (!selectedValue) {

        selectedShiftName.textContent =
            "-";


        selectedShiftTiming.textContent =
            "-";


        selectedShiftFee.textContent =
            "₹0";


        libraryTotalAmount.textContent =
            "₹0";


        selectedShiftStatus.textContent =
            "Select Shift";


        return;

    }


    /* GET SHIFT DATA */

    const shift =
        libraryShifts[
            selectedValue
        ];


    /* UPDATE DISPLAY */

    selectedShiftName.textContent =
        shift.name;


    selectedShiftTiming.textContent =
        shift.timing;


    selectedShiftFee.textContent =
        formatAmount(
            shift.fee
        );


    libraryTotalAmount.textContent =
        formatAmount(
            shift.fee
        );


    selectedShiftStatus.textContent =
        "Available";

}


/* =========================================
   SHIFT CHANGE EVENT
========================================= */

if (libraryShift) {

    libraryShift.addEventListener(
        "change",
        updateShiftDetails
    );

}


/* =========================================
   MOBILE VALIDATION
========================================= */

function isValidMobile(mobile) {
    return window.RajLibraryValidation.isValidMobile(mobile);
}


/* =========================================
   FORM SUBMIT
========================================= */

if (libraryBookingForm) {

    libraryBookingForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* GET VALUES */

            const userName =
                window.RajLibraryValidation
                .normalizeName(document
                .getElementById(
                    "libraryUserName"
                )
                .value
                );


            const mobile =
                document
                .getElementById(
                    "libraryMobile"
                )
                .value;


            const selectedShift =
                libraryShift.value;


            const startDate =
                libraryStartDate.value;


            /* CLEAR MESSAGE */

            libraryBookingMessage.textContent =
                "";


            libraryBookingMessage.className =
                "library-booking-message";


            /* NAME VALIDATION */

            if (!userName || !window.RajLibraryValidation.isValidName(userName)) {

                showBookingError(
                    window.RajLibraryValidation.ERRORS?.NAME || "Name can contain only letters and spaces."
                );

                return;

            }


            /* MOBILE VALIDATION */

            if (
                !mobile ||
                !isValidMobile(
                    mobile
                )
            ) {

                showBookingError(
                    window.RajLibraryValidation.ERRORS?.MOBILE || "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9."
                );

                return;

            }


            /* SHIFT VALIDATION */

            if (!selectedShift) {

                showBookingError(
                    "Please select a library shift."
                );

                return;

            }


            /* DATE VALIDATION */

            if (!startDate) {

                showBookingError(
                    "Please select your membership start date."
                );

                return;

            }


            /* SHIFT DATA */

            const shift =
                libraryShifts[
                    selectedShift
                ];


            /* DISABLE BUTTON */

            confirmLibraryBooking.disabled =
                true;


            confirmLibraryBooking.textContent =
                "Processing...";


            try {

                if (!currentUser) {
                    const loggedIn =
                        await checkUserLogin();

                    if (!loggedIn) {
                        return;
                    }
                }

                if (!currentUser?.email || !window.RajLibraryValidation.isValidEmail(currentUser.email)) {
                    showBookingError(
                        window.RajLibraryValidation.ERRORS?.EMAIL || "Enter a valid email address."
                    );
                    confirmLibraryBooking.disabled = false;
                    confirmLibraryBooking.textContent = "Confirm Library Booking";
                    return;
                }

                const bookingNotes = [
                    `Name: ${userName}`,
                    `Mobile: ${mobile}`,
                    `Email: ${currentUser.email}`,
                    `Shift: ${shift.name}`,
                    `Timing: ${shift.timing}`,
                    `Membership start date: ${startDate}`
                ].join("\n");

                const basePayload = {
                    user_id:
                        currentUser.id,
                    booking_type:
                        "library",
                    booking_date:
                        startDate,
                    shift_id:
                        libraryShift.value,
                    amount:
                        shift.fee,
                    status:
                        "pending",
                    edit_count:
                        0
                };

                const insertPayload = { ...basePayload };

                const notesSupported = await bookingSupportsNotesColumn();

                if (notesSupported) {
                    insertPayload.notes = bookingNotes;
                }

                let data;
                let error;

                ({ data, error } = await supabaseClient
                    .from("bookings")
                    .insert([insertPayload])
                    .select());

                if (error && insertPayload.notes && /notes.*column|schema cache|Could not find the 'notes' column/i.test(error.message)) {
                    delete insertPayload.notes;
                    ({ data, error } = await supabaseClient
                        .from("bookings")
                        .insert([insertPayload])
                        .select());
                }

                if (error && /edit_count.*column|schema cache|Could not find the 'edit_count' column/i.test(error.message)) {
                    delete insertPayload.edit_count;
                    ({ data, error } = await supabaseClient
                        .from("bookings")
                        .insert([insertPayload])
                        .select());
                }

                if (error && /check constraint|bookings_check|status/i.test(error.message || "")) {
                    const fallbackPayload = {
                        user_id: currentUser.id,
                        booking_type: "library",
                        booking_date: startDate,
                        amount: shift.fee,
                        status: "pending",
                        edit_count: 0
                    };

                    ({ data, error } = await supabaseClient
                        .from("bookings")
                        .insert([fallbackPayload])
                        .select());
                }

                if (error) {
                    throw error;
                }

                const createdBooking = data && data[0] ? data[0] : null;

                libraryBookingMessage.textContent =
                    "Library booking created successfully.";

                libraryBookingMessage.className =
                    "library-booking-message success";

                downloadBookingReceipt({
                    bookingId: createdBooking && createdBooking.id ? createdBooking.id : "LIB-" + Date.now(),
                    bookingType: "Library",
                    customerName: userName || currentUser?.email || "Customer",
                    shiftName: shift.name,
                    shiftTiming: shift.timing,
                    bookingDate: startDate,
                    amount: shift.fee,
                    status: "pending"
                });

                localStorage.removeItem(
                    "selectedShiftId"
                );

                setTimeout(
                    function () {
                        window.location.href =
                            "user-dashboard.html";
                    },
                    1000
                );

            } catch (error) {

                console.error(
                    "Library Booking Error:",
                    error
                );

                libraryBookingMessage.textContent =
                    error.message ||
                    "Unable to create library booking.";

                libraryBookingMessage.className =
                    "library-booking-message error";

                confirmLibraryBooking.disabled =
                    false;

                confirmLibraryBooking.textContent =
                    "Confirm Library Booking";
            }

        }

    );

}


document.addEventListener(
    "DOMContentLoaded",
    async () => {
        try {
            await checkUserLogin();
            await loadLibraryPrices();
            loadSelectedShift();
        } catch (error) {
            console.error(
                "Library Login Check Error:",
                error
            );
        }
    }
);


/* =========================================
   SHOW ERROR
========================================= */

function showBookingError(message) {

    libraryBookingMessage.textContent =
        message;


    libraryBookingMessage.className =
        "library-booking-message error";

}