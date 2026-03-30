const bcrypt = require("bcryptjs");

const Driver = require("../models/Driver");
const AmbulanceRequest = require("../models/AmbulanceRequest");
const Trip = require("../models/Trip");
const DriverLocation = require("../dispatch-worker/models/DriverLocation");
const RequestLocation = require("../dispatch-worker/models/RequestLocation");
const { TAMIL_NADU_BBOX } = require("../dispatch-worker/config");
const { TAMIL_NADU_HOSPITALS } = require("../constants/hospitals");

const EARNING_MAP = {
  "Basic Life Support": 500,
  "Advanced Life Support": 1000,
  "Non Emergency": 200,
};
const EARNING_PER_KM = 10;
const MAX_LICENSE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LICENSE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(from, to) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadiusKm * c;
}

function calculateTripEarnings(ambulanceType, distanceKm = 0) {
  const baseEarning = EARNING_MAP[ambulanceType] || 0;
  const distanceBonus = Math.round(Number(distanceKm || 0) * EARNING_PER_KM);
  return baseEarning + distanceBonus;
}

function getNearestHospitals(location, limit = 3) {
  if (!location) return [];

  return TAMIL_NADU_HOSPITALS.map((hospital) => ({
    ...hospital,
    distanceKm: haversineKm(location, {
      lat: hospital.latitude,
      lon: hospital.longitude,
    }),
  }))
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, limit)
    .map((hospital) => ({
      name: hospital.name,
      city: hospital.city,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      distanceKm: Number(hospital.distanceKm.toFixed(2)),
    }));
}

async function getDriverLocationSnapshot(driverId) {
  const locationDoc = await DriverLocation.findOne({ driverId });
  if (!locationDoc?.location?.coordinates) return null;

  const [longitude, latitude] = locationDoc.location.coordinates;
  return {
    latitude,
    longitude,
  };
}

function parseLicenseImage(licenseImage) {
  if (!licenseImage || typeof licenseImage !== "object") return null;

  const { dataUrl, fileName, mimeType } = licenseImage;
  if (
    typeof dataUrl !== "string" ||
    typeof fileName !== "string" ||
    typeof mimeType !== "string"
  ) {
    return null;
  }

  if (!ALLOWED_LICENSE_IMAGE_TYPES.has(mimeType)) {
    return { error: "License image must be a JPG, PNG, or WEBP file." };
  }

  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches[1] !== mimeType) {
    return { error: "License image data is invalid." };
  }

  const base64Payload = matches[2];
  const sizeInBytes = Buffer.byteLength(base64Payload, "base64");
  if (sizeInBytes > MAX_LICENSE_IMAGE_SIZE_BYTES) {
    return { error: "License image must be 5 MB or smaller." };
  }

  return {
    value: {
      dataUrl,
      fileName: fileName.trim(),
      mimeType,
      uploadedAt: new Date(),
    },
  };
}

function isInsideTamilNadu(lat, lon) {
  return (
    lat >= TAMIL_NADU_BBOX.minLat &&
    lat <= TAMIL_NADU_BBOX.maxLat &&
    lon >= TAMIL_NADU_BBOX.minLon &&
    lon <= TAMIL_NADU_BBOX.maxLon
  );
}

