const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
require("dotenv").config();
const sendEmail = require("./utils/sendEmail");
const connectDB = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

//send email

app.get("/test-email", async (req, res) => {
  try {
    await sendEmail();
    res.send("Test email sent successfully.");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to send email.");
  }
});


//razorpay genrate orderid

app.post("/order", async (req, res) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { plan } = req.body;

    const prices = {
      premium: 1,
      premium_plus: 1,
    };

    if (!prices[plan]) {
      return res.status(400).json({
        message: "Invalid Plan",
      });
    }

    const options = {
      amount: prices[plan] * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    console.log(options);

    const order = await razorpay.orders.create(options);

    res.json(order);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


const crypto = require("crypto");

app.post("/verify-payment", async (req, res) => {
  try {
    const {
      email,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      plan,
    } = req.body;

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

    const amount = plan === "premium" ? 1 : 1;

    // Send Email
    await sendEmail(
      email,
      razorpay_payment_id,
      amount,
      plan
    );

    res.json({
      success: true,
      message: "Payment verified and email sent successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});