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
      enum: ["trial", "premium_plus", "expired"],
      default: "trial",
    },
    isTrial: {
      type: Boolean,
      default: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    paymentId: String,
    orderId: String,
    signature: String,
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    startDate: {
      type: Number,
      default: () => Date.now(),
    },
    expiryDate: {
      type: Number,
      default: () => Date.now() + 30 * 24 * 60 * 60 * 1000,
    },
    remindersSent: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
