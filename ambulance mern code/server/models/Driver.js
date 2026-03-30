const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, required: true, trim: true },
    ambulanceNumber: { type: String, required: true, unique: true, trim: true },
    ambulanceType: {
      type: String,
      required: true,
      enum: ["Basic Life Support", "Advanced Life Support", "Non Emergency"],
    },
    licenseImage: {
      dataUrl: { type: String, required: true },
      fileName: { type: String, required: true, trim: true },
      mimeType: { type: String, required: true, trim: true },
      uploadedAt: { type: Date, default: Date.now },
    },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
    password: { type: String, required: true },
    availabilityStatus: {
      type: String,
      enum: ["Available", "Offline"],
      default: "Offline",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", driverSchema);
