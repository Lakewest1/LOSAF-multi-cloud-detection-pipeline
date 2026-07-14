import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendApprovalEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  return transporter.sendMail({
    from: "SOAR Platform <no-reply@soar.com>",
    ...params,
  });
}