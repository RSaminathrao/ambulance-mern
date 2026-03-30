const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const AmbulanceRequest = require("../models/AmbulanceRequest");
const Driver = require("../models/Driver");
const Trip = require("../models/Trip");

const DriverLocation = require("./models/DriverLocation");
const RequestLocation = require("./models/RequestLocation");
const DispatchAudit = require("./models/DispatchAudit");

const {
  TAMIL_NADU_BBOX,
  GRID_STEP,
  DISPATCH_INTERVAL_MS,
  MAX_REQUESTS_PER_CYCLE,
} = require("./config");
const {
  deterministicPointInBbox,
  isInsideBbox,
  normalizePointToBbox,
} = require("./utils/geo");
const { findAStarDistanceKm } = require("./utils/astar");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const EARNING_MAP = {
  "Basic Life Support": 500,
  "Advanced Life Support": 1000,
  "Non Emergency": 200,
};
const EARNING_PER_KM = 10;

function calculateTripEarnings(ambulanceType, distanceKm = 0) {
  const baseEarning = EARNING_MAP[ambulanceType] || 0;
  const distanceBonus = Math.round(Number(distanceKm || 0) * EARNING_PER_KM);
  return baseEarning + distanceBonus;
}

let cycleInProgress = false;
let timer = null;

function asLatLon(geoDoc) {
  const [lon, lat] = geoDoc.location.coordinates;
  return { lat, lon };
}

async function getOrCreateDriverLocation(driver) {
  const existing = await DriverLocation.findOne({ driverId: driver._id });
  if (existing) {
    const point = asLatLon(existing);
    if (isInsideBbox(point, TAMIL_NADU_BBOX)) return point;

    const normalized = normalizePointToBbox(point, TAMIL_NADU_BBOX);
    existing.location = {
      type: "Point",
      coordinates: [normalized.lon, normalized.lat],
    };
    existing.updatedAt = new Date();
    await existing.save();
    return normalized;
  }

  const autoPoint = deterministicPointInBbox(
    `${driver._id}:${driver.phone}:${driver.ambulanceNumber}`,
    TAMIL_NADU_BBOX
  );

  await DriverLocation.create({
    driverId: driver._id,
    location: { type: "Point", coordinates: [autoPoint.lon, autoPoint.lat] },
    source: "auto",
    updatedAt: new Date(),
  });

  return autoPoint;
}

async function getOrCreateRequestLocation(request) {
  const existing = await RequestLocation.findOne({ requestId: request._id });
  if (existing) {
    const point = asLatLon(existing);
    if (isInsideBbox(point, TAMIL_NADU_BBOX)) return point;

    const normalized = normalizePointToBbox(point, TAMIL_NADU_BBOX);
    existing.location = {
      type: "Point",
      coordinates: [normalized.lon, normalized.lat],
    };
    existing.updatedAt = new Date();
    await existing.save();
    return normalized;
  }

  const autoPoint = deterministicPointInBbox(
    `${request._id}:${request.callerPhone}:${request.callerName}`,
    TAMIL_NADU_BBOX
  );

  await RequestLocation.create({
    requestId: request._id,
    location: { type: "Point", coordinates: [autoPoint.lon, autoPoint.lat] },
    source: "auto",
    updatedAt: new Date(),
  });

  return autoPoint;
}

async function writeAudit({
  requestId,
  selectedDriverId = null,
  status,
  reason,
  candidateCount = 0,
  distanceKm = null,
  metadata = {},
}) {
  await DispatchAudit.create({
    requestId,
    selectedDriverId,
    status,
    reason,
    candidateCount,
    distanceKm,
    metadata,
  });
}

async function assignDriver(request, driver, distanceKm, candidateCount) {
  const lockedRequest = await AmbulanceRequest.findOneAndUpdate(
    {
      _id: request._id,
      status: "Pending",
      assignedDriver: null,
    },
    {
      $set: {
        assignedDriver: driver._id,
        status: "Assigned",
      },
    },
    { new: true }
  );

  if (!lockedRequest) {
    await writeAudit({
      requestId: request._id,
      selectedDriverId: driver._id,
      status: "skipped",
      reason: "request_already_processed",
      candidateCount,
      distanceKm,
    });
    return false;
  }

  const lockedDriver = await Driver.findOneAndUpdate(
    {
      _id: driver._id,
      availabilityStatus: "Available",
      ambulanceType: request.injuryType,
    },
    {
      $set: { availabilityStatus: "Offline" },
    },
    { new: true }
  );

  if (!lockedDriver) {
    await AmbulanceRequest.updateOne(
      { _id: request._id, assignedDriver: driver._id, status: "Assigned" },
      { $set: { assignedDriver: null, status: "Pending" } }
    );

    await writeAudit({
      requestId: request._id,
      selectedDriverId: driver._id,
      status: "failed",
      reason: "driver_lock_failed",
      candidateCount,
      distanceKm,
    });
    return false;
  }

  await Trip.create({
    driverId: driver._id,
    date: new Date(),
    ambulanceType: request.injuryType,
    earnings: calculateTripEarnings(request.injuryType),
    requestId: request._id,
  });

  await writeAudit({
    requestId: request._id,
    selectedDriverId: driver._id,
    status: "assigned",
    reason: "nearest_driver_selected",
    candidateCount,
    distanceKm,
  });

  console.log(
    `[dispatch-worker] assigned request=${request._id} driver=${driver._id} distanceKm=${distanceKm.toFixed(
      2
    )}`
  );
  return true;
}

async function dispatchOneRequest(request) {
  const eligibleDrivers = await Driver.find({
    availabilityStatus: "Available",
    ambulanceType: request.injuryType,
  });

  if (eligibleDrivers.length === 0) {
    await writeAudit({
      requestId: request._id,
      status: "skipped",
      reason: "no_eligible_driver",
      candidateCount: 0,
    });
    return;
  }

  const requestLocation = await getOrCreateRequestLocation(request);

  const candidates = [];
  for (const driver of eligibleDrivers) {
    const driverLocation = await getOrCreateDriverLocation(driver);
    const { distanceKm } = findAStarDistanceKm(
      requestLocation,
      driverLocation,
      TAMIL_NADU_BBOX,
      GRID_STEP
    );

    if (Number.isFinite(distanceKm)) {
      candidates.push({ driver, distanceKm });
    }
  }

  if (candidates.length === 0) {
    await writeAudit({
      requestId: request._id,
      status: "failed",
      reason: "astar_unreachable",
      candidateCount: eligibleDrivers.length,
    });
    return;
  }

  candidates.sort((left, right) => left.distanceKm - right.distanceKm);
  const winner = candidates[0];
  await assignDriver(request, winner.driver, winner.distanceKm, candidates.length);
}

async function runDispatchCycle() {
  if (cycleInProgress) return;
  cycleInProgress = true;

  try {
    const pendingRequests = await AmbulanceRequest.find({
      status: "Pending",
      assignedDriver: null,
    })
      .sort({ createdAt: 1 })
      .limit(MAX_REQUESTS_PER_CYCLE);

    if (pendingRequests.length === 0) return;

    console.log(
      `[dispatch-worker] cycle: pending=${pendingRequests.length}, intervalMs=${DISPATCH_INTERVAL_MS}`
    );

    for (const request of pendingRequests) {
      try {
        await dispatchOneRequest(request);
      } catch (error) {
        await writeAudit({
          requestId: request._id,
          status: "failed",
          reason: "dispatch_exception",
          metadata: { message: error.message },
        });
      }
    }
  } catch (error) {
    console.error("[dispatch-worker] cycle failed:", error.message);
  } finally {
    cycleInProgress = false;
  }
}

async function start() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required in server/.env");
  }

  await mongoose.connect(mongoUri);
  console.log("[dispatch-worker] MongoDB connected");
  console.log(
    `[dispatch-worker] A* enabled, bbox=Tamil Nadu, gridStep=${GRID_STEP}, maxPerCycle=${MAX_REQUESTS_PER_CYCLE}`
  );

  await runDispatchCycle();
  timer = setInterval(runDispatchCycle, DISPATCH_INTERVAL_MS);
}

async function stop() {
  if (timer) clearInterval(timer);
  await mongoose.connection.close();
  console.log("[dispatch-worker] stopped");
}

process.on("SIGINT", async () => {
  await stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await stop();
  process.exit(0);
});

start().catch((error) => {
  console.error("[dispatch-worker] failed to start:", error.message);
  process.exit(1);
});
