const mongoose = require("mongoose");

const historyVariantSchema = new mongoose.Schema(
  {
    targetKB: { type: Number, required: true },
    sizeKB: { type: Number, required: true },
    url: { type: String, required: true },
    strategyName: String,
    aspectRatio: String,
    marketplace: String,
    dimensions: {
      width: Number,
      height: Number,
    },
  },
  { _id: false }
);

const optimizationHistorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "apparel",
    },
    generationType: {
      type: String,
      default: "KB Presets",
    },
    createdAt: {
      type: Number,
      default: () => Date.now(),
      index: true,
    },
    thumb: {
      type: String,
      required: true,
    },
    originalUrl: String,
    variants: [historyVariantSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("OptimizationHistory", optimizationHistorySchema);
