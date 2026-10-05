// ==========================================
// RAJ LIBRARY - USER AUTHENTICATION
// SUPABASE AUTH
// ==========================================


// ==========================================
// SAVE USER TO LOCAL STORAGE
// ==========================================

function saveUser(user) {


    if (!user) {

        return;

    }


    const userData = {

        id:

            user.id,


        email:

            user.email || "",


        name:

            user.user_metadata?.name ||

            user.user_metadata?.full_name ||

            user.email?.split("@")[0] ||

            "User",


        avatar:

            user.user_metadata?.avatar_url ||

            user.user_metadata?.picture ||

            null

    };


    // Save main user data

    localStorage.setItem(

        "user",

        JSON.stringify(userData)

    );


    // Save current user

    localStorage.setItem(

        "currentUser",

        JSON.stringify(userData)

    );


    // Save login status

    localStorage.setItem(

        "isLoggedIn",

        "true"

    );


    console.log(

        "User saved successfully:",

        userData

    );


}



// ==========================================
// PASSWORD SHOW / HIDE
// ==========================================

function togglePassword(

    inputId,

    button

) {


    const passwordInput =

        document.getElementById(

            inputId

        );


    if (!passwordInput) {

        return;

    }


    if (

        passwordInput.type === "password"

    ) {


        passwordInput.type =

            "text";


        button.textContent =

            "Hide";


    } else {


        passwordInput.type =

            "password";


        button.textContent =

            "Show";

    }


}



// ==========================================
// MAKE FUNCTION GLOBAL
// ==========================================

window.togglePassword =

    togglePassword;



// ==========================================
// GET USER PROFILE ROLE
// ==========================================

async function getUserRole(

    userId

) {


    try {


        const {

            data,

            error

        } =

        await supabaseClient

            .from(

                "profiles"

            )

            .select(

                "role"

            )

            .eq(

                "id",

                userId

            )

            .maybeSingle();


        if (error) {

            console.error(

                "Role Check Error:",

                error

            );

            throw error;

        }


        if (

            !data ||

            !data.role

        ) {


            return "user";

        }


        return (

            data.role ||

            "user"

        )

        .toLowerCase();


    } catch (error) {


        console.error(

            "Role Loading Error:",

            error

        );


        throw error;

    }


}



// ==========================================
// REDIRECT USER BY ROLE
// ==========================================

async function redirectByRole(

    user

) {


    if (!user) {

        window.location.href =

            "user-login.html";

        return;

    }


    let role;

    try {
        role = await getUserRole(user.id);
    } catch (error) {
        console.error("Unable to determine account role; redirect cancelled.", error);
        const message = document.getElementById("loginMessage");
        if (message) {
            message.style.color = "red";
            message.textContent = "Unable to verify your account role. Please try again.";
        }
        return;
    }


    console.log(

        "User Role:",

        role

    );


    // ======================================
    // ADMIN REDIRECT
    // ======================================

    if (

        role === "admin"

    ) {


        window.location.href =

            "admin-dashboard.html";


        return;

    }


    // ======================================
    // NORMAL USER REDIRECT
    // ======================================

    window.location.href =

        "index.html";


}



// ==========================================
// CREATE / UPDATE USER PROFILE
// ==========================================

async function createUserProfile(

    user

) {


    if (!user) {

        return;

    }


    try {


        const profileName =
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            "User";
        const validation = window.RajLibraryValidation;
        const userName = validation?.isValidName(profileName)
            ? validation.normalizeName(profileName)
            : "User";


        // First check profile

        const {

            data: existingProfile,

            error: checkError

        } =

        await supabaseClient

            .from(

                "profiles"

            )

            .select(

                "id, role"

            )

            .eq(

                "id",

                user.id

            )

            .maybeSingle();


        if (checkError) {

            console.error(

                "Profile Check Error:",

                checkError

            );

        }


        // ==================================
        // PROFILE ALREADY EXISTS
        // ==================================

        if (existingProfile) {


            return;

        }


        // ==================================
        // CREATE NEW USER PROFILE
        // ==================================

        const {

            error

        } =

        await supabaseClient

            .from(

                "profiles"

            )

            .insert({

                id:

                    user.id,


                name:

                    userName,


                email:

                    user.email,


                role:

                    "user"

            });


        if (error) {

            throw error;

        }


        console.log(

            "Profile created successfully."

        );


    } catch (error) {


        console.error(

            "Profile Creation Error:",

            error

        );

    }


}



