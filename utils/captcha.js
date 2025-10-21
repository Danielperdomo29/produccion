// utils/captcha.js

async function verificarCaptcha(token) {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET || "6Ld7oL0rAAAAAEolyOaQVxLrbIVb7OasrGDHzy2x";

    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secretKey}&response=${token}`
    });

    const data = await response.json();
    return data.success;
  } catch (err) {
    console.error("❌ Error verificando reCAPTCHA:", err);
    return false;
  }
}

module.exports = { verificarCaptcha };