const registerDriver = async (req, res) => {
  try {
    const {
      name,
      licenseNumber,
      phone,
      ambulanceNumber,
      ambulanceType,
      password,
      licenseImage,
      latitude,
      longitude,
    } = req.body;

    if (
      !name ||
      !licenseNumber ||
      !phone ||
      !ambulanceNumber ||
      !ambulanceType ||
      !password ||
      !licenseImage ||
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
      return res
        .status(400)
        .json({ message: "Driver location must be within Tamil Nadu bounds." });
    }

    const parsedLicenseImage = parseLicenseImage(licenseImage);
    if (!parsedLicenseImage) {
      return res.status(400).json({ message: "License image is required." });
    }
    if (parsedLicenseImage.error) {
      return res.status(400).json({ message: parsedLicenseImage.error });
    }

    const existingDriver = await Driver.findOne({
      $or: [{ licenseNumber }, { ambulanceNumber }],
    });
    if (existingDriver) {
      return res.status(400).json({
        message: "Driver with this license or ambulance number already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const driver = await Driver.create({
      name,
      licenseNumber,
      phone,
      ambulanceNumber,
      ambulanceType,
      licenseImage: parsedLicenseImage.value,
      verificationStatus: "Pending",
      password: hashedPassword,
      availabilityStatus: "Offline",
    });

    await DriverLocation.findOneAndUpdate(
      { driverId: driver._id },
      {
        $set: {
          location: { type: "Point", coordinates: [lon, lat] },
          source: "manual",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return res
      .status(201)
      .json({ message: "Driver registered successfully.", driverId: driver._id });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const loginDriver = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required." });
    }

    const driver = await Driver.findOne({ phone });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found." });
    }

    if (driver.verificationStatus === "Pending") {
      return res.status(403).json({
        message: "Your registration is pending admin approval.",
      });
    }

    if (driver.verificationStatus === "Rejected") {
      return res.status(403).json({
        message: "Your registration was rejected by admin. Please contact support.",
      });
    }

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const location = await getDriverLocationSnapshot(driver._id);

    return res.status(200).json({
      message: "Driver login successful.",
      driver: {
        _id: driver._id,
        name: driver.name,
        phone: driver.phone,
        ambulanceNumber: driver.ambulanceNumber,
        ambulanceType: driver.ambulanceType,
        availabilityStatus: driver.availabilityStatus,
        verificationStatus: driver.verificationStatus,
        location,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateDriverLocation = async (req, res) => {
  try {
    const { driverId, latitude, longitude } = req.body;
    if (!driverId || latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ message: "driverId, latitude and longitude are required." });
    }

    const lat = parseCoordinate(latitude);
    const lon = parseCoordinate(longitude);
    if (lat === null || lon === null) {
      return res.status(400).json({ message: "Valid latitude and longitude are required." });
    }
    if (!isInsideTamilNadu(lat, lon)) {
      return res
        .status(400)
        .json({ message: "Driver location must be within Tamil Nadu bounds." });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: "Driver not found." });

    await DriverLocation.findOneAndUpdate(
      { driverId },
      {
        $set: {
          location: { type: "Point", coordinates: [lon, lat] },
          source: "manual",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: "Driver location updated.",
      location: { latitude: lat, longitude: lon },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDriverLocation = async (req, res) => {
  try {
    const { driverId } = req.query;
    if (!driverId) {
      return res.status(400).json({ message: "driverId is required." });
    }

    const locationDoc = await DriverLocation.findOne({ driverId });
    if (!locationDoc) {
      return res.status(404).json({ message: "Driver location not found." });
    }

    const [longitude, latitude] = locationDoc.location.coordinates;
    return res.status(200).json({
      driverId,
      latitude,
      longitude,
      updatedAt: locationDoc.updatedAt,
      source: locationDoc.source,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const { driverId, availabilityStatus } = req.body;

    if (!driverId || !availabilityStatus) {
      return res
        .status(400)
        .json({ message: "driverId and availabilityStatus are required." });
    }

    if (!["Available", "Offline"].includes(availabilityStatus)) {
      return res.status(400).json({ message: "Invalid availability status." });
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { availabilityStatus },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ message: "Driver not found." });
    }

    return res.status(200).json({
      message: "Availability updated.",
      availabilityStatus: driver.availabilityStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAssignedRequests = async (req, res) => {
  try {
    const { driverId } = req.query;
    if (!driverId) {
      return res.status(400).json({ message: "driverId is required." });
    }

    const requests = await AmbulanceRequest.find({
      assignedDriver: driverId,
    }).sort({ createdAt: -1 });

    const requestLocations = await RequestLocation.find({
      requestId: { $in: requests.map((request) => request._id) },
    });
    const trips = await Trip.find({
      driverId,
      requestId: { $in: requests.map((request) => request._id) },
    }).sort({ createdAt: -1 });
    const requestLocationMap = new Map(
      requestLocations.map((locationDoc) => {
        const [longitude, latitude] = locationDoc.location.coordinates;
        return [
          String(locationDoc.requestId),
          {
            latitude,
            longitude,
          },
        ];
      })
    );
    const tripMap = new Map(
      trips.map((trip) => [String(trip.requestId), trip])
    );

    const enrichedRequests = requests.map((request) => {
      const patientLocation = requestLocationMap.get(String(request._id)) || null;
      const trip = tripMap.get(String(request._id)) || null;
      return {
        ...request.toObject(),
        patientLocation,
        selectedHospital: trip?.selectedHospital || null,
        nearestHospitals: patientLocation
          ? getNearestHospitals({
              lat: patientLocation.latitude,
              lon: patientLocation.longitude,
            })
          : [],
      };
    });

    return res.status(200).json(enrichedRequests);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDriverTrips = async (req, res) => {
  try {
    const { driverId, startDate, endDate } = req.query;
    if (!driverId) {
      return res.status(400).json({ message: "driverId is required." });
    }

    const filter = { driverId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const trips = await Trip.find(filter).sort({ date: -1 });
    return res.status(200).json(trips);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const selectHospitalForRequest = async (req, res) => {
  try {
    const { driverId, requestId, hospitalName } = req.body;

    if (!driverId || !requestId || !hospitalName) {
      return res
        .status(400)
        .json({ message: "driverId, requestId and hospitalName are required." });
    }

    const request = await AmbulanceRequest.findOne({
      _id: requestId,
      assignedDriver: driverId,
      status: "Assigned",
    });
    if (!request) {
      return res.status(404).json({ message: "Assigned request not found." });
    }

    const requestLocationDoc = await RequestLocation.findOne({ requestId });
    if (!requestLocationDoc?.location?.coordinates) {
      return res.status(404).json({ message: "Patient location not found." });
    }

    const [patientLongitude, patientLatitude] = requestLocationDoc.location.coordinates;
    const patientLocation = {
      lat: patientLatitude,
      lon: patientLongitude,
    };
    const nearestHospitals = getNearestHospitals(patientLocation);
    const selectedHospital = nearestHospitals.find((hospital) => hospital.name === hospitalName);

    if (!selectedHospital) {
      return res.status(400).json({ message: "Selected hospital is not in the suggested list." });
    }

    const previousLocation = await getDriverLocationSnapshot(driverId);
    if (!previousLocation) {
      return res.status(404).json({ message: "Driver current location not found." });
    }

    await DriverLocation.findOneAndUpdate(
      { driverId },
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [selectedHospital.longitude, selectedHospital.latitude],
          },
          source: "hospital-selection",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    await Trip.findOneAndUpdate(
      { driverId, requestId },
      {
        $set: {
          earnings: calculateTripEarnings(request.injuryType, selectedHospital.distanceKm),
          previousDriverLocation: previousLocation,
          selectedHospital: {
            name: selectedHospital.name,
            city: selectedHospital.city,
            latitude: selectedHospital.latitude,
            longitude: selectedHospital.longitude,
            distanceKm: selectedHospital.distanceKm,
          },
        },
      },
      { sort: { createdAt: -1 } }
    );

    return res.status(200).json({
      message: "Driver location updated to selected hospital.",
      location: {
        latitude: selectedHospital.latitude,
        longitude: selectedHospital.longitude,
      },
      selectedHospital,
      previousDriverLocation: previousLocation,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDriverEarnings = async (req, res) => {
  try {
    const { driverId, startDate, endDate } = req.query;
    if (!driverId) {
      return res.status(400).json({ message: "driverId is required." });
    }

    const filter = { driverId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const trips = await Trip.find(filter);
    const total = trips.reduce((sum, trip) => sum + trip.earnings, 0);

    return res.status(200).json({
      totalEarnings: total,
      totalTrips: trips.length,
      pricing: EARNING_MAP,
      distanceRatePerKm: EARNING_PER_KM,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerDriver,
  loginDriver,
  updateAvailability,
  updateDriverLocation,
  getDriverLocation,
  getAssignedRequests,
  getDriverTrips,
  getDriverEarnings,
  selectHospitalForRequest,
  calculateTripEarnings,
  EARNING_MAP,
  EARNING_PER_KM,
};
