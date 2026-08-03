const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config();
const sendEmail = require("./utils/sendEmail");
const connectDB = require("./config/db");
const OptimizationHistory = require("./moduls/history");
const Subscription = require("./moduls/subscription");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Connect to MongoDB
connectDB();

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Test email
app.get("/test-email", async (req, res) => {
  try {
    await sendEmail();
    res.send("Test email sent successfully.");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to send email.");
  }
});

// Razorpay Order Creation
app.post("/order", async (req, res) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { plan } = req.body;

    const prices = {
      premium: 999,
      premium_plus: 999,
    };

    const planKey = prices[plan] ? plan : "premium_plus";
    const amountInRupees = prices[planKey];

    const options = {
      amount: amountInRupees * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    console.log("[RAZORPAY ORDER OPTIONS]", options);

    const order = await razorpay.orders.create(options);

    res.json(order);
  } catch (error) {
    console.error("[RAZORPAY ORDER ERROR]", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Verify Payment & Activate 30-Day Premium Subscription in MongoDB
app.post("/verify-payment", async (req, res) => {
  try {
    const { email, razorpay_payment_id, razorpay_order_id, razorpay_signature, plan } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "User email is required" });
    }

    const normEmail = email.trim().toLowerCase();

    // Verify Razorpay Signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const now = Date.now();
    // Exactly 30 days subscription duration (30 * 24 * 60 * 60 * 1000 ms)
    const expiryDate = now + 30 * 24 * 60 * 60 * 1000;

    // Save or update subscription permanently in MongoDB
    const subRecord = await Subscription.findOneAndUpdate(
      { userEmail: normEmail },
      {
        userEmail: normEmail,
        plan: "premium_plus",
        status: "active",
        amount: 999,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        signature: razorpay_signature,
        startDate: now,
        expiryDate: expiryDate,
      },
      { upsert: true, new: true }
    );

    // Send Confirmation Email
    try {
      await sendEmail(normEmail, razorpay_payment_id, 999, "premium_plus");
    } catch (emailErr) {
      console.warn("Payment confirmation email warning:", emailErr);
    }

    res.json({
      success: true,
      message: "Payment verified and 30-day Premium subscription activated successfully",
      subscription: {
        userEmail: normEmail,
        plan: "premium_plus",
        status: "active",
        startedAt: now,
        expiresAt: expiryDate,
        daysRemaining: 30,
        isUnlimited: true,
      },
    });
  } catch (error) {
    console.error("[VERIFY PAYMENT ERROR]", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Automated Trial Reminder Checker
async function checkAndSendTrialReminders(sub) {
  if (!sub || sub.plan === "premium_plus") return;

  const now = Date.now();
  const daysRemaining = Math.max(0, Math.ceil((sub.expiryDate - now) / (1000 * 60 * 60 * 24)));
  const isExpired = now >= sub.expiryDate;
  let remindersSent = Array.isArray(sub.remindersSent) ? [...sub.remindersSent] : [];
  let updated = false;

  if (isExpired) {
    if (!remindersSent.includes("expired")) {
      await sendTrialReminderEmail(sub.userEmail, "expired", 0);
      remindersSent.push("expired");
      updated = true;
    }
  } else {
    if (daysRemaining <= 7 && daysRemaining > 3 && !remindersSent.includes("7_days")) {
      await sendTrialReminderEmail(sub.userEmail, "7_days", daysRemaining);
      remindersSent.push("7_days");
      updated = true;
    } else if (daysRemaining <= 3 && daysRemaining > 1 && !remindersSent.includes("3_days")) {
      await sendTrialReminderEmail(sub.userEmail, "3_days", daysRemaining);
      remindersSent.push("3_days");
      updated = true;
    } else if (daysRemaining <= 1 && daysRemaining > 0 && !remindersSent.includes("1_day")) {
      await sendTrialReminderEmail(sub.userEmail, "1_day", daysRemaining);
      remindersSent.push("1_day");
      updated = true;
    }
  }

  if (updated) {
    sub.remindersSent = remindersSent;
    await sub.save();
  }
}

// GET Subscription Status from MongoDB (Auto-creates 30-Day Free Trial for new accounts)
app.get("/api/subscription", async (req, res) => {
  try {
    const { userEmail } = req.query;
    if (!userEmail) {
      return res.status(400).json({ success: false, message: "userEmail is required" });
    }

    const normEmail = String(userEmail).trim().toLowerCase();
    let sub = await Subscription.findOne({ userEmail: normEmail });
    const now = Date.now();

    // Auto-create 30-Day Free Trial if new user
    if (!sub) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      sub = await Subscription.create({
        userEmail: normEmail,
        plan: "trial",
        status: "active",
        isTrial: true,
        amount: 0,
        startDate: now,
        expiryDate: now + thirtyDays,
        remindersSent: [],
      });
      console.log(`[SUBSCRIPTION API] Auto-provisioned 30-Day Free Trial for ${normEmail}`);
    }

    const isExpired = now >= sub.expiryDate;
    const daysRemaining = isExpired ? 0 : Math.ceil((sub.expiryDate - now) / (1000 * 60 * 60 * 24));
    const isTrial = sub.plan === "trial" || sub.isTrial;

    if (isExpired && sub.status === "active") {
      sub.status = "expired";
      sub.plan = "expired";
      await sub.save();
    }

    // Evaluate & trigger reminder emails asynchronously
    checkAndSendTrialReminders(sub).catch((err) =>
      console.warn("Trial reminder check warning:", err),
    );

    res.json({
      success: true,
      state: {
        plan: isExpired ? "expired" : sub.plan,
        status: isExpired ? "expired" : sub.status,
        isTrial: isTrial && !isExpired,
        startedAt: sub.startDate,
        expiresAt: sub.expiryDate,
        daysRemaining,
        isUnlimited: !isExpired && sub.status === "active",
      },
    });
  } catch (error) {
    console.error("[GET SUBSCRIPTION ERROR]", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Panel: View All Trial & Paid Users
app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await Subscription.find().sort({ startDate: -1 });
    const now = Date.now();

    const formatted = users.map((u) => {
      const isExpired = now >= u.expiryDate;
      const daysRemaining = isExpired ? 0 : Math.ceil((u.expiryDate - now) / (1000 * 60 * 60 * 24));
      return {
        userEmail: u.userEmail,
        plan: isExpired ? "expired" : u.plan,
        status: isExpired ? "expired" : u.status,
        isTrial: Boolean(u.isTrial && !isExpired),
        startDate: u.startDate,
        expiryDate: u.expiryDate,
        daysRemaining,
        paymentId: u.paymentId || null,
        remindersSent: u.remindersSent || [],
      };
    });

    res.json({ success: true, users: formatted });
  } catch (error) {
    console.error("[ADMIN GET USERS ERROR]", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Panel: Convert User to Premium Plan
app.post("/api/admin/convert-user", async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res.status(400).json({ success: false, message: "userEmail is required" });
    }

    const normEmail = String(userEmail).trim().toLowerCase();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    const sub = await Subscription.findOneAndUpdate(
      { userEmail: normEmail },
      {
        userEmail: normEmail,
        plan: "premium_plus",
        status: "active",
        isTrial: false,
        amount: 999,
        startDate: now,
        expiryDate: now + thirtyDays,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `User ${normEmail} converted to Premium successfully.`,
      user: sub,
    });
  } catch (error) {
    console.error("[ADMIN CONVERT USER ERROR]", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Panel: Extend Trial Manually
app.post("/api/admin/extend-trial", async (req, res) => {
  try {
    const { userEmail, days = 7 } = req.body;
    if (!userEmail) {
      return res.status(400).json({ success: false, message: "userEmail is required" });
    }

    const normEmail = String(userEmail).trim().toLowerCase();
    let sub = await Subscription.findOne({ userEmail: normEmail });
    const now = Date.now();

    const addMs = Number(days) * 24 * 60 * 60 * 1000;
    const baseExpiry = sub && sub.expiryDate > now ? sub.expiryDate : now;
    const newExpiry = baseExpiry + addMs;

    sub = await Subscription.findOneAndUpdate(
      { userEmail: normEmail },
      {
        userEmail: normEmail,
        plan: "trial",
        status: "active",
        isTrial: true,
        expiryDate: newExpiry,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Trial for ${normEmail} extended by ${days} days.`,
      user: sub,
    });
  } catch (error) {
    console.error("[ADMIN EXTEND TRIAL ERROR]", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// MongoDB Permanent Optimization History API
// ==========================================

// GET Optimization History for a User
app.get("/api/history", async (req, res) => {
  try {
    const { userEmail } = req.query;
    if (!userEmail) {
      return res.json({ success: true, history: [] });
    }

    const normEmail = String(userEmail).trim().toLowerCase();
    const historyList = await OptimizationHistory.find({ userEmail: normEmail })
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      success: true,
      history: historyList,
    });
  } catch (error) {
    console.error("[GET HISTORY ERROR]", error);
    res.status(500).json({ success: false, message: error.message, history: [] });
  }
});

// POST Save Optimization History Entry into MongoDB
app.post("/api/history", async (req, res) => {
  try {
    const { entry, userEmail } = req.body;
    if (!entry || !entry.id) {
      return res.status(400).json({ success: false, message: "Valid history entry required" });
    }

    const normEmail = (userEmail || entry.userEmail || "anonymous").trim().toLowerCase();

    const saved = await OptimizationHistory.findOneAndUpdate(
      { id: entry.id },
      {
        id: entry.id,
        userEmail: normEmail,
        filename: entry.filename,
        category: entry.category || "apparel",
        generationType: entry.generationType || "KB Presets",
        createdAt: entry.createdAt || Date.now(),
        thumb: entry.thumb,
        originalUrl: entry.originalUrl || entry.thumb,
        variants: entry.variants || [],
      },
      { upsert: true, new: true }
    );

    const userHistory = await OptimizationHistory.find({ userEmail: normEmail })
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      success: true,
      entry: saved,
      history: userHistory,
    });
  } catch (error) {
    console.error("[POST HISTORY ERROR]", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE Single Optimization History Entry from MongoDB
app.delete("/api/history/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.query.userEmail || req.body.userEmail;

    if (!userEmail) {
      return res.status(400).json({ success: false, message: "userEmail is required" });
    }

    const normEmail = String(userEmail).trim().toLowerCase();
    await OptimizationHistory.deleteOne({ id, userEmail: normEmail });

    const updatedHistory = await OptimizationHistory.find({ userEmail: normEmail })
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      success: true,
      history: updatedHistory,
    });
  } catch (error) {
    console.error("[DELETE HISTORY ERROR]", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE Clear All Optimization History for a User from MongoDB
app.delete("/api/history/clear", async (req, res) => {
  try {
    const userEmail = req.query.userEmail || req.body.userEmail;
    if (!userEmail) {
      return res.status(400).json({ success: false, message: "userEmail is required" });
    }

    const normEmail = String(userEmail).trim().toLowerCase();
    await OptimizationHistory.deleteMany({ userEmail: normEmail });

    res.json({
      success: true,
      message: "All history cleared from MongoDB",
      history: [],
    });
  } catch (error) {
    console.error("[CLEAR HISTORY ERROR]", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