// ==========================================
// USER SIGNUP
// ==========================================

async function userSignup(

    email,

    password

) {


    const message =

        document.getElementById(

            "signupMessage"

        );


    if (message) {

        message.textContent = "";

    }

    if (!window.RajLibraryValidation?.isValidEmail(email)) {
        if (message) {
            message.style.color = "red";
            message.textContent = window.RajLibraryValidation?.ERRORS?.EMAIL || "Enter a valid email address.";
        }
        return;
    }


    // ======================================
    // PASSWORD VALIDATION
    // ======================================

    if (

        password.length < 6

    ) {


        if (message) {


            message.style.color =

                "red";


            message.textContent =

                "Password must be at least 6 characters.";

        }


        return;

    }


    try {


        if (message) {


            message.style.color =

                "#333";


            message.textContent =

                "Creating your account...";

        }


        // ==================================
        // CREATE SUPABASE AUTH USER
        // ==================================

        const {

            data,

            error

        } =

        await supabaseClient

            .auth

            .signUp({

                email:

                    email,


                password:

                    password,


                options: {

                    data: {

                        name:
                            "User"

                    }

                }

            });


        if (error) {

            throw error;

        }


        // ==================================
        // SAVE PROFILE
        // ==================================

        if (

            data.user

        ) {


            await createUserProfile(

                data.user

            );

        }


        // ==================================
        // SUCCESS MESSAGE
        // ==================================

        if (message) {


            message.style.color =

                "green";


            message.textContent =

                "Account created successfully.";

        }


        // ==================================
        // AUTO LOGIN
        // ==================================

        if (

            data.session &&

            data.user

        ) {


            saveUser(

                data.user

            );


            setTimeout(

                async () => {


                    await redirectByRole(

                        data.user

                    );


                },

                1000

            );


        } else {


            if (message) {


                message.style.color =

                    "green";


                message.textContent =

                    "Account created successfully. Please verify your email before signing in.";

            }

        }


    } catch (error) {


        console.error(

            "Signup Error:",

            error

        );


        if (message) {


            message.style.color =

                "red";


            message.textContent =

                error.message ||

                "Unable to create account.";

        }

    }


}



// ==========================================
// USER LOGIN
// ==========================================

async function userLogin(

    email,

    password

) {


    const message =

        document.getElementById(

            "loginMessage"

        );


    if (message) {

        message.textContent = "";

    }

    if (!window.RajLibraryValidation?.isValidEmail(email)) {
        if (message) {
            message.style.color = "red";
            message.textContent = window.RajLibraryValidation?.ERRORS?.EMAIL || "Enter a valid email address.";
        }
        return;
    }


    try {


        if (message) {


            message.style.color =

                "#333";


            message.textContent =

                "Signing in...";

        }


        const {

            data,

            error

        } =

        await supabaseClient

            .auth

            .signInWithPassword({

                email:

                    email,


                password:

                    password

            });


        if (error) {

            throw error;

        }


        // ==================================
        // LOGIN SUCCESS
        // ==================================

        if (

            data.session &&

            data.user

        ) {


            saveUser(

                data.user

            );


            if (message) {


                message.style.color =

                    "green";


                message.textContent =

                    "Login successful. Redirecting...";

            }


            console.log(

                "Login successful:",

                data.user

            );


            // ==================================
            // REDIRECT BASED ON ROLE
            // ==================================

            setTimeout(

                async () => {


                    await redirectByRole(

                        data.user

                    );


                },

                800

            );


        }


    } catch (error) {


        console.error(

            "Login Error:",

            error

        );


        if (message) {


            message.style.color =

                "red";


            message.textContent =

                error.message ||

                "Login failed.";

        }

    }


}



