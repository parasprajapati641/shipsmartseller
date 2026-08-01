const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    plan: {
      type: String,
      default: "premium_plus",
    },
    amount: {
      type: Number,
      default: 999,
    },
    paymentId: String,
    orderId: String,
    signature: String,
    status: {
      type: String,
      enum: ["active", "expired"],
      default: "active",
    },
    startDate: {
      type: Number,
      default: () => Date.now(),
    },
    expiryDate: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
