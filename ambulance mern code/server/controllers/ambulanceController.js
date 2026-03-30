const AmbulanceRequest = require("../models/AmbulanceRequest");
const Driver = require("../models/Driver");
const RequestLocation = require("../dispatch-worker/models/RequestLocation");
const { TAMIL_NADU_BBOX } = require("../dispatch-worker/config");

function parseCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isInsideTamilNadu(lat, lon) {
  return (
    lat >= TAMIL_NADU_BBOX.minLat &&
    lat <= TAMIL_NADU_BBOX.maxLat &&
    lon >= TAMIL_NADU_BBOX.minLon &&
    lon <= TAMIL_NADU_BBOX.maxLon
  );
}

const bookAmbulance = async (req, res) => {
  try {
    const { patientName, callerName, callerPhone, injuryType, latitude, longitude } =
      req.body;

    if (
      !patientName ||
      !callerName ||
      !callerPhone ||
      !injuryType ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const lat = parseCoordinate(latitude);
    const lon = parseCoordinate(longitude);
    if (lat === null || lon === null) {
      return res.status(400).json({ message: "Valid latitude and longitude are required." });
    }

    if (!isInsideTamilNadu(lat, lon)) {
      return res.status(400).json({
        message: "Location must be within Tamil Nadu bounds.",
      });
    }

    const request = await AmbulanceRequest.create({
      patientName,
      callerName,
      callerPhone,
      injuryType,
      status: "Pending",
    });

    await RequestLocation.findOneAndUpdate(
      { requestId: request._id },
      {
        $set: {
          location: { type: "Point", coordinates: [lon, lat] },
          source: "manual",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({
      message: "Ambulance request created successfully.",
      request,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getRequests = async (_, res) => {
  try {
    const requests = await AmbulanceRequest.find()
      .populate("assignedDriver", "name phone ambulanceNumber ambulanceType")
      .sort({ createdAt: -1 });

    return res.status(200).json(requests);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const trackAmbulance = async (req, res) => {
  try {
    const { callerName, callerPhone } = req.query;

    if (!callerName || !callerPhone) {
      return res
        .status(400)
        .json({ message: "callerName and callerPhone are required." });
    }

    const request = await AmbulanceRequest.findOne({
      callerName: { $regex: `^${callerName}$`, $options: "i" },
      callerPhone,
    }).populate("assignedDriver", "name phone ambulanceNumber ambulanceType");

    if (!request) {
      return res.status(404).json({ message: "No request found." });
    }

    if (!request.assignedDriver) {
      return res.status(200).json({
        status: request.status,
        message: "Request found, ambulance not assigned yet.",
      });
    }

    return res.status(200).json({
      status: request.status,
      ambulanceNumber: request.assignedDriver.ambulanceNumber,
      ambulanceType: request.assignedDriver.ambulanceType,
      driverName: request.assignedDriver.name,
      driverPhone: request.assignedDriver.phone,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAvailableDrivers = async (_, res) => {
  try {
    const drivers = await Driver.find({
      availabilityStatus: "Available",
      verificationStatus: "Verified",
    }).sort({
      createdAt: -1,
    });
    return res.status(200).json(drivers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  bookAmbulance,
  getRequests,
  trackAmbulance,
  getAvailableDrivers,
};
