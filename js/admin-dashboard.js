/* =========================================================
   RAJ LIBRARY ADMIN DASHBOARD
   Supabase based admin dashboard
   Tables:
   profiles
   bookings
   rooms
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initAdminDashboard();
});


let currentAdmin = null;
let allUsers = [];
let allBookings = [];
let allRooms = [];
let autoRefreshInterval = null;
let adminRealtimeChannel = null;
let adminNotificationItems = [];
const defaultLibraryPrices = {
    shift1: 500,
    shift2: 600,
    shift3: 700,
    shift4: 800
};
let libraryPrices = { ...defaultLibraryPrices };


/* =========================================================
   INIT
========================================================= */

async function initAdminDashboard() {

    try {

        await checkAdminAccess();

        setupNavigation();
        setupSidebar();
        setupAdminThemeToggle();
        setupNotifications();
        setupSearch();
        setupQuickActions();
        setupSettings();
        setupReportsControls();
        setupBookingFilters();
        setupAdminProfileControls();
        setupPricingControls();
        setupAdminActionHandlers();

        setDashboardDate();

        await loadAdminData();
        await loadLibraryPrices();
        renderRoomPricingFields();

        startAutoRefresh();

    } catch (error) {

        console.error("Admin dashboard initialization error:", error);

        alert(
            "Unable to load admin dashboard. Please login again."
        );

        window.location.href = "user-login.html";
    }
}


/* =========================================================
   ADMIN ACCESS
========================================================= */

async function checkAdminAccess() {

    const {
        data,
        error
    } = await supabaseClient.auth.getUser();

    if (error) {
        throw error;
    }

    const user = data?.user;

    if (!user) {
        throw new Error("User is not logged in.");
    }

    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        throw profileError;
    }

    if (!profile || profile.role !== "admin") {

        alert("Admin access required.");

        await supabaseClient.auth.signOut();

        window.location.href = "user-login.html";

        return;
    }

    currentAdmin = {
        ...user,
        ...profile
    };

    updateAdminProfile(currentAdmin);
}


/* =========================================================
   ADMIN PROFILE
========================================================= */

function updateAdminProfile(admin) {

    const name =
        admin.name ||
        admin.user_metadata?.name ||
        admin.email?.split("@")[0] ||
        "Admin";

    const email =
        admin.email ||
        "";

    const initials = getInitials(name);

    const elements = {

        adminName:
            document.getElementById("adminName"),

        adminInitial:
            document.getElementById("adminInitial"),

        adminDropdownName:
            document.getElementById("adminDropdownName"),

        adminDropdownInitial:
            document.getElementById("adminDropdownInitial"),

        welcomeAdminName:
            document.getElementById("welcomeAdminName"),

        profileAvatar:
            document.getElementById("profileAvatar"),

        profileName:
            document.getElementById("profileName"),

        profileEmail:
            document.getElementById("profileEmail")

    };


    if (elements.adminName) {
        elements.adminName.textContent = name;
    }

    if (elements.adminInitial) {
        elements.adminInitial.textContent = initials;
    }

    if (elements.adminDropdownName) {
        elements.adminDropdownName.textContent = name;
    }

    if (elements.adminDropdownInitial) {
        elements.adminDropdownInitial.textContent = initials;
    }

    if (elements.welcomeAdminName) {
        elements.welcomeAdminName.textContent = name;
    }

    if (elements.profileAvatar) {
        elements.profileAvatar.textContent = initials;
    }

    if (elements.profileName) {
        elements.profileName.textContent = name;
    }

    if (elements.profileEmail) {
        elements.profileEmail.textContent = email;
    }
}


/* =========================================================
   LOAD ALL DATA
========================================================= */

async function loadAdminData() {

    await Promise.all([
        loadUsers(),
        loadBookings(),
        loadRooms()
    ]);

    updateDashboardStats();

    renderRecentBookings();

    renderRecentUsers();

    renderLibraryBookings();

    renderRoomBookings();

    renderRooms();
    renderRoomPricingFields();

    renderReports();

    renderBookingOverview();

    renderBookingTypeDistribution();
}


/* =========================================================
   LOAD USERS
========================================================= */

async function loadUsers() {

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error("Users load error:", error);

        allUsers = [];

        return;
    }

    allUsers = data || [];

    renderUsers();
}


/* =========================================================
   LOAD BOOKINGS
========================================================= */

async function loadBookings() {

    const {
        data,
        error
    } = await supabaseClient
        .from("bookings")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {

        console.error("Bookings load error:", error);

        allBookings = [];

        return;
    }

    allBookings = data || [];
}


/* =========================================================
   LOAD ROOMS
========================================================= */

async function loadRooms() {

    const {
        data,
        error
    } = await supabaseClient
        .from("rooms")
        .select("*")
        .order("room_number", {
            ascending: true
        });

    if (error) {

        console.error("Rooms load error:", error);

        allRooms = [];

        return;
    }

    allRooms = data || [];
}


/* =========================================================
   DASHBOARD STATS
========================================================= */

function updateDashboardStats() {

    const totalUsers =
        allUsers.length;

    const libraryBookings =
        allBookings.filter(
            booking =>
                String(booking.booking_type).toLowerCase()
                === "library"
        ).length;

    const roomBookings =
        allBookings.filter(
            booking =>
                String(booking.booking_type).toLowerCase()
                === "room"
        ).length;

    const availableRooms =
        allRooms.filter(
            room =>
                String(room.status).toLowerCase()
                === "available"
        ).length;


    setText(
        "totalUsers",
        totalUsers
    );

    setText(
        "totalLibraryBookings",
        libraryBookings
    );

    setText(
        "totalRoomBookings",
        roomBookings
    );

    setText(
        "availableRooms",
        availableRooms
    );
}


/* =========================================================
   BOOKING OVERVIEW CHART
========================================================= */

function renderBookingOverview() {

    const container =
        document.getElementById("chartBars");

    if (!container) {
        return;
    }

    container.innerHTML = "";


    const filter =
        document.getElementById("bookingOverviewFilter")?.value
        || "all";


    const months = getLastSixMonths();

    const monthlyData = months.map(month => {

        let library = 0;
        let room = 0;

        allBookings.forEach(booking => {

            const date =
                new Date(
                    booking.booking_date ||
                    booking.created_at
                );

            if (
                date.getMonth() === month.month &&
                date.getFullYear() === month.year
            ) {

                const type =
                    String(
                        booking.booking_type || ""
                    ).toLowerCase();

                if (type === "library") {
                    library++;
                }

                if (type === "room") {
                    room++;
                }
            }
        });


        if (filter === "library") {
            room = 0;
        }

        if (filter === "room") {
            library = 0;
        }


        return {
            ...month,
            library,
            room
        };
    });


    const maxValue =
        Math.max(
            ...monthlyData.map(
                item =>
                    Math.max(
                        item.library,
                        item.room
                    )
            ),
            1
        );


    monthlyData.forEach(item => {

        const monthElement =
            document.createElement("div");

        monthElement.className =
            "chart-month";


        const bars =
            document.createElement("div");

        bars.className =
            "chart-month-bars";


        const libraryBar =
            document.createElement("div");

        libraryBar.className =
            "chart-bar library";


        const roomBar =
            document.createElement("div");

        roomBar.className =
            "chart-bar room";


        libraryBar.style.height =
            `${Math.max(
                (item.library / maxValue) * 100,
                item.library > 0 ? 5 : 1
            )}%`;


        roomBar.style.height =
            `${Math.max(
                (item.room / maxValue) * 100,
                item.room > 0 ? 5 : 1
            )}%`;


        libraryBar.title =
            `Library: ${item.library}`;

        roomBar.title =
            `Room: ${item.room}`;


        bars.appendChild(libraryBar);
        bars.appendChild(roomBar);


        const label =
            document.createElement("span");

        label.className =
            "chart-month-label";

        label.textContent =
            item.label;


        monthElement.appendChild(bars);
        monthElement.appendChild(label);

        container.appendChild(monthElement);
    });
}


/* =========================================================
   BOOKING TYPE DISTRIBUTION
========================================================= */

function renderBookingTypeDistribution() {

    const libraryCount =
        allBookings.filter(
            booking =>
                String(booking.booking_type || "")
                .toLowerCase()
                === "library"
        ).length;


    const roomCount =
        allBookings.filter(
            booking =>
                String(booking.booking_type || "")
                .toLowerCase()
                === "room"
        ).length;


    const total =
        libraryCount +
        roomCount;


    let libraryPercentage = 0;
    let roomPercentage = 0;


    if (total > 0) {

        libraryPercentage =
            (libraryCount / total) * 100;

        roomPercentage =
            (roomCount / total) * 100;
    }


    const libraryAngle =
        libraryPercentage * 3.6;


    const donut =
        document.getElementById(
            "bookingDonutChart"
        );


    if (donut) {

        donut.style.background =
            total > 0
                ? `conic-gradient(
                    var(--primary) 0deg ${libraryAngle}deg,
                    var(--accent) ${libraryAngle}deg 360deg
                  )`
                : `conic-gradient(
                    #dfe5eb 0deg 360deg
                  )`;
    }


    setText(
        "donutTotal",
        total
    );

    setText(
        "libraryDistributionCount",
        libraryCount
    );

    setText(
        "roomDistributionCount",
        roomCount
    );

    setText(
        "libraryShare",
        `${libraryPercentage.toFixed(1)}%`
    );

    setText(
        "roomShare",
        `${roomPercentage.toFixed(1)}%`
    );
}


