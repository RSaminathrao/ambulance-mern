const mongoose = require("mongoose");

const dispatchAuditSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AmbulanceRequest",
      required: true,
      index: true,
    },
    selectedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    algorithm: {
      type: String,
      default: "A*",
    },
    candidateCount: {
      type: Number,
      default: 0,
    },
    distanceKm: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["assigned", "skipped", "failed"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DispatchAudit", dispatchAuditSchema);
