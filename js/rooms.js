// ==========================================
// RAJ LIBRARY
// ROOMS
// ==========================================


// ==========================================
// PAGE LOAD
// ==========================================

document.addEventListener(

    "DOMContentLoaded",

    async () => {

        await loadRooms();


    }

);



// ==========================================
// LOAD ROOMS
// ==========================================

async function loadRooms() {


    const container =

        document.getElementById(

            "roomsContainer"

        );


    if (!container) {


        console.error(

            "roomsContainer not found."

        );


        return;

    }


    container.innerHTML =

        "<p>Loading rooms...</p>";


    try {


        const {

            data: rooms,

            error

        } =

        await supabaseClient

            .from(

                "rooms"

            )

            .select(

                "*"

            )

            .order(

                "room_number",

                {

                    ascending: true

                }

            );


        if (error) {

            throw error;

        }


        if (
            !rooms ||

            rooms.length === 0

        ) {


            container.innerHTML =

                "<p>No rooms found.</p>";


            return;

        }

        const visibleRooms = rooms;

        if (visibleRooms.length === 0) {
            container.innerHTML = "<p>No rooms found.</p>";
            return;
        }


        // ==================================
        // CREATE ROOM CARDS
        // ==================================

        container.innerHTML =

            visibleRooms

                .map(

                    (

                        room

                    ) => {


                        const roomStatus =

                            (

                                room.status ||

                                ""

                            )

                            .toLowerCase();


                        const isAvailable =

                            roomStatus ===

                            "available";


                        return `

                        <article class="room-card">

                            <div class="room-card-media">
                                <img
                                    class="room-card-image"
                                    src="images/room-101.jpg"
                                    alt="Room ${escapeRoomHTML(room.room_number || "-")}"
                                >
                                <span class="room-card-status ${isAvailable ? "available" : "unavailable"}">
                                    ${escapeRoomHTML(room.status || "-")}
                                </span>
                            </div>

                            <div class="room-card-content">
                                <h3>Room ${escapeRoomHTML(room.room_number || "-")}</h3>

                                <div class="room-card-details">
                                    <p>
                                        <span>Room type</span>
                                        <strong>${escapeRoomHTML(room.room_type || "-")}</strong>
                                    </p>
                                    <p>
                                        <span>Capacity</span>
                                        <strong>${escapeRoomHTML(room.capacity || "-")}</strong>
                                    </p>
                                    ${room.description ? `
                                    <p>
                                        <span>Description</span>
                                        <strong>${escapeRoomHTML(room.description)}</strong>
                                    </p>
                                    ` : ""}
                                </div>

                                <div class="room-card-footer">
                                    <div class="room-card-rent">
                                        <span>Monthly rent</span>
                                        <strong>₹${Number(room.monthly_rent || 0).toLocaleString("en-IN")}<span>/month</span></strong>
                                    </div>

                            ${

                                isAvailable

                                    ?

                                    `

                                    <button

                                        class="book-btn"

                                        data-room-id="${escapeRoomHTML(room.id)}"

                                    >

                                        Book Room

                                    </button>

                                    `

                                    :

                                    `

                                    <button

                                        disabled

                                        class="book-btn disabled"

                                    >

                                        Not Available

                                    </button>

                                    `

                            }
                                </div>
                            </div>

                        </article>

                        `;


                    }

                )

                .join(

                    ""

                );


        // ==================================
        // ADD BOOK ROOM BUTTON EVENTS
        // ==================================

        const bookButtons =

            document.querySelectorAll(

                ".book-btn[data-room-id]"

            );


        bookButtons.forEach(

            (

                button

            ) => {


                button.addEventListener(

                    "click",

                    async () => {


                        const roomId =

                            button.getAttribute(

                                "data-room-id"

                            );


                        console.log(

                            "Book Room Clicked"

                        );


                        console.log(

                            "Room ID:",

                            roomId

                        );


                        if (!roomId) {


                            alert(

                                "Room ID not found."

                            );


                            return;

                        }


                        await bookRoom(

                            roomId

                        );


                    }

                );


            }

        );


    } catch (error) {


        console.error(

            "Room Load Error:",

            error

        );


        container.innerHTML =

            `

            <p>

                Unable to load rooms.

            </p>

            `;

    }

}


function escapeRoomHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}



// ==========================================
// GO TO ROOM BOOKING PAGE
// ==========================================

async function bookRoom(

    roomId

) {


    try {


        console.log(

            "Opening booking page for Room ID:",

            roomId

        );


        // ==================================
        // CHECK USER LOGIN
        // ==================================

        const {
            data,
            error
        } =

        await supabaseClient

            .auth

            .getUser();

        const isMissingSession =
            error &&
            /AuthSessionMissingError|Auth session missing/i.test(
                (error.name || "") + " " + (error.message || "")
            );

        if (error && !isMissingSession) {

            throw error;

        }

        const user = data?.user;

        if (!user) {

            sessionStorage.setItem(
                "pendingRoomBookingId",
                roomId
            );

            window.location.href =

                "user-login.html";


            return;

        }

        sessionStorage.removeItem("pendingRoomBookingId");

        // ==================================
        // OPEN ROOM BOOKING PAGE WITH ROOM ID
        // ==================================

        const bookingUrl =

            "room-booking.html?room=" +

            encodeURIComponent(

                roomId

            );


        console.log(

            "Redirect URL:",

            bookingUrl

        );


        window.location.href =

            bookingUrl;


    } catch (error) {


        console.error(

            "Book Room Error:",

            error

        );


        alert(

            error.message ||

            "Unable to continue with booking."

        );

    }

}