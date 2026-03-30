const mongoose = require("mongoose");

const driverLocationSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      unique: true,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    source: {
      type: String,
      enum: ["auto", "manual", "gps"],
      default: "auto",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

driverLocationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("DriverLocation", driverLocationSchema);
