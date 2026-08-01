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

// GET Subscription Status from MongoDB
app.get("/api/subscription", async (req, res) => {
  try {
    const { userEmail } = req.query;
    if (!userEmail) {
      return res.status(400).json({ success: false, message: "userEmail is required" });
    }

    const normEmail = String(userEmail).trim().toLowerCase();
    const sub = await Subscription.findOne({ userEmail: normEmail });
    const now = Date.now();

    if (!sub) {
      return res.json({
        success: true,
        state: {
          plan: "unsubscribed",
          status: "expired",
          startedAt: null,
          expiresAt: null,
          daysRemaining: 0,
          isUnlimited: false,
        },
      });
    }

    const isExpired = now >= sub.expiryDate;
    const daysRemaining = isExpired ? 0 : Math.ceil((sub.expiryDate - now) / (1000 * 60 * 60 * 24));

    if (isExpired && sub.status === "active") {
      sub.status = "expired";
      await sub.save();
    }

    res.json({
      success: true,
      state: {
        plan: isExpired ? "unsubscribed" : sub.plan,
        status: sub.status,
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
