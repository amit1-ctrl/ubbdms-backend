require("dotenv").config();
const SibApiV3Sdk = require("@getbrevo/brevo");

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

async function sendEmail(to, toName, subject, htmlContent) {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.sender = {
    name: "UBBDMS Blood Bank",
    email: process.env.BREVO_SENDER_EMAIL,
  };
  sendSmtpEmail.to = [{ email: to, name: toName }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return true;
  } catch (error) {
    console.error("Email send error:", error.message);
    return false;
  }
}

console.log("Brevo Email API ready ✅");

module.exports = { sendEmail };