// ==========================================
// GOOGLE LOGIN
// ==========================================

async function googleLogin() {


    try {


        const {

            error

        } =

        await supabaseClient

            .auth

            .signInWithOAuth({

                provider:

                    "google",


                options: {


                    redirectTo:

                        window.location.origin +

                        "/user-login.html"


                }

            });


        if (error) {

            throw error;

        }


    } catch (error) {


        console.error(

            "Google Login Error:",

            error

        );


        const loginMessage =

            document.getElementById(

                "loginMessage"

            );


        const signupMessage =

            document.getElementById(

                "signupMessage"

            );


        if (loginMessage) {


            loginMessage.style.color =

                "red";


            loginMessage.textContent =

                error.message ||

                "Google login failed.";

        }


        if (signupMessage) {


            signupMessage.style.color =

                "red";


            signupMessage.textContent =

                error.message ||

                "Google login failed.";

        }

    }


}



// ==========================================
// MAKE GOOGLE LOGIN GLOBAL
// ==========================================

window.googleLogin =

    googleLogin;



// ==========================================
// CHECK EXISTING SESSION
// ==========================================

async function checkExistingSession() {


    try {


        const {

            data,

            error

        } =

        await supabaseClient

            .auth

            .getSession();


        if (error) {


            console.error(

                "Session Error:",

                error

            );


            return;

        }


        if (

            data.session &&

            data.session.user

        ) {


            const user =

                data.session.user;


            // Save user

            saveUser(

                user

            );


            // ==================================
            // CREATE PROFILE IF MISSING
            // IMPORTANT FOR GOOGLE USERS
            // ==================================

            await createUserProfile(

                user

            );


            console.log(

                "Existing session found:",

                user

            );


            if (document.getElementById("loginEmail")) {
                await redirectByRole(user);
            }

        }


    } catch (error) {


        console.error(

            "Session Check Error:",

            error

        );

    }


}



// ==========================================
// LOGOUT USER
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


        // Remove local data

        localStorage.removeItem(

            "user"

        );


        localStorage.removeItem(

            "currentUser"

        );


        localStorage.removeItem(

            "isLoggedIn"

        );


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
// MAKE LOGOUT GLOBAL
// ==========================================

window.logoutUser =

    logoutUser;



// ==========================================
// PAGE EVENTS
// ==========================================

document.addEventListener(

    "DOMContentLoaded",

    async () => {


        // ==================================
        // CHECK EXISTING LOGIN
        // ==================================

        await checkExistingSession();


        // ==================================
        // SIGNUP FORM
        // ==================================

        const signupForm =

            document.getElementById(

                "userSignupForm"

            );


        if (signupForm) {


            signupForm.addEventListener(

                "submit",

                async (

                    event

                ) => {


                    event.preventDefault();


                    const emailInput =
                        document.getElementById("signupEmail") ||
                        document.getElementById("email");
                    const passwordInput =
                        document.getElementById("signupPassword") ||
                        document.getElementById("password");
                    const email = emailInput.value;

                    const password =
                        passwordInput.value;


                    await userSignup(

                        email,

                        password

                    );


                }

            );

        }


        // ==================================
        // LOGIN FORM
        // ==================================

        const loginForm =

            document.getElementById(

                "userLoginForm"

            );


        if (loginForm) {


            loginForm.addEventListener(

                "submit",

                async (

                    event

                ) => {


                    event.preventDefault();


                    const email =

                        document

                            .getElementById(

                                "loginEmail"

                            )

                            .value;


                    const password =

                        document

                            .getElementById(

                                "loginPassword"

                            )

                            .value;


                    await userLogin(

                        email,

                        password

                    );


                }

            );

        }


    }

);