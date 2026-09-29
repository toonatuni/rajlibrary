/* =========================================
   RAJ LIBRARY
   LIBRARY PAGE JAVASCRIPT
========================================= */


/* =========================================
   SHIFT DATA
========================================= */

const shifts = {

    shift1: {
        name: "Morning Shift",
        time: "06:00 AM - 10:00 AM",
        fee: 500
    },


    shift2: {
        name: "Day Shift",
        time: "10:00 AM - 02:00 PM",
        fee: 600
    },


    shift3: {
        name: "Afternoon Shift",
        time: "02:00 PM - 06:00 PM",
        fee: 700
    },


    shift4: {
        name: "Evening Shift",
        time: "06:00 PM - 10:00 PM",
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

        const prices = data?.value
            ? (typeof data.value === "string" ? JSON.parse(data.value) : data.value)
            : {};

        Object.keys(shifts).forEach(shiftId => {
            const fee = Number(prices[shiftId]);
            if (Number.isFinite(fee) && fee >= 0) {
                shifts[shiftId].fee = fee;
            }
        });

        document.querySelectorAll("[data-shift-fee]").forEach(element => {
            const fee = shifts[element.dataset.shiftFee]?.fee;
            if (Number.isFinite(fee)) {
                element.textContent = `₹${fee}`;
            }
        });
    } catch (error) {
        console.warn("Library prices could not be loaded; using default prices.", error);
    }
}



/* =========================================
   SELECT SHIFT
========================================= */

function selectShift(
    shiftId,
    shiftName,
    shiftTimeOrFee,
    monthlyFee
) {

    const shiftData =
        shifts[shiftId] || {};

    const selectedShiftName =
        shiftName ||
        shiftData.name ||
        "Library Shift";

    const selectedShiftTime =
        typeof shiftTimeOrFee === "string"
            ? shiftTimeOrFee
            : shiftData.time || "";

    const selectedFee = shiftData.fee || 0;


    /* Save selected shift */

    localStorage.setItem(
        "selectedShiftId",
        shiftId
    );


    localStorage.setItem(
        "selectedShiftName",
        selectedShiftName
    );


    localStorage.setItem(
        "selectedShiftTime",
        selectedShiftTime
    );


    localStorage.setItem(
        "selectedShiftFee",
        String(selectedFee)
    );


    /* Redirect to booking page */

    window.location.href =
        "library-booking.html";

}



/* =========================================
   LOAD AVAILABLE SEATS
========================================= */

async function loadAvailableSeats() {


    try {


        const {
            data,
            error
        } =
        await supabaseClient
            .from("library_seats")
            .select("*");


        if (error) {

            throw error;

        }


        /* Total Available */

        const availableSeats =
            data.filter(

                seat =>
                    seat.status === "available"

            );


        document
            .getElementById(
                "totalAvailableSeats"
            )
            .textContent =
            availableSeats.length;



        /* Shift wise count */

        const shiftCounts = {

            shift1: 0,
            shift2: 0,
            shift3: 0,
            shift4: 0

        };


        availableSeats.forEach(

            seat => {


                if (
                    shiftCounts.hasOwnProperty(
                        seat.shift_id
                    )
                ) {

                    shiftCounts[
                        seat.shift_id
                    ]++;

                }

            }

        );


        /* Update HTML */

        document
            .querySelectorAll(
                ".available-seat-count"
            )
            .forEach(

                element => {


                    const shiftId =
                        element.dataset.shift;


                    element.textContent =
                        shiftCounts[
                            shiftId
                        ] || 0;

                }

            );


    } catch (error) {


        console.error(
            "Seat Load Error:",
            error
        );


        document
            .getElementById(
                "totalAvailableSeats"
            )
            .textContent =
            "0";


        document
            .querySelectorAll(
                ".available-seat-count"
            )
            .forEach(

                element => {

                    element.textContent =
                        "--";

                }

            );

    }


}



/* =========================================
   PAGE LOAD
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        await loadLibraryPrices();
        await loadAvailableSeats();


    }
);