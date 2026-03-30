const mongoose = require("mongoose");

const ambulanceRequestSchema = new mongoose.Schema(
  {
    patientName: { type: String, required: true, trim: true },
    callerName: { type: String, required: true, trim: true },
    callerPhone: { type: String, required: true, trim: true },
    injuryType: {
      type: String,
      required: true,
      enum: ["Basic Life Support", "Advanced Life Support", "Non Emergency"],
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Assigned", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AmbulanceRequest", ambulanceRequestSchema);
