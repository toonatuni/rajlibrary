// ==========================================
// RAJ LIBRARY BACKEND
// BOOKING APP SERVER
// ==========================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Origin is not allowed."));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

const validation = require("../js/form-validation");

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));

app.get("/", (req, res) => {
    res.json({
        name: "Raj Library",
        status: "running",
        message: "Booking and authentication are handled through Supabase."
    });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "raj-library" });
});

app.post("/api/validate", (req, res) => {
    const { name, mobile, email } = req.body || {};
    const errors = {};

    if (name !== undefined) {
        if (!name || !validation.isValidName(name)) {
            errors.name = validation.ERRORS.NAME;
        }
    }

    if (mobile !== undefined) {
        if (!mobile || !validation.isValidMobile(mobile)) {
            errors.mobile = validation.ERRORS.MOBILE;
        }
    }

    if (email !== undefined) {
        if (!email || !validation.isValidEmail(email)) {
            errors.email = validation.ERRORS.EMAIL;
        }
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            valid: false,
            errors
        });
    }

    return res.json({
        valid: true,
        data: {
            name: name !== undefined ? validation.normalizeName(name) : undefined,
            mobile,
            email
        }
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Raj Library backend running on http://localhost:${PORT}`);
});
