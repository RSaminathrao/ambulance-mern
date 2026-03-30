const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    date: { type: Date, required: true, default: Date.now },
    ambulanceType: {
      type: String,
      required: true,
      enum: ["Basic Life Support", "Advanced Life Support", "Non Emergency"],
    },
    earnings: { type: Number, required: true },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AmbulanceRequest",
      default: null,
    },
    previousDriverLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    selectedHospital: {
      name: { type: String, default: null },
      city: { type: String, default: null },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      distanceKm: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trip", tripSchema);
