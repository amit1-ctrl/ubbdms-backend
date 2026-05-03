require("dotenv").config();
const axios = require("axios");

async function sendEmail(to, toName, subject, htmlContent) {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "UBBDMS Blood Bank",
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: to, name: toName }],
        subject: subject,
        htmlContent: htmlContent,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
        },
      },
    );
    console.log("Email sent to:", to);
    return true;
  } catch (error) {
    console.error("Email error:", error.response?.data || error.message);
    return false;
  }
}

console.log("Brevo Email API ready ✅");

module.exports = { sendEmail };
