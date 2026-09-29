(() => {
    const namePattern = /^\p{L}+(?: \p{L}+)*$/u;
    const mobilePattern = /^[6-9]\d{9}$/;
    const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

    const ERROR_MESSAGES = Object.freeze({
        NAME: "Name can contain only letters and spaces.",
        MOBILE: "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.",
        EMAIL: "Enter a valid email address."
    });

    const normalizeName = value => String(value ?? "").trim().replace(/\s+/g, " ");

    const isValidName = value => {
        const normalized = normalizeName(value);
        return normalized.length > 0 && namePattern.test(normalized);
    };

    const isValidMobile = value => mobilePattern.test(String(value ?? ""));

    const isValidEmail = value => {
        const str = String(value ?? "").trim();
        return str.length > 0 && emailPattern.test(str);
    };

    function fieldType(input) {
        if (!input || !(input instanceof HTMLInputElement)) {
            return "";
        }
        const ignoredTypes = [
            "checkbox", "radio", "submit", "button", "reset",
            "hidden", "file", "image", "range", "date", "time",
            "datetime-local", "color"
        ];
        if (ignoredTypes.includes(input.type)) {
            return "";
        }
        const key = `${input.id || ""} ${input.name || ""}`.toLowerCase();

        if (input.type === "email" || key.includes("email")) {
            return "email";
        }
        if (input.type === "tel" || key.includes("mobile") || key.includes("phone") || key.includes("telephone")) {
            return "mobile";
        }
        if (key.includes("name")) {
            return "name";
        }
        return "";
    }

    function validateField(input, normalize = false) {
        const type = fieldType(input);
        if (!type) {
            return true;
        }

        if (type === "name" && normalize) {
            const normalized = normalizeName(input.value);
            if (normalized !== input.value) {
                input.value = normalized;
            }
        }

        let message = "";
        if (type === "name" && input.value && !isValidName(input.value)) {
            message = ERROR_MESSAGES.NAME;
        } else if (type === "mobile" && input.value && !isValidMobile(input.value)) {
            message = ERROR_MESSAGES.MOBILE;
        } else if (type === "email" && input.value && !isValidEmail(input.value)) {
            message = ERROR_MESSAGES.EMAIL;
        }

        input.setCustomValidity(message);
        return input.validity.valid;
    }

    const RajLibraryValidation = {
        ERRORS: ERROR_MESSAGES,
        normalizeName,
        isValidName,
        isValidMobile,
        isValidEmail,
        fieldType,
        validateField
    };

    if (typeof window !== "undefined") {
        window.RajLibraryValidation = RajLibraryValidation;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = RajLibraryValidation;
    }

    if (typeof document !== "undefined") {
        document.addEventListener("input", event => {
            if (event.target instanceof HTMLInputElement) {
                validateField(event.target);
            }
        });

        document.addEventListener("blur", event => {
            if (event.target instanceof HTMLInputElement) {
                validateField(event.target, true);
            }
        }, true);

        document.addEventListener("invalid", event => {
            const input = event.target;
            if (input instanceof HTMLInputElement) {
                validateField(input);
            }
        }, true);

        document.addEventListener("submit", event => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement)) {
                return;
            }

            const fields = Array.from(form.querySelectorAll("input"));
            fields.forEach(input => validateField(input, true));
            const invalidField = fields.find(input => !input.validity.valid);

            if (invalidField) {
                event.preventDefault();
                event.stopImmediatePropagation();
                invalidField.reportValidity();
            }
        }, true);
    }
})();