/* =========================================================
   RECENT BOOKINGS
========================================================= */

function renderRecentBookings() {

    const table =
        document.getElementById(
            "recentBookingsTable"
        );

    if (!table) {
        return;
    }


    const recentBookings =
        allBookings.slice(0, 8);


    if (recentBookings.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table">
                    No bookings found
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        recentBookings
            .map(booking => {

                const userName =
                    getBookingUserName(
                        booking
                    );

                const type =
                    normalizeBookingType(
                        booking.booking_type
                    );

                return `
                    <tr>

                        <td>
                            ${escapeHTML(userName)}
                        </td>

                        <td>
                            <span class="booking-type-badge ${type === "Library" ? "booking-library" : "booking-room"}">
                                ${type}
                            </span>
                        </td>

                        <td>
                            ${formatDate(
                                booking.booking_date ||
                                booking.start_date
                            )}
                        </td>

                        <td>
                            ₹${formatAmount(
                                booking.amount
                            )}
                        </td>

                        <td>
                            ${renderStatus(
                                booking.status
                            )}
                        </td>

                    </tr>
                `;
            })
            .join("");
}


/* =========================================================
   USERS
========================================================= */

function renderUsers() {

    const table =
        document.getElementById(
            "usersTable"
        );

    if (!table) {
        return;
    }


    if (allUsers.length === 0) {

        table.innerHTML = `
            <tr>
               <td colspan="6" class="empty-table">
                    No users found
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        allUsers
            .map(user => {

                const name =
                    user.name ||
                    user.email?.split("@")[0] ||
                    "User";

               const roleValue =
                   String(user.role || "user")
                       .toLowerCase();

               const isDisabled =
                   roleValue === "disabled";

               return `
                   <tr>
  
                       <td>
                           ${escapeHTML(name)}
                       </td>
  
                       <td>
                           ${escapeHTML(
                               user.email || "-"
                           )}
                       </td>
  
                       <td>
                           ${escapeHTML(
                               user.mobile || "-"
                           )}
                       </td>
  
                       <td>
                           ${renderRole(
                               user.role
                           )}
                       </td>
  
                       <td>
                           ${formatDate(
                               user.created_at
                           )}
                       </td>
  
                       <td>
                           <div style="display:flex; gap:8px; flex-wrap:wrap;">
                               <button type="button" data-user-action="view" data-user-id="${user.id}" style="padding:6px 10px; border:none; border-radius:6px; background:#315d8c; color:#fff; cursor:pointer;">View</button>
                               <button type="button" data-user-action="edit" data-user-id="${user.id}" style="padding:6px 10px; border:none; border-radius:6px; background:#c59b5d; color:#10263f; cursor:pointer;">Edit</button>
                               <button type="button" data-user-action="role" data-user-id="${user.id}" style="padding:6px 10px; border:none; border-radius:6px; background:#1e3a5f; color:#fff; cursor:pointer;">${roleValue === "admin" ? "Make User" : "Make Admin"}</button>
                               <button type="button" data-user-action="disable" data-user-id="${user.id}" style="padding:6px 10px; border:none; border-radius:6px; background:${isDisabled ? "#238b5c" : "#c94c4c"}; color:#fff; cursor:pointer;">${isDisabled ? "Enable" : "Disable"}</button>
                           </div>
                       </td>
  
                   </tr>
               `;
           })
           .join("");
}


/* =========================================================
   RECENT USERS
========================================================= */

function renderRecentUsers() {

   const table =
       document.getElementById(
           "recentUsersTable"
       );

   if (!table) {
       return;
   }


   const users =
       allUsers.slice(0, 8);


   if (users.length === 0) {

       table.innerHTML = `
           <tr>
               <td colspan="4" class="empty-table">
                   No users found
               </td>
           </tr>
       `;

       return;
   }


   table.innerHTML =
       users.map(user => {

           const name =
               user.name ||
               user.email?.split("@")[0] ||
               "User";

           return `
               <tr>

                   <td>
                       ${escapeHTML(name)}
                   </td>

                   <td>
                       ${escapeHTML(
                           user.email || "-"
                       )}
                   </td>

                   <td>
                       ${renderRole(
                           user.role
                       )}
                   </td>

                   <td>
                       ${formatDate(
                           user.created_at
                       )}
                   </td>

               </tr>
           `;
       }).join("");
}


/* =========================================================
   LIBRARY BOOKINGS
========================================================= */

function renderLibraryBookings() {

   const table =
       document.getElementById(
           "libraryBookingsTable"
        );

   if (!table) {
       return;
   }


   const bookings =
       getFilteredAdminBookings().filter(
           booking =>
               String(
                   booking.booking_type || ""
               ).toLowerCase()
               === "library"
       );


   if (bookings.length === 0) {

       table.innerHTML = `
           <tr>
               <td colspan="7" class="empty-table">
                   No library bookings found
               </td>
           </tr>
       `;

       return;
   }


   table.innerHTML =
       bookings.map(booking => {

           const name =
               getBookingUserName(
                   booking
               );

           const statusValue =
               String(booking.status || "pending")
                   .toLowerCase();

           const canApprove =
               !["active", "approved", "cancelled", "rejected"].includes(statusValue);

           return `
               <tr>

                   <td>
                       ${escapeHTML(name)}
                   </td>

                   <td>
                       ${escapeHTML(
                           booking.mobile || extractNoteValue(booking.notes, "Mobile") || "-"
                       )}
                   </td>

                   <td>
                       ${escapeHTML(
                           booking.seat_id || extractNoteValue(booking.notes, "Seat") || "-"
                       )}
                   </td>

                   <td>
                       ${formatDate(
                           booking.booking_date ||
                           booking.start_date
                       )}
                   </td>

                   <td>
                       ₹${formatAmount(
                           booking.amount
                       )}
                   </td>

                   <td>
                       ${renderStatus(
                           booking.status
                       )}
                   </td>

                   <td>
                       <div style="display:flex; gap:8px; flex-wrap:wrap;">
                           <button type="button" data-booking-action="view" data-booking-id="${booking.id}" data-booking-type="library" style="padding:6px 10px; border:none; border-radius:6px; background:#315d8c; color:#fff; cursor:pointer;">View</button>
                           ${statusValue === "cancelled" || statusValue === "rejected" ? `<button type="button" data-booking-action="activate" data-booking-id="${booking.id}" data-booking-type="library" style="padding:6px 10px; border:none; border-radius:6px; background:#238b5c; color:#fff; cursor:pointer;">Activate</button>` : canApprove ? `<button type="button" data-booking-action="approve" data-booking-id="${booking.id}" data-booking-type="library" style="padding:6px 10px; border:none; border-radius:6px; background:#238b5c; color:#fff; cursor:pointer;">Approve</button>` : `<button type="button" data-booking-action="cancel" data-booking-id="${booking.id}" data-booking-type="library" style="padding:6px 10px; border:none; border-radius:6px; background:#c94c4c; color:#fff; cursor:pointer;">Cancel</button>`}
                           <button type="button" data-booking-action="edit" data-booking-id="${booking.id}" data-booking-type="library" style="padding:6px 10px; border:none; border-radius:6px; background:#c59b5d; color:#10263f; cursor:pointer;">Edit</button>
                           <button type="button" data-booking-action="delete" data-booking-id="${booking.id}" data-booking-type="library" style="padding:6px 10px; border:none; border-radius:6px; background:#c94c4c; color:#fff; cursor:pointer;">Delete</button>
                       </div>
                   </td>

               </tr>
           `;
       }).join("");
}


/* =========================================================
   ROOM BOOKINGS
========================================================= */

function renderRoomBookings() {

   const table =
       document.getElementById(
           "roomBookingsTable"
       );

   if (!table) {
       return;
   }


   const bookings =
       getFilteredAdminBookings().filter(
           booking =>
               String(
                   booking.booking_type || ""
               ).toLowerCase()
               === "room"
       );


   if (bookings.length === 0) {

       table.innerHTML = `
           <tr>
               <td colspan="7" class="empty-table">
                   No room bookings found
               </td>
           </tr>
       `;

       return;
   }


   table.innerHTML =
       bookings.map(booking => {

           const name =
               getBookingUserName(
                   booking
               );

           const roomNumber =
               getRoomNumber(
                   booking.room_id
               );

           const statusValue =
               String(booking.status || "pending")
                   .toLowerCase();

           const canApprove =
               !["active", "approved", "cancelled", "rejected"].includes(statusValue);


           return `
               <tr>

                   <td>
                       ${escapeHTML(name)}
                   </td>

                   <td>
                       ${escapeHTML(
                           booking.mobile || extractNoteValue(booking.notes, "Mobile") || "-"
                       )}
                   </td>

                   <td>
                       ${escapeHTML(
                           roomNumber
                       )}
                   </td>

                   <td>
                       ${formatDate(
                           booking.booking_date ||
                           booking.start_date
                       )}
                   </td>

                   <td>
                       ₹${formatAmount(
                           booking.amount
                       )}
                   </td>

                   <td>
                       ${renderStatus(
                           booking.status
                       )}
                   </td>

                   <td>
                       <div style="display:flex; gap:8px; flex-wrap:wrap;">
                           <button type="button" data-booking-action="view" data-booking-id="${booking.id}" data-booking-type="room" style="padding:6px 10px; border:none; border-radius:6px; background:#315d8c; color:#fff; cursor:pointer;">View</button>
                           ${statusValue === "cancelled" || statusValue === "rejected" ? `<button type="button" data-booking-action="activate" data-booking-id="${booking.id}" data-booking-type="room" style="padding:6px 10px; border:none; border-radius:6px; background:#238b5c; color:#fff; cursor:pointer;">Activate</button>` : canApprove ? `<button type="button" data-booking-action="approve" data-booking-id="${booking.id}" data-booking-type="room" style="padding:6px 10px; border:none; border-radius:6px; background:#238b5c; color:#fff; cursor:pointer;">Approve</button>` : `<button type="button" data-booking-action="cancel" data-booking-id="${booking.id}" data-booking-type="room" style="padding:6px 10px; border:none; border-radius:6px; background:#c94c4c; color:#fff; cursor:pointer;">Cancel</button>`}
                           <button type="button" data-booking-action="edit" data-booking-id="${booking.id}" data-booking-type="room" style="padding:6px 10px; border:none; border-radius:6px; background:#c59b5d; color:#10263f; cursor:pointer;">Edit</button>
                           <button type="button" data-booking-action="delete" data-booking-id="${booking.id}" data-booking-type="room" style="padding:6px 10px; border:none; border-radius:6px; background:#c94c4c; color:#fff; cursor:pointer;">Delete</button>
                       </div>
                   </td>

               </tr>
           `;
       }).join("");
}


function getFilteredAdminBookings() {
    const search = String(document.getElementById("bookingSearchFilter")?.value || "").trim().toLowerCase();
    const type = document.getElementById("bookingTypeFilter")?.value || "all";
    const status = document.getElementById("bookingStatusFilter")?.value || "all";
    const date = document.getElementById("bookingDateFilter")?.value || "";

    return allBookings.filter(booking => {
        const bookingType = String(booking.booking_type || "").toLowerCase();
        const bookingStatus = String(booking.status || "pending").toLowerCase();
        const bookingDate = String(booking.booking_date || booking.start_date || "").slice(0, 10);
        const user = allUsers.find(item => String(item.id) === String(booking.user_id));
        const haystack = [
            booking.id,
            booking.user_id,
            booking.user_name,
            user?.name,
            user?.email,
            booking.mobile,
            booking.notes
        ].join(" ").toLowerCase();

        return (!search || haystack.includes(search))
            && (type === "all" || bookingType === type)
            && (status === "all" || bookingStatus === status)
            && (!date || bookingDate === date);
    });
}


function setupBookingFilters() {
    [
        "bookingSearchFilter",
        "bookingTypeFilter",
        "bookingStatusFilter",
        "bookingDateFilter"
    ].forEach(id => {
        document.getElementById(id)?.addEventListener("input", () => {
            renderLibraryBookings();
            renderRoomBookings();
        });
    });

    document.getElementById("clearBookingFilters")?.addEventListener("click", () => {
        ["bookingSearchFilter", "bookingTypeFilter", "bookingStatusFilter", "bookingDateFilter"]
            .forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = element.type === "search" ? "" : "all";
                }
            });
        const dateFilter = document.getElementById("bookingDateFilter");
        if (dateFilter) {
            dateFilter.value = "";
        }
        renderLibraryBookings();
        renderRoomBookings();
    });
}


/* =========================================================
   ROOMS
========================================================= */

function renderRooms() {

   const table =
       document.getElementById(
           "roomsTable"
       );

   if (!table) {
       return;
   }


   if (allRooms.length === 0) {

       table.innerHTML = `
           <tr>
               <td colspan="6" class="empty-table">
                   No rooms found
               </td>
           </tr>
       `;

       return;
   }


   table.innerHTML =
       allRooms.map(room => {

           const nextRoomStatus =
               String(room.status || "available")
                   .toLowerCase() === "available"
                   ? "occupied"
                   : "available";

           return `
               <tr>

                   <td>
                       ${escapeHTML(
                           room.room_number || "-"
                       )}
                   </td>

                   <td>
                       ${escapeHTML(
                           room.room_type || "-"
                       )}
                   </td>

                   <td>
                       ${escapeHTML(
                           room.capacity || "-"
                       )}
                   </td>

                   <td>
                       ₹${formatAmount(
                           room.monthly_rent
                       )}
                   </td>

                   <td>
                       ${renderRoomStatus(
                           room.status
                       )}
                   </td>

                   <td>
                       <div style="display:flex; gap:8px; flex-wrap:wrap;">
                           <button type="button" data-room-action="edit" data-room-id="${room.id}" style="padding:6px 10px; border:none; border-radius:6px; background:#315d8c; color:#fff; cursor:pointer;">Edit</button>
                           <button type="button" data-room-action="status" data-room-id="${room.id}" data-room-status="${nextRoomStatus}" style="padding:6px 10px; border:none; border-radius:6px; background:#1e3a5f; color:#fff; cursor:pointer;">${nextRoomStatus === "available" ? "Set Available" : "Set Occupied"}</button>
                           <button type="button" data-room-action="delete" data-room-id="${room.id}" style="padding:6px 10px; border:none; border-radius:6px; background:#c94c4c; color:#fff; cursor:pointer;">Delete</button>
                       </div>
                   </td>

               </tr>
           `;
       }).join("");
}


/* =========================================================
   REPORTS
========================================================= */

function getReportBookingData() {

    const startDateValue =
        document.getElementById("reportStartDate")?.value || "";

    const endDateValue =
        document.getElementById("reportEndDate")?.value || "";

    const filtered = allBookings.filter(booking => {

        const rawDate =
            booking.booking_date ||
            booking.created_at ||
            booking.start_date;

        if (!rawDate) {
            return true;
        }

        const current = new Date(rawDate);

        if (Number.isNaN(current.getTime())) {
            return true;
        }

        if (startDateValue) {
            const start = new Date(startDateValue);
            if (current < start) {
                return false;
            }
        }

        if (endDateValue) {
            const end = new Date(endDateValue);
            end.setHours(23, 59, 59, 999);
            if (current > end) {
                return false;
            }
        }

        return true;
    });

    return filtered;
}


function renderReports() {

    const filteredBookings =
        getReportBookingData();

    const libraryCount =
        filteredBookings.filter(
            booking =>
                String(
                    booking.booking_type || ""
                ).toLowerCase()
                === "library"
        ).length;


    const roomCount =
        filteredBookings.filter(
            booking =>
                String(
                    booking.booking_type || ""
                ).toLowerCase()
                === "room"
        ).length;


    const availableRooms =
        allRooms.filter(
            room =>
                String(
                    room.status || ""
                ).toLowerCase()
                === "available"
        ).length;


    setText(
        "reportUsers",
        allUsers.length
    );

    setText(
        "reportBookings",
        filteredBookings.length
    );

    setText(
        "reportLibraryBookings",
        libraryCount
    );

    setText(
        "reportRoomBookings",
        roomCount
    );

    setText(
        "reportAvailableRooms",
        availableRooms
    );
}


function exportReportCsv() {

    const rows = getReportBookingData();

    const csvRows = [
        [
            "Booking ID",
            "User",
            "Type",
            "Date",
            "Amount",
            "Status",
            "Room / Seat"
        ]
    ];

    rows.forEach(booking => {
        csvRows.push([
            booking.id || "",
            getBookingUserName(booking),
            normalizeBookingType(booking.booking_type),
            booking.booking_date || booking.start_date || "",
            Number(booking.amount || 0),
            booking.status || "",
            booking.room_id || booking.seat_id || ""
        ]);
    });

    const csvContent = csvRows.map(row =>
        row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "raj-library-report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            ".admin-nav-item"
        );


    navItems.forEach(item => {

        item.addEventListener(
            "click",
            () => {

                const section =
                    item.dataset.section;

                openSection(section);

            }
        );
    });
}


function openSection(sectionName) {

    const sections =
        document.querySelectorAll(
            ".admin-section"
        );


    const navItems =
        document.querySelectorAll(
            ".admin-nav-item"
        );


    sections.forEach(section => {

        section.classList.remove(
            "active"
        );

    });


    navItems.forEach(item => {

        item.classList.remove(
            "active"
        );

    });


    const targetSection =
        document.getElementById(
            `${sectionName}Section`
        );


    const targetNav =
        document.querySelector(
            `.admin-nav-item[data-section="${sectionName}"]`
        );


    if (targetSection) {

        targetSection.classList.add(
            "active"
        );
    }


    if (targetNav) {

        targetNav.classList.add(
            "active"
        );
    }


    const titleMap = {

        dashboard:
            "Dashboard",

        users:
            "Users",

        libraryBookings:
            "Library Bookings",

        roomBookings:
            "Room Bookings",

        rooms:
            "Rooms",

        reports:
            "Reports",

        settings:
            "Settings",

        profile:
            "Profile"

    };


    setText(
        "adminPageTitle",
        titleMap[sectionName] ||
        "Dashboard"
    );


    if (
        window.innerWidth <= 900
    ) {

        document
            .getElementById(
                "adminSidebar"
            )
            ?.classList.remove(
                "open"
            );
    }
}


/* =========================================================
   QUICK ACTIONS
========================================================= */

function setupQuickActions() {

    document
        .querySelectorAll(
            "[data-open-section]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openSection(
                        button.dataset.openSection
                    );

                }
            );
        });
}


/* =========================================================
   SIDEBAR
========================================================= */

function setupSidebar() {

    const toggle =
        document.getElementById(
            "sidebarToggle"
        );

    const sidebar =
        document.getElementById(
            "adminSidebar"
        );

    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );

    const closeButton =
        document.getElementById(
            "adminSidebarClose"
        );


    if (!toggle || !sidebar) {
        return;
    }

    const closeSidebar = () => {
        sidebar.classList.remove("open");
        overlay?.classList.remove("visible");
        toggle.setAttribute("aria-expanded", "false");
    };


    toggle.addEventListener(
        "click",
        () => {

            const isOpen = sidebar.classList.toggle("open");
            overlay?.classList.toggle("visible", isOpen);
            toggle.setAttribute("aria-expanded", String(isOpen));

        }
    );

    overlay?.addEventListener("click", closeSidebar);
    closeButton?.addEventListener("click", closeSidebar);

    sidebar.querySelectorAll(".admin-nav-item, .admin-home-link").forEach(link => {
        link.addEventListener("click", closeSidebar);
    });
}

function setupAdminThemeToggle() {
    const toggle = document.getElementById("adminThemeToggle");

    if (!toggle) {
        return;
    }

    const savedTheme = localStorage.getItem("rajLibraryTheme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
        toggle.checked = true;
    }

    toggle.addEventListener("change", () => {
        const isDark = toggle.checked;
        document.body.classList.toggle("dark-theme", isDark);
        localStorage.setItem("rajLibraryTheme", isDark ? "dark" : "light");
    });
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function setupNotifications() {

    const button =
        document.getElementById(
            "notificationButton"
        );

    const panel =
        document.getElementById(
            "notificationPanel"
        );


    if (!button || !panel) {
        return;
    }

    function renderAdminNotifications() {
        const panel = document.getElementById("notificationPanel");
        const countElements = document.querySelectorAll(".notification-count, .notification-panel-header span");
        if (!panel) {
            return;
        }

        const items = adminNotificationItems.slice(0, 10);
        const header = `
            <div class="notification-panel-header">
                <strong>Notifications</strong>
                <span>${items.length}</span>
            </div>
        `;
        panel.innerHTML = header + (items.length
            ? items.map(item => `
                <div class="notification-item">
                    <strong>${escapeHTML(item.title)}</strong>
                    <span>${escapeHTML(item.message)}</span>
                </div>
            `).join("")
            : `<div class="notification-item"><span>No new notifications.</span></div>`);

        countElements.forEach(element => {
            element.textContent = String(items.length);
            element.style.display = items.length ? "flex" : "none";
        });
    }

    function addAdminNotification(title, message) {
        adminNotificationItems.unshift({
            title,
            message,
            createdAt: Date.now()
        });
        renderAdminNotifications();
    }

    function setupAdminRealtimeNotifications() {
        if (!currentAdmin || adminRealtimeChannel) {
            return;
        }

        adminRealtimeChannel = supabaseClient
            .channel("admin-live-updates")
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "bookings"
            }, async payload => {
                const booking = payload.new || payload.old || {};
                const type = String(booking.booking_type || "booking").toLowerCase();
                const action = payload.eventType === "INSERT"
                    ? "New"
                    : payload.eventType === "UPDATE" ? "Updated" : "Deleted";
                addAdminNotification(
                    `${action} ${type} booking`,
                    "Booking data changed. The dashboard is refreshing."
                );
                await loadAdminData();
            })
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "profiles"
            }, async payload => {
                addAdminNotification(
                    payload.eventType === "INSERT" ? "New user registered" : "User profile updated",
                    "User management data changed."
                );
                await loadAdminData();
            })
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "rooms"
            }, async payload => {
                addAdminNotification("Room data updated", "Room availability or details changed.");
                await loadAdminData();
            })
            .subscribe(status => {
                if (status === "CHANNEL_ERROR") {
                    console.error("Admin realtime subscription failed.");
                }
            });
    }


    button.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            panel.classList.toggle(
                "show"
            );

        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                !panel.contains(event.target) &&
                !button.contains(event.target)
            ) {

                panel.classList.remove(
                    "show"
                );
            }
        }
    );

    renderAdminNotifications();
    setupAdminRealtimeNotifications();
}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    const searchInput =
        document.getElementById(
            "adminSearch"
        );

    const searchButton =
        document.getElementById(
            "searchButton"
        );


    const performSearch = () => {

        const value =
            searchInput?.value
                .trim()
                .toLowerCase();


        if (!value) {
            return;
        }


        const matchingUsers =
            allUsers.filter(user => {

                const name =
                    String(
                        user.name || ""
                    ).toLowerCase();

                const email =
                    String(
                        user.email || ""
                    ).toLowerCase();

                const mobile =
                    String(
                        user.mobile || ""
                    ).toLowerCase();


                return (
                    name.includes(value) ||
                    email.includes(value) ||
                    mobile.includes(value)
                );
            });


        const matchingBookings =
            allBookings.filter(booking => {

                const name =
                    String(
                        getBookingUserName(
                            booking
                        )
                    ).toLowerCase();


                return (
                    name.includes(value) ||
                    String(
                        booking.booking_type || ""
                    )
                    .toLowerCase()
                    .includes(value)
                );
            });


        openSection("users");

        renderFilteredUsers(
            matchingUsers,
            matchingBookings.length
        );
    };


    searchButton?.addEventListener(
        "click",
        performSearch
    );


    searchInput?.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {
                performSearch();
            }
        }
    );
}


function renderFilteredUsers(
    users,
    bookingMatchCount
) {

    const table =
        document.getElementById(
            "usersTable"
        );


    if (!table) {
        return;
    }


    if (users.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table">
                    No matching users found.
                    Matching bookings: ${bookingMatchCount}
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        users.map(user => {

            const name =
                user.name ||
                user.email?.split("@")[0] ||
                "User";

            const roleValue =
                String(user.role || "user")
                    .toLowerCase();

            const isDisabled =
                roleValue === "disabled";


            return `
                <tr>
 
                    <td>
                        ${escapeHTML(name)}
                    </td>
 
                    <td>
                        ${escapeHTML(
                            user.email || "-"
                        )}
                    </td>
 
                    <td>
                        ${escapeHTML(
                            user.mobile || "-"
                        )}
                    </td>
 
                    <td>
                        ${renderRole(
                            user.role
                        )}
                    </td>
 
                    <td>
                        ${formatDate(
                            user.created_at
                        )}
                    </td>
 
                    <td>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button type="button" data-user-action="view" data-user-id="${user.id}" style="padding:6px 10px; border:none; border-radius:6px; background:#315d8c; color:#fff; cursor:pointer;">View</button>
                            <button type="button" data-user-action="edit" data-user-id="${user.id}" style="padding:6px 10px; border:none; border-radius:6px; background:#c59b5d; color:#10263f; cursor:pointer;">Edit</button>
                            <button type="button" data-user-action="role" data-user-id="${user.id}" style="padding:6px 10px; border:none; border-radius:6px; background:#1e3a5f; color:#fff; cursor:pointer;">${roleValue === "admin" ? "Make User" : "Make Admin"}</button>
                            <button type="button" data-user-action="disable" data-user-id="${user.id}" style="padding:6px 10px; border:none; border-radius:6px; background:${isDisabled ? "#238b5c" : "#c94c4c"}; color:#fff; cursor:pointer;">${isDisabled ? "Enable" : "Disable"}</button>
                        </div>
                    </td>
 
                </tr>
            `;
        }).join("");
}


/* =========================================================
   SETTINGS
========================================================= */

function setupSettings() {

    const autoRefresh =
        document.getElementById(
            "autoRefreshToggle"
        );

    const notificationToggle =
        document.getElementById(
            "notificationToggle"
        );


    autoRefresh?.addEventListener(
        "change",
        () => {

            if (autoRefresh.checked) {

                startAutoRefresh();

            } else {

                stopAutoRefresh();

            }
        }
    );


    notificationToggle?.addEventListener(
        "change",
        () => {

            const button =
                document.getElementById(
                    "notificationButton"
                );

            if (!button) {
                return;
            }

            button.style.display =
                notificationToggle.checked
                    ? "block"
                    : "none";
        }
    );


    document
        .getElementById(
            "bookingOverviewFilter"
        )
        ?.addEventListener(
            "change",
            renderBookingOverview
        );
}


function setupAdminActionHandlers() {

   document.addEventListener(
       "click",
       async event => {

           const target =
               event.target instanceof Element
                   ? event.target
                   : event.target.parentElement;

           const closeButton =
               target?.closest(
                   "[data-close-admin-modal]"
               );

           if (closeButton) {
               closeAdminModal();
               return;
           }

           const userActionTarget =
               target?.closest(
                   "[data-user-action]"
               );

           if (userActionTarget) {
               await handleUserAction(
                   userActionTarget
               );
               return;
           }

           const bookingActionTarget =
               target?.closest(
                   "[data-booking-action]"
               );

           if (bookingActionTarget) {
               await handleBookingAction(
                   bookingActionTarget
               );
               return;
           }

           const roomActionTarget =
               target?.closest(
                   "[data-room-action]"
               );

           if (roomActionTarget) {
               await handleRoomAction(
                   roomActionTarget
               );
           }
       }
   );

   document.addEventListener(
       "submit",
       async event => {

           const form =
               event.target.closest(
                   "[data-admin-form]"
               );

           if (!form) {
               return;
           }

           event.preventDefault();

           if (
               form.dataset.adminForm === "user"
           ) {
               await saveUserUpdate(form);
               return;
           }

           if (
               form.dataset.adminForm === "booking"
           ) {
               await saveBookingUpdate(form);
               return;
           }

           if (
               form.dataset.adminForm === "room"
           ) {
               await saveRoomUpdate(form);
               return;
           }

           if (
               form.dataset.adminForm === "profile"
           ) {
               await saveAdminProfile(form);
           }
       }
   );

   document
       .getElementById("addRoomBtn")
       ?.addEventListener(
           "click",
           () => openRoomModal()
       );
}


function setupReportsControls() {

   const startDateInput =
       document.getElementById(
           "reportStartDate"
       );

   const endDateInput =
       document.getElementById(
           "reportEndDate"
       );

   const exportBtn =
       document.getElementById(
           "reportExportBtn"
       );

   const sync = () => {
       renderReports();
   };

   startDateInput?.addEventListener(
       "change",
       sync
   );

   endDateInput?.addEventListener(
       "change",
       sync
   );

   exportBtn?.addEventListener(
       "click",
       exportReportCsv
   );
}


function setupAdminProfileControls() {

   document
       .getElementById("editAdminProfileBtn")
       ?.addEventListener(
           "click",
           openAdminProfileEditor
       );
}


function setupPricingControls() {
    document
        .getElementById("bookingPricingForm")
        ?.addEventListener("submit", saveLibraryPrices);
    document
        .getElementById("roomPricingForm")
        ?.addEventListener("submit", saveRoomPrices);
}


function renderRoomPricingFields() {
    const container = document.getElementById("roomPricingFields");
    if (!container) {
        return;
    }

    if (!allRooms.length) {
        container.innerHTML = '<span style="color:#6b7280;">No rooms found.</span>';
        return;
    }

    container.innerHTML = allRooms.map(room => `
        <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
            Room ${escapeHTML(room.room_number || room.id)}
            <input name="room_${escapeHTML(room.id)}" data-room-price-id="${escapeHTML(room.id)}" type="number" min="0" required value="${Number(room.monthly_rent || 0)}" style="width:130px; padding:8px 10px; border:1px solid #d9e0e8; border-radius:8px;">
        </label>
    `).join("");
}


async function saveRoomPrices(event) {
    event.preventDefault();

    const inputs = event.target.querySelectorAll("[data-room-price-id]");
    if (!inputs.length) {
        alert("No rooms available to update.");
        return;
    }

    try {
        for (const input of inputs) {
            const monthlyRent = Number(input.value);
            if (!Number.isFinite(monthlyRent) || monthlyRent < 0) {
                throw new Error("Please enter valid non-negative room rents.");
            }

            const { error } = await supabaseClient
                .from("rooms")
                .update({ monthly_rent: monthlyRent })
                .eq("id", input.dataset.roomPriceId);

            if (error) {
                throw error;
            }
        }

        await loadAdminData();
        renderRoomPricingFields();
        alert("Room rent prices updated.");
    } catch (error) {
        console.error("Room rent update error:", error);
        alert(`Unable to save room rents: ${error.message || "Please try again."}`);
    }
}


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
            const stored = typeof data.value === "string"
                ? JSON.parse(data.value)
                : data.value;
            libraryPrices = { ...defaultLibraryPrices, ...stored };
        }
    } catch (error) {
        console.warn("Library prices could not be loaded; using defaults.", error);
    }

    ["shift1", "shift2", "shift3", "shift4"].forEach(shift => {
        const input = document.getElementById(`price${shift.charAt(0).toUpperCase()}${shift.slice(1)}`);
        if (input) {
            input.value = libraryPrices[shift];
        }
    });
}


async function saveLibraryPrices(event) {
    event.preventDefault();

    const nextPrices = {};
    ["shift1", "shift2", "shift3", "shift4"].forEach(shift => {
        nextPrices[shift] = Number(event.target.elements[shift].value);
    });

    if (Object.values(nextPrices).some(value => !Number.isFinite(value) || value < 0)) {
        alert("Please enter valid non-negative prices.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from("app_settings")
            .upsert({
                key: "library_prices",
                value: nextPrices,
                updated_by: currentAdmin.id,
                updated_at: new Date().toISOString()
            }, { onConflict: "key" });

        if (error) {
            throw error;
        }

        libraryPrices = nextPrices;
        alert("Library booking prices updated.");
    } catch (error) {
        console.error("Library price update error:", error);
        alert("Unable to save prices. Please create the app_settings table first.");
    }
}


function ensureAdminModal() {

   let modal =
       document.getElementById(
           "adminActionModal"
       );

   if (modal) {
       return modal;
   }

   modal = document.createElement("div");
   modal.id = "adminActionModal";
   modal.style.position = "fixed";
   modal.style.inset = "0";
   modal.style.background = "rgba(15, 30, 50, 0.6)";
   modal.style.display = "none";
   modal.style.alignItems = "center";
   modal.style.justifyContent = "center";
   modal.style.padding = "20px";
   modal.style.zIndex = "2000";

   const content = document.createElement("div");
   content.style.width = "100%";
   content.style.maxWidth = "620px";
   content.style.background = "#fff";
   content.style.borderRadius = "14px";
   content.style.boxShadow = "0 20px 60px rgba(15, 30, 50, 0.18)";
   content.style.padding = "24px";
   content.style.maxHeight = "90vh";
   content.style.overflowY = "auto";

   const header = document.createElement("div");
   header.style.display = "flex";
   header.style.alignItems = "center";
   header.style.justifyContent = "space-between";
   header.style.marginBottom = "20px";
   header.innerHTML = `
       <h3 id="adminModalTitle" style="margin:0; color:#1e3a5f; font-size:22px;">Details</h3>
       <button type="button" data-close-admin-modal style="padding:8px 12px; border:none; border-radius:8px; background:#eef2f6; color:#1e3a5f; cursor:pointer; font-weight:700;">Close</button>
   `;

   const body = document.createElement("div");
   body.id = "adminModalBody";

   content.appendChild(header);
   content.appendChild(body);
   modal.appendChild(content);
   modal.addEventListener(
       "click",
       event => {
           if (event.target === modal) {
               closeAdminModal();
           }
       }
   );

   document.body.appendChild(modal);
   return modal;
}


function showAdminModal(title, htmlContent) {

   const modal = ensureAdminModal();
   const titleEl =
       document.getElementById(
           "adminModalTitle"
       );
   const bodyEl =
       document.getElementById(
           "adminModalBody"
       );

   if (titleEl) {
       titleEl.textContent = title;
   }

   if (bodyEl) {
       bodyEl.innerHTML = htmlContent;
   }

   modal.style.display = "flex";
}


function closeAdminModal() {

   const modal =
       document.getElementById(
           "adminActionModal"
       );

   if (modal) {
       modal.style.display = "none";
   }
}


async function handleUserAction(button) {

   const userId = button.dataset.userId;
   const action = button.dataset.userAction;
   const user = allUsers.find(item => String(item.id) === String(userId));

   if (!user) {
       alert("User data is not available. Please refresh the dashboard.");
       return;
   }

   if (action === "view" || action === "edit") {
       openUserModal(user, action === "edit" ? "edit" : "view");
       return;
   }

   if (currentAdmin && currentAdmin.id === userId) {
       alert("You cannot change your own admin access from here.");
       return;
   }

   if (action === "role") {
       const nextRole =
           String(user.role || "user")
               .toLowerCase() === "admin"
               ? "user"
               : "admin";

       await updateUserRole(userId, nextRole);
       return;
   }

   if (action === "disable") {
       const nextRole =
           String(user.role || "user")
               .toLowerCase() === "disabled"
               ? "user"
               : "disabled";

       await updateUserRole(userId, nextRole);
   }
}


async function handleBookingAction(button) {

   const bookingId = button.dataset.bookingId;
   const bookingType = button.dataset.bookingType;
   const action = button.dataset.bookingAction;
   const booking = allBookings.find(item => String(item.id) === String(bookingId));

   if (!booking) {
       alert("Booking data is not available. Please refresh the dashboard.");
       return;
   }

   if (action === "approve" || action === "activate") {
       await updateBookingStatus(
           bookingId,
           "active"
       );
       return;
   }

   if (action === "cancel") {
       await updateBookingStatus(
           bookingId,
           "cancelled"
       );
       return;
   }

   if (action === "delete") {
       const confirmed =
           confirm(
               "Are you sure you want to delete this booking?"
           );

       if (!confirmed) {
           return;
       }

       await deleteBooking(bookingId);
       return;
   }

   if (action === "view" || action === "edit") {
       openBookingModal(booking, action === "edit" ? "edit" : "view");
   }
}


async function handleRoomAction(button) {

   const roomId = button.dataset.roomId;
   const action = button.dataset.roomAction;
   const room = allRooms.find(item => String(item.id) === String(roomId));

   if (!room && action !== "add") {
       alert("Room data is not available. Please refresh the dashboard.");
       return;
   }

   if (action === "edit") {
       openRoomModal(room);
       return;
   }

   if (action === "status") {
       const nextStatus =
           button.dataset.roomStatus || "available";

       await updateRoomStatus(roomId, nextStatus);
       return;
   }

   if (action === "delete") {
       const confirmed =
           confirm(
               "Are you sure you want to delete this room?"
           );

       if (!confirmed) {
           return;
       }

       await deleteRoom(roomId);
   }
}


async function updateUserRole(userId, nextRole) {

   try {

       const {
           error
       } = await supabaseClient
           .from("profiles")
           .update({
               role: nextRole
           })
           .eq("id", userId);

       if (error) {
           throw error;
       }

       await loadAdminData();

   } catch (error) {
       console.error("Role update error:", error);
       alert("Unable to update user role.");
   }
}


async function updateBookingStatus(bookingId, newStatus) {
   try {
       const booking = allBookings.find(item => String(item.id) === String(bookingId));
       if (
           String(booking?.booking_type || "").toLowerCase() === "library" &&
           ["active", "approved"].includes(newStatus)
       ) {
           let seatId = booking.seat_id;
           let availableSeats = seatId ? [{ id: seatId }] : null;
           let seatError = null;
           if (!seatId) {
               const result = await supabaseClient
                   .from("library_seats")
                   .select("id")
                   .eq("status", "available")
                   .eq("shift_id", booking.shift_id)
                   .limit(1);
               availableSeats = result.data;
               seatError = result.error;
           }

           if (seatError) {
               throw seatError;
           }
           if (!availableSeats?.length) {
               throw new Error("No available seat remains for this shift.");
           }

           const { data: claimedSeats, error: seatUpdateError } = await supabaseClient
               .from("library_seats")
               .update({ status: "occupied" })
               .eq("id", availableSeats[0].id)
               .eq("status", "available")
               .select("id");

           if (seatUpdateError) {
               throw seatUpdateError;
           }
           if (!claimedSeats?.length) {
               throw new Error("That seat was just assigned. Please refresh and try again.");
           }

           if (!booking.seat_id) {
               const { error: bookingSeatError } = await supabaseClient
                   .from("bookings")
                   .update({ seat_id: availableSeats[0].id })
                   .eq("id", bookingId);
               if (bookingSeatError) {
                   throw bookingSeatError;
               }
           }
       }

       const {
           error
       } = await supabaseClient
           .from("bookings")
           .update({
               status: newStatus
           })
           .eq("id", bookingId);

       if (error) {
           throw error;
       }

       if (String(booking?.booking_type || "").toLowerCase() === "room" && booking.room_id) {
           const roomStatus = newStatus === "active" || newStatus === "approved"
               ? "occupied"
               : newStatus === "cancelled" || newStatus === "rejected"
                   ? "available"
                   : null;

           if (roomStatus) {
               const { error: roomError } = await supabaseClient
                   .from("rooms")
                   .update({ status: roomStatus })
                   .eq("id", booking.room_id);

               if (roomError) {
                   throw roomError;
               }
           }
       }
       if (
           String(booking?.booking_type || "").toLowerCase() === "library" &&
           booking.seat_id &&
           ["cancelled", "rejected"].includes(newStatus)
       ) {
           const { error: seatError } = await supabaseClient
               .from("library_seats")
               .update({ status: "available" })
               .eq("id", booking.seat_id);
           if (seatError) {
               throw seatError;
           }
       }

       await loadAdminData();

   } catch (error) {
       console.error("Booking status update error:", error);
       alert(`Unable to update booking status: ${error.message || "Please try again."}`);
   }
}


function openBookingModal(booking, mode) {

   const userName = getBookingUserName(booking);
   const roomName = getRoomNumber(booking.room_id);
   const typeLabel = normaliseBookingTypeForDisplay(booking.booking_type);
   const bookingDate =
       booking.booking_date || booking.start_date || "";
   const notesValue = booking.notes || "";
   const userEditCount = Number(booking.edit_count || extractBookingEditCount(notesValue));

   const submitButton =
       mode === "edit"
           ? '<button type="submit" style="padding:10px 18px; border:none; border-radius:8px; background:#1e3a5f; color:#fff; cursor:pointer; font-weight:700;">Save Changes</button>'
           : '';

   const html = `
       <div style="display:grid; gap:14px;">
           <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
               <div><strong>User</strong><div>${escapeHTML(userName)}</div></div>
               <div><strong>User ID</strong><div>${escapeHTML(booking.user_id || "-")}</div></div>
               <div><strong>Mobile</strong><div>${escapeHTML(booking.mobile || extractNoteValue(notesValue, "Mobile") || "-")}</div></div>
               <div><strong>Type</strong><div>${escapeHTML(typeLabel)}</div></div>
               <div><strong>Room / Seat</strong><div>${escapeHTML(roomName || booking.seat_id || "-")}</div></div>
               <div><strong>Created</strong><div>${escapeHTML(formatDate(booking.created_at))}</div></div>
               <div><strong>User edits</strong><div>${userEditCount} / 1</div></div>
           </div>
           <div style="padding:12px;border:1px solid #e5eaf0;border-radius:8px;background:#f8fafc;">
               <strong>Additional details</strong>
               <pre style="white-space:pre-wrap;margin:8px 0 0;font:inherit;">${escapeHTML(notesValue || "No additional details")}</pre>
           </div>
           <details>
               <summary style="cursor:pointer;color:#1e3a5f;font-weight:700;">View all stored booking data</summary>
               <pre style="white-space:pre-wrap;margin:10px 0 0;padding:12px;background:#f8fafc;border:1px solid #e5eaf0;border-radius:8px;font:12px/1.5 monospace;">${escapeHTML(JSON.stringify(booking, null, 2))}</pre>
           </details>

           <form data-admin-form="booking" data-booking-id="${booking.id}" style="display:grid; gap:14px;">
               <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
                   <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
                       Status
                       <select name="status" ${mode === "view" ? "disabled" : ""} style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;">
                           <option value="pending" ${String(booking.status || "pending").toLowerCase() === "pending" ? "selected" : ""}>Pending</option>
                           <option value="active" ${String(booking.status || "pending").toLowerCase() === "active" ? "selected" : ""}>Active</option>
                           <option value="cancelled" ${String(booking.status || "pending").toLowerCase() === "cancelled" ? "selected" : ""}>Cancelled</option>
                           <option value="approved" ${String(booking.status || "pending").toLowerCase() === "approved" ? "selected" : ""}>Approved</option>
                           <option value="rejected" ${String(booking.status || "pending").toLowerCase() === "rejected" ? "selected" : ""}>Rejected</option>
                       </select>
                   </label>

                   <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
                       Amount
                       <input type="number" name="amount" value="${Number(booking.amount || 0)}" ${mode === "view" ? "disabled" : ""} style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;" />
                   </label>

                   <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
                       Booking Date
                       <input type="date" name="booking_date" value="${bookingDate ? bookingDate.slice(0, 10) : ""}" ${mode === "view" ? "disabled" : ""} style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;" />
                   </label>
               </div>

               <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
                   Notes
                   <textarea name="notes" ${mode === "view" ? "disabled" : ""} rows="4" style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px; resize:vertical;">${escapeHTML(notesValue)}</textarea>
               </label>

               <div style="display:flex; justify-content:flex-end; gap:10px;">
                   ${submitButton}
                   <button type="button" data-close-admin-modal style="padding:10px 16px; border:none; border-radius:8px; background:#eef2f6; color:#1e3a5f; cursor:pointer; font-weight:700;">Close</button>
               </div>
           </form>
       </div>
   `;

   showAdminModal(
       mode === "edit" ? "Edit Booking" : "Booking Details",
       html
   );
}


async function saveBookingUpdate(form) {

   const bookingId = form.dataset.bookingId;
   const status = form.elements.status.value;
   const amount = Number(form.elements.amount.value || 0);
   const bookingDate = form.elements.booking_date.value;
   const notes = form.elements.notes.value;

   try {

       const payload = {
           status,
           amount,
           notes
       };

       if (bookingDate) {
           payload.booking_date = bookingDate;
       }

       const {
           error
       } = await supabaseClient
           .from("bookings")
           .update(payload)
           .eq("id", bookingId);

       if (error) {
           throw error;
       }

       closeAdminModal();
       await loadAdminData();

   } catch (error) {
       console.error("Booking edit error:", error);
       alert(`Unable to update booking details: ${error.message || "Please try again."}`);
   }
}


function openRoomModal(room = null) {

   const isEdit = Boolean(room);
   const title = isEdit ? "Edit Room" : "Add Room";

   const html = `
       <form data-admin-form="room" data-room-id="${room ? room.id : ""}" style="display:grid; gap:14px;">
           <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
               <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
                   Room Number
                   <input type="text" name="room_number" value="${escapeHTML(room?.room_number || "")}" required style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;" />
               </label>

               <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
                   Room Type
                   <input type="text" name="room_type" value="${escapeHTML(room?.room_type || "")}" required style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;" />
               </label>

               <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
                   Capacity
                   <input type="number" name="capacity" value="${Number(room?.capacity || 0)}" required style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;" />
               </label>

               <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
                   Monthly Rent
                   <input type="number" name="monthly_rent" value="${Number(room?.monthly_rent || 0)}" required style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;" />
               </label>
           </div>

           <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
               Status
               <select name="status" style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;">
                   <option value="available" ${String(room?.status || "available").toLowerCase() === "available" ? "selected" : ""}>Available</option>
                   <option value="occupied" ${String(room?.status || "available").toLowerCase() === "occupied" ? "selected" : ""}>Occupied</option>
                   <option value="maintenance" ${String(room?.status || "available").toLowerCase() === "maintenance" ? "selected" : ""}>Maintenance</option>
               </select>
           </label>

           <div style="display:flex; justify-content:flex-end; gap:10px;">
               <button type="submit" style="padding:10px 18px; border:none; border-radius:8px; background:#1e3a5f; color:#fff; cursor:pointer; font-weight:700;">${isEdit ? "Update Room" : "Add Room"}</button>
               <button type="button" data-close-admin-modal style="padding:10px 16px; border:none; border-radius:8px; background:#eef2f6; color:#1e3a5f; cursor:pointer; font-weight:700;">Close</button>
           </div>
       </form>
   `;

   showAdminModal(title, html);
}


async function saveRoomUpdate(form) {

   const roomId = form.dataset.roomId;
   const payload = {
       room_number: form.elements.room_number.value.trim(),
       room_type: form.elements.room_type.value.trim(),
       capacity: Number(form.elements.capacity.value || 0),
       monthly_rent: Number(form.elements.monthly_rent.value || 0),
       status: form.elements.status.value
   };

   try {

       if (roomId) {
           const {
               error
           } = await supabaseClient
               .from("rooms")
               .update(payload)
               .eq("id", roomId);

           if (error) {
               throw error;
           }
       } else {
           const {
               error
           } = await supabaseClient
               .from("rooms")
               .insert(payload);

           if (error) {
               throw error;
           }
       }

       closeAdminModal();
       await loadAdminData();

   } catch (error) {
       console.error("Room save error:", error);
       alert("Unable to save room details.");
   }
}


function openAdminProfileEditor() {

   const html = `
       <form data-admin-form="profile" style="display:grid; gap:14px;">
           <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
               Full Name
               <input type="text" name="name" value="${escapeHTML(currentAdmin?.name || currentAdmin?.user_metadata?.name || "")}" style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;" />
           </label>

           <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
               Mobile
               <input type="tel" inputmode="numeric" name="mobile" value="${escapeHTML(currentAdmin?.mobile || "")}" style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;" />
           </label>

           <div style="display:flex; justify-content:flex-end; gap:10px;">
               <button type="submit" style="padding:10px 18px; border:none; border-radius:8px; background:#1e3a5f; color:#fff; cursor:pointer; font-weight:700;">Save Profile</button>
               <button type="button" data-close-admin-modal style="padding:10px 16px; border:none; border-radius:8px; background:#eef2f6; color:#1e3a5f; cursor:pointer; font-weight:700;">Close</button>
           </div>
       </form>
   `;

   showAdminModal("Edit Profile", html);
}


async function saveAdminProfile(form) {

   const name = window.RajLibraryValidation.normalizeName(form.elements.name.value);
   const mobile = form.elements.mobile.value;

   if (!window.RajLibraryValidation.isValidName(name)) {
       alert(window.RajLibraryValidation.ERRORS?.NAME || "Name can contain only letters and spaces.");
       return;
   }

   if (mobile && !window.RajLibraryValidation.isValidMobile(mobile)) {
       alert(window.RajLibraryValidation.ERRORS?.MOBILE || "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
       return;
   }

   if (!currentAdmin?.email || !window.RajLibraryValidation.isValidEmail(currentAdmin.email)) {
       alert(window.RajLibraryValidation.ERRORS?.EMAIL || "Enter a valid email address.");
       return;
   }

   try {

       const payload = {
           name,
           mobile
       };

       const {
           error
       } = await supabaseClient
           .from("profiles")
           .update(payload)
           .eq("id", currentAdmin.id);

       if (error) {
           throw error;
       }

       currentAdmin = {
           ...currentAdmin,
           name,
           mobile
       };

       updateAdminProfile(currentAdmin);
       closeAdminModal();

   } catch (error) {
       console.error("Profile update error:", error);
       alert("Unable to update profile.");
   }
}


async function updateRoomStatus(roomId, newStatus) {
   try {

       const {
           error
       } = await supabaseClient
           .from("rooms")
           .update({
               status: newStatus
           })
           .eq("id", roomId);

       if (error) {
           throw error;
       }

       await loadAdminData();

   } catch (error) {
       console.error("Room status update error:", error);
       alert("Unable to update room status.");
   }
}


async function deleteRoom(roomId) {

   try {

       const {
           error
       } = await supabaseClient
           .from("rooms")
           .delete()
           .eq("id", roomId);

       if (error) {
           throw error;
       }

       await loadAdminData();

   } catch (error) {
       console.error("Room delete error:", error);
       alert("Unable to delete room.");
   }
}


async function deleteBooking(bookingId) {

   try {

       const {
           data,
           error
       } = await supabaseClient
           .from("bookings")
           .delete()
           .eq("id", bookingId)
           .select("id");

       if (error) {
           throw error;
       }

       if (!data || data.length === 0) {
           throw new Error("No booking was deleted. Check the admin delete permission in Supabase.");
       }

       closeAdminModal();
       await loadAdminData();

   } catch (error) {
       console.error("Booking delete error:", error);
       alert(`Unable to delete booking: ${error.message || "Please try again."}`);
   }
}


function openUserModal(user, mode) {

   const isView = mode === "view";
   const roleValue = String(user.role || "user").toLowerCase();

   const html = `
       <div style="display:grid; gap:14px;">
           <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
               <div><strong>Name</strong><div>${escapeHTML(user.name || user.email?.split("@")[0] || "User")}</div></div>
               <div><strong>Email</strong><div>${escapeHTML(user.email || "-")}</div></div>
               <div><strong>Mobile</strong><div>${escapeHTML(user.mobile || "-")}</div></div>
           </div>

           <form data-admin-form="user" data-user-id="${user.id}" style="display:grid; gap:14px;">
               <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
                   Full Name
                   <input type="text" name="name" value="${escapeHTML(user.name || user.email?.split("@")[0] || "")}" ${isView ? "disabled" : ""} style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;" />
               </label>

               <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
                   Mobile
                   <input type="tel" inputmode="numeric" name="mobile" value="${escapeHTML(user.mobile || "")}" ${isView ? "disabled" : ""} style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;" />
               </label>

               <label style="display:grid; gap:6px; color:#1e3a5f; font-weight:600;">
                   Role
                   <select name="role" ${isView ? "disabled" : ""} style="padding:10px 12px; border:1px solid #d9e0e8; border-radius:8px;">
                       <option value="user" ${roleValue === "user" ? "selected" : ""}>User</option>
                       <option value="admin" ${roleValue === "admin" ? "selected" : ""}>Admin</option>
                       <option value="disabled" ${roleValue === "disabled" ? "selected" : ""}>Disabled</option>
                   </select>
               </label>

               <div style="display:flex; justify-content:flex-end; gap:10px;">
                   ${isView ? "" : '<button type="submit" style="padding:10px 18px; border:none; border-radius:8px; background:#1e3a5f; color:#fff; cursor:pointer; font-weight:700;">Save User</button>'}
                   <button type="button" data-close-admin-modal style="padding:10px 16px; border:none; border-radius:8px; background:#eef2f6; color:#1e3a5f; cursor:pointer; font-weight:700;">Close</button>
               </div>
           </form>
       </div>
   `;

   showAdminModal(isView ? "User Details" : "Edit User", html);
}


async function saveUserUpdate(form) {

   const userId = form.dataset.userId;
   const name = window.RajLibraryValidation.normalizeName(form.elements.name.value);
   const mobile = form.elements.mobile.value;
   const role = form.elements.role.value;

   if (!window.RajLibraryValidation.isValidName(name)) {
       alert(window.RajLibraryValidation.ERRORS?.NAME || "Name can contain only letters and spaces.");
       return;
   }

   if (mobile && !window.RajLibraryValidation.isValidMobile(mobile)) {
       alert(window.RajLibraryValidation.ERRORS?.MOBILE || "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
       return;
   }

   try {

       const payload = {
           name,
           mobile,
           role
       };

       const {
           error
       } = await supabaseClient
           .from("profiles")
           .update(payload)
           .eq("id", userId);

       if (error) {
           throw error;
       }

       closeAdminModal();
       await loadAdminData();

   } catch (error) {
       console.error("User update error:", error);
       alert("Unable to update user details.");
   }
}


function normaliseBookingTypeForDisplay(value) {

   const type = String(value || "").toLowerCase();

   if (type === "room") {
       return "Room";
   }

   if (type === "library") {
       return "Library";
   }

   return "Other";
}


/* =========================================================
   AUTO REFRESH
========================================================= */

function startAutoRefresh() {

    stopAutoRefresh();


    autoRefreshInterval =
        setInterval(
            async () => {

                await loadAdminData();

            },
            60000
        );
}


function stopAutoRefresh() {

    if (autoRefreshInterval) {

        clearInterval(
            autoRefreshInterval
        );

        autoRefreshInterval = null;
    }
}


/* =========================================================
   LOGOUT
========================================================= */

document.addEventListener(
    "click",
    async event => {

        const logoutButton =
            event.target.closest(
                "#adminLogoutBtn"
            );


        if (!logoutButton) {
            return;
        }


        const confirmed =
            confirm(
                "Are you sure you want to logout?"
            );


        if (!confirmed) {
            return;
        }


        stopAutoRefresh();


        const {
            error
        } =
            await supabaseClient.auth.signOut();


        if (error) {

            console.error(
                "Logout error:",
                error
            );

            alert(
                "Logout failed."
            );

            return;
        }


        localStorage.removeItem(
            "rajLibraryUser"
        );


        window.location.href =
            "user-login.html";
    }
);


/* =========================================================
   DATE
========================================================= */

function setDashboardDate() {

    const dateElement =
        document.getElementById(
            "dashboardDate"
        );


    if (!dateElement) {
        return;
    }


    const today =
        new Date();


    dateElement.textContent =
        today.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
}


/* =========================================================
   MONTH DATA
========================================================= */

function getLastSixMonths() {

    const result = [];

    const now =
        new Date();


    for (
        let i = 5;
        i >= 0;
        i--
    ) {

        const date =
            new Date(
                now.getFullYear(),
                now.getMonth() - i,
                1
            );


        result.push({

            month:
                date.getMonth(),

            year:
                date.getFullYear(),

            label:
                date.toLocaleDateString(
                    "en-IN",
                    {
                        month: "short"
                    }
                )

        });
    }


    return result;
}


/* =========================================================
   HELPERS
========================================================= */

function getBookingUserName(
    booking
) {

    if (
        booking.user_name &&
        String(booking.user_name).trim()
    ) {

        return booking.user_name;
    }


    if (booking.user_id) {

        const user =
            allUsers.find(
                item =>
                String(item.id) ===
                String(booking.user_id)
            );


        if (user) {

            return (
                user.name ||
                user.email?.split("@")[0] ||
                "User"
            );
        }
    }


    return "Unknown User";
}


function extractNoteValue(notes, label) {
    if (!notes || typeof notes !== "string") {
        return "";
    }

    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = notes.match(new RegExp(`${escapedLabel}:\\s*([^\\n]+)`, "i"));
    return match?.[1]?.trim() || "";
}


function extractBookingEditCount(notes) {
    const value = Number(extractNoteValue(notes, "User edits"));
    return Number.isFinite(value) && value >= 0 ? value : 0;
}


function getRoomNumber(
    roomId
) {

    if (!roomId) {
        return "-";
    }


    const room =
        allRooms.find(
            item =>
                String(item.id) === String(roomId)
        );


    if (!room) {
        return "-";
    }


    return (
        room.room_number ||
        room.id ||
        "-"
    );
}


function normalizeBookingType(
    type
) {

    const value =
        String(type || "")
            .toLowerCase();


    if (value === "room") {
        return "Room";
    }


    if (value === "library") {
        return "Library";
    }


    return "Other";
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


function renderStatus(
    status
) {

    const value =
        normalizeBookingStatus(status);


    let className =
        "status-pending";


    if (
        ["approved", "active", "confirmed", "booked", "available"].includes(value)
    ) {

        className =
            "status-active";
    }


    if (
        ["cancelled", "rejected", "inactive"].includes(value)
    ) {

        className =
            "status-cancelled";
    }


    return `
        <span class="status-badge ${className}">
            ${escapeHTML(
                capitalize(value)
            )}
        </span>
    `;
}


function renderRoomStatus(
    status
) {

    const value =
        String(
            status || "unknown"
        )
        .toLowerCase();


    let className =
        "status-pending";


    if (value === "available") {
        className =
            "status-available";
    }


    if (value === "occupied") {
        className =
            "status-occupied";
    }


    return `
        <span class="status-badge ${className}">
            ${escapeHTML(
                capitalize(value)
            )}
        </span>
    `;
}


function renderRole(
    role
) {

    const value =
        String(
            role || "user"
        ).toLowerCase();


    const className =
        value === "admin"
            ? "status-active"
            : "status-pending";


    return `
        <span class="status-badge ${className}">
            ${escapeHTML(
                capitalize(value)
            )}
        </span>
    `;
}


function formatDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatAmount(
    value
) {

    const number =
        Number(value || 0);


    return number.toLocaleString(
        "en-IN"
    );
}


function getInitials(
    name
) {

    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (parts.length === 0) {
        return "A";
    }


    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


function capitalize(
    value
) {

    if (!value) {
        return "";
    }


    return value.charAt(0).toUpperCase()
        + value.slice(1);
}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {
        element.textContent = value;
    }
}


function escapeHTML(
    value
) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}
// ==========================================
// ADMIN PROFILE DROPDOWN
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {


        const adminProfileBox =
            document.getElementById(
                "adminProfileBox"
            );


        const adminProfileDropdown =
            document.getElementById(
                "adminProfileDropdown"
            );


        // ==================================
        // OPEN / CLOSE PROFILE DROPDOWN
        // ==================================

        if (
            adminProfileBox &&
            adminProfileDropdown
        ) {


            adminProfileBox.addEventListener(
                "click",
                (event) => {


                    event.stopPropagation();


                    adminProfileDropdown.classList.toggle(
                        "show"
                    );


                }
            );


        }


        // ==================================
        // CLOSE WHEN CLICK OUTSIDE
        // ==================================

        document.addEventListener(
            "click",
            (event) => {


                if (
                    adminProfileDropdown &&
                    adminProfileBox &&
                    !adminProfileDropdown.contains(
                        event.target
                    ) &&
                    !adminProfileBox.contains(
                        event.target
                    )
                ) {


                    adminProfileDropdown.classList.remove(
                        "show"
                    );


                }


            }
        );


        // ==================================
        // PROFILE SECTION BUTTON
        // ==================================

        const profileButton =
            document.querySelector(
                '.admin-dropdown-item[data-open-section="profile"]'
            );


        if (profileButton) {


            profileButton.addEventListener(
                "click",
                () => {


                    const sidebarProfileButton =
                        document.querySelector(
                            '.admin-nav-item[data-section="profile"]'
                        );


                    if (
                        sidebarProfileButton
                    ) {


                        sidebarProfileButton.click();


                    }


                    adminProfileDropdown.classList.remove(
                        "show"
                    );


                }
            );


        }


        // ==================================
        // SETTINGS SECTION BUTTON
        // ==================================

        const settingsButton =
            document.querySelector(
                '.admin-dropdown-item[data-open-section="settings"]'
            );


        if (settingsButton) {


            settingsButton.addEventListener(
                "click",
                () => {


                    const sidebarSettingsButton =
                        document.querySelector(
                            '.admin-nav-item[data-section="settings"]'
                        );


                    if (
                        sidebarSettingsButton
                    ) {


                        sidebarSettingsButton.click();


                    }


                    adminProfileDropdown.classList.remove(
                        "show"
                    );


                }
            );


        }


        // ==================================
        // PROFILE LOGOUT
        // ==================================

        const adminProfileLogout =
            document.getElementById(
                "adminProfileLogout"
            );


        if (adminProfileLogout) {


            adminProfileLogout.addEventListener(
                "click",
                () => {


                    const confirmLogout =
                        confirm(
                            "Are you sure you want to logout?"
                        );


                    if (
                        !confirmLogout
                    ) {


                        return;


                    }


                    // Use existing sidebar logout
                    // button so same logout logic runs

                    const adminLogoutBtn =
                        document.getElementById(
                            "adminLogoutBtn"
                        );


                    if (
                        adminLogoutBtn
                    ) {


                        adminLogoutBtn.click();


                    }


                }
            );


        }


    }
);