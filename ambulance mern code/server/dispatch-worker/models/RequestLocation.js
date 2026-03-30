const mongoose = require("mongoose");

const requestLocationSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AmbulanceRequest",
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
      enum: ["auto", "manual"],
      default: "auto",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

requestLocationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("RequestLocation", requestLocationSchema);
