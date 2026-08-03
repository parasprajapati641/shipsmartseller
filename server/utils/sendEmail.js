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

const sendTrialReminderEmail = async (email, reminderType, daysRemaining) => {
  try {
    console.log(`Sending ${reminderType} trial reminder email to:`, email);
    
    let subject = "🎉 Your ShipSmart 30-Day Free Trial";
    let heading = "30-Day Free Trial";
    let bodyText = "";

    if (reminderType === "7_days") {
      subject = "⏰ 7 Days Remaining on Your ShipSmart Free Trial";
      heading = "7 Days Left on Your Free Trial";
      bodyText = "You have <strong>7 days remaining</strong> on your 30-day Free Trial. Upgrade now to ensure uninterrupted access to all Premium AI product image tools.";
    } else if (reminderType === "3_days") {
      subject = "⚠️ Only 3 Days Left on Your Free Trial!";
      heading = "3 Days Left on Your Free Trial";
      bodyText = "Your 30-day Free Trial expires in <strong>3 days</strong>. Don't lose access to unlimited AI image generation and high-conversion presets.";
    } else if (reminderType === "1_day") {
      subject = "🔴 Last Day! Your Free Trial Expires Tomorrow";
      heading = "1 Day Remaining — Trial Ending Soon";
      bodyText = "This is a quick reminder that your Free Trial expires in <strong>24 hours</strong>. Upgrade to Premium for ₹999/month to keep optimizing your listings.";
    } else if (reminderType === "expired") {
      subject = "Your ShipSmart Free Trial Has Expired";
      heading = "Free Trial Expired";
      bodyText = "Your 30-day Free Trial has ended. Upgrade to Premium for <strong>₹999/month</strong> to continue generating marketplace-optimized product images.";
    }

    const info = await transporter.sendMail({
      from: `"ShipSmart Seller" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html: `
<div style="background:#090B14;padding:40px 20px;font-family:'Segoe UI',Arial,sans-serif;color:#ffffff;">
  <div style="max-width:600px;margin:auto;background:#121826;border-radius:16px;border:1px solid #2A3658;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.5);">
    
    <div style="background:linear-gradient(135deg,#6C63FF,#00D4AA);padding:32px;text-align:center;color:#ffffff;">
      <h1 style="margin:0;font-size:28px;font-weight:800;">🚀 ShipSmart Seller</h1>
      <div style="margin-top:8px;display:inline-block;background:rgba(0,0,0,0.2);padding:6px 14px;border-radius:20px;font-weight:700;font-size:14px;">
        🎉 30-Day Free Trial Notification
      </div>
    </div>

    <div style="padding:36px;color:#E2E8F0;">
      <h2 style="margin-top:0;color:#ffffff;font-size:22px;font-weight:700;">${heading}</h2>
      <p style="font-size:15px;color:#94A3B8;line-height:1.7;">
        Hello,
      </p>
      <p style="font-size:15px;color:#CBD5E1;line-height:1.7;">
        ${bodyText}
      </p>

      <div style="margin:30px 0;background:#1A2235;border-radius:12px;padding:20px;border:1px solid #2A3658;text-align:center;">
        <span style="font-size:13px;color:#94A3B8;display:block;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Status</span>
        <span style="font-size:22px;font-weight:800;color:#00D4AA;display:block;margin-top:4px;">${reminderType === 'expired' ? 'Trial Expired' : `${daysRemaining} Days Remaining`}</span>
      </div>

      <div style="text-align:center;margin-top:30px;">
        <a href="https://shipsmartseller.vercel.app/dashboard"
          style="background:linear-gradient(135deg,#6C63FF,#00D4AA);
                 color:#ffffff;
                 text-decoration:none;
                 padding:14px 32px;
                 border-radius:10px;
                 display:inline-block;
                 font-weight:800;
                 font-size:15px;
                 box-shadow:0 4px 15px rgba(108,99,255,0.4);">
          Upgrade to Premium (₹999/mo)
        </a>
      </div>

      <hr style="margin:30px 0;border:none;border-top:1px solid #2A3658;">

      <p style="font-size:13px;color:#64748B;line-height:1.6;margin:0;">
        You are receiving this automated email regarding your ShipSmart Seller subscription.
      </p>
    </div>
  </div>
</div>
`,
    });

    console.log(`✅ Trial Reminder Email (${reminderType}) Sent:`, info.messageId);
    return true;
  } catch (error) {
    console.error(`❌ Trial Reminder Email Error (${reminderType}):`, error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendTrialReminderEmail,
};
