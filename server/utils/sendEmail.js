const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (email, paymentId, amount, plan) => {
  try {
    console.log("Sending email to:", email);
    const info = await transporter.sendMail({
      from: `"ShipSmart" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "ShipSmart Payment Receipt",
      html: `
<div style="background:#f4f7fb;padding:40px 20px;font-family:Arial,sans-serif;">

  <div style="max-width:650px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563EB,#06B6D4);padding:35px;text-align:center;color:#fff;">

      <h1 style="margin:0;font-size:32px;">🚀 ShipSmart</h1>

      <p style="margin-top:10px;font-size:18px;">
        Payment Successful
      </p>

    </div>

    <!-- Body -->
    <div style="padding:40px;">

      <h2 style="margin-top:0;color:#0F172A;">
        Thank You!
      </h2>

      <p style="font-size:16px;color:#475569;line-height:28px;">
        Your payment has been received successfully.
        Your <strong>${plan}</strong> subscription has been activated.
      </p>

      <table width="100%" cellspacing="0" cellpadding="12"
        style="margin-top:25px;border-collapse:collapse;">

        <tr style="background:#F8FAFC;">
          <td style="border:1px solid #E2E8F0;"><b>Plan</b></td>
          <td style="border:1px solid #E2E8F0;">${plan}</td>
        </tr>

        <tr>
          <td style="border:1px solid #E2E8F0;"><b>Payment ID</b></td>
          <td style="border:1px solid #E2E8F0;">${paymentId}</td>
        </tr>

        <tr style="background:#F8FAFC;">
          <td style="border:1px solid #E2E8F0;"><b>Amount Paid</b></td>
          <td style="border:1px solid #E2E8F0;color:#16A34A;font-weight:bold;font-size:18px;">
            ₹${amount}
          </td>
        </tr>

        <tr>
          <td style="border:1px solid #E2E8F0;"><b>Status</b></td>
          <td style="border:1px solid #E2E8F0;color:#16A34A;">
            ✅ Successful
          </td>
        </tr>

      </table>

      <div style="text-align:center;margin-top:35px;">

        <a href="https://shipsmartseller.vercel.app/dashboard"
          style="background:#2563EB;
                 color:#fff;
                 text-decoration:none;
                 padding:14px 28px;
                 border-radius:8px;
                 display:inline-block;
                 font-weight:bold;">
          Go to Dashboard
        </a>

      </div>

      <hr style="margin:35px 0;border:none;border-top:1px solid #E2E8F0;">

      <p style="font-size:15px;color:#64748B;line-height:24px;">
        Thank you for choosing ShipSmart. Your subscription is now active and you can start using all premium features immediately.
      </p>

      <p style="margin-top:25px;font-size:16px;">
        Regards,<br>
        <strong>ShipSmart Team</strong>
      </p>

    </div>

    <!-- Footer -->
    <div style="background:#0F172A;padding:25px;text-align:center;">

      <h3 style="margin:0;color:#fff;">
        ShipSmart
      </h3>

      <p style="margin-top:10px;color:#CBD5E1;">
        Smart Image Optimization for Meesho Sellers
      </p>

      <p style="margin-top:20px;color:#94A3B8;font-size:13px;">
        © 2026 ShipSmart. All Rights Reserved.
      </p>

    </div>

  </div>

</div>
`,
    });

    console.log("✅ Email Sent:", info.messageId);
  } catch (error) {
    console.error("❌ Email Error:", error);
    throw error;
  }
};

module.exports = sendEmail;
