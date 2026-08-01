const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URL;
    if (!mongoUrl) {
      console.warn("⚠️ MONGODB_URL environment variable is not defined");
      return;
    }
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.warn("⚠️ MongoDB Connection Notice:", error.message);
  }
};

module.exports = connectDB;
