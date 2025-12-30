const LOWERCASE_REGEX = /[a-z]/;
const UPPERCASE_REGEX = /[A-Z]/;
const DIGIT_REGEX = /[0-9]/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_\-+={}\[\]|:;"\'<>.,?\/~`]/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^\p{L}+(?:-\p{L}+)*(?: \p{L}+(?:-\p{L}+)*)+$/u;

function validateFullName(fullName) {
  // Check length
  if (fullName.length < 5) {
    return "Enter your full name.";
  }

  let message = "";

  if (!NAME_REGEX.test(fullName)) {
    message += "Full name may contain letters, one space and '-' only.";
  }

  return message;
}

function validatePassword(password, confirmPassword) {
  let message = "";
  // Check password length
  if (password.length < 8) {
    message += "Password must be at least 8 characters long.\n";
  }

  if (!LOWERCASE_REGEX.test(password)) {
    message += "Password must contain at least one lowercase letter.\n";
  }

  if (!UPPERCASE_REGEX.test(password)) {
    message += "Password must contain at least one uppercase letter.\n";
  }

  if (!DIGIT_REGEX.test(password)) {
    message += "Password must contain at least one digit.\n";
  }

  if (!SPECIAL_CHAR_REGEX.test(password)) {
    message += "Password must contain at least one special character.\n";
  }

  // Check if password and confirm password match
  if (password !== confirmPassword) {
    message += "Password and confirm password do not match.\n";
  }

  return message;
}

function validateEmail(email) {
  // Validate email format
  return EMAIL_REGEX.test(email) ? "" : "Invalid email format.";
}

function normalizeFullName(fullName) {
  return fullName.trim().replace(/\s+/g, " ");
}

export function validateRegister(data) {
  let email = data.email?.trim() || "";
  let password = data.password || "";
  let confirmPassword = data.passwordConfirmation || "";
  let fullName = data.fullname?.trim() || "";

  if (
    email === "" ||
    password === "" ||
    fullName === "" ||
    confirmPassword === ""
  ) {
    return "Missing required fields.";
  }

  const normalizedFullName = normalizeFullName(fullName);

  let message = "";
  message += validateFullName(normalizedFullName);
  message += validatePassword(password, confirmPassword);
  message += validateEmail(email);
  // All validations passed, can return the valid inputs
  return message === "" ? null : message;
}

export function validateLogin(data) {
  let email = data.email?.trim() || "";
  let password = data.password || "";

  if (email === "" || password === "") {
    return "Missing required fields.";
  }

  let message = "";
  message += validateEmail(email);
  // All validations passed, can return the valid inputs
  return message === "" ? null : message;
}
