const AmbulanceRequest = require("../models/AmbulanceRequest");
const Driver = require("../models/Driver");
const Trip = require("../models/Trip");
const { calculateTripEarnings } = require("./driverController");

function toDriverAdminView(driver) {
  return {
    _id: driver._id,
    name: driver.name,
    licenseNumber: driver.licenseNumber,
    phone: driver.phone,
    ambulanceNumber: driver.ambulanceNumber,
    ambulanceType: driver.ambulanceType,
    availabilityStatus: driver.availabilityStatus,
    verificationStatus: driver.verificationStatus,
    licenseImage: driver.licenseImage,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt,
  };
}

const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@ambulance.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ message: "Invalid admin credentials." });
  }

  return res.status(200).json({
    message: "Admin login successful.",
    admin: { email: adminEmail },
  });
};

const assignDriver = async (req, res) => {
  try {
    const { requestId, driverId } = req.body;

    if (!requestId || !driverId) {
      return res.status(400).json({ message: "requestId and driverId are required." });
    }

    const request = await AmbulanceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }
    if (request.status === "Assigned" || request.status === "Completed") {
      return res.status(400).json({ message: "Request already assigned/completed." });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found." });
    }

    if (driver.verificationStatus !== "Verified") {
      return res.status(400).json({ message: "Driver is not approved by admin." });
    }

    if (driver.availabilityStatus !== "Available") {
      return res.status(400).json({ message: "Driver is not available." });
    }

    if (driver.ambulanceType !== request.injuryType) {
      return res.status(400).json({
        message: "Driver ambulance type does not match requested injury type.",
      });
    }

    request.assignedDriver = driver._id;
    request.status = "Assigned";
    await request.save();

    driver.availabilityStatus = "Offline";
    await driver.save();

    await Trip.create({
      driverId: driver._id,
      date: new Date(),
      ambulanceType: request.injuryType,
      earnings: calculateTripEarnings(request.injuryType),
      requestId: request._id,
    });

    return res.status(200).json({ message: "Driver assigned successfully." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDrivers = async (req, res) => {
  try {
    const { verificationStatus } = req.query;
    const filter = {};

    if (verificationStatus) {
      filter.verificationStatus = verificationStatus;
    }

    const drivers = await Driver.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(drivers.map(toDriverAdminView));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateDriverVerificationStatus = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { verificationStatus } = req.body;

    if (!["Verified", "Rejected"].includes(verificationStatus)) {
      return res.status(400).json({ message: "Invalid verification status." });
    }

    const update = { verificationStatus };
    if (verificationStatus === "Rejected") {
      update.availabilityStatus = "Offline";
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { $set: update },
      { new: true }
    );
    if (!driver) {
      return res.status(404).json({ message: "Driver not found." });
    }

    return res.status(200).json({
      message:
        verificationStatus === "Verified"
          ? "Driver approved successfully."
          : "Driver rejected successfully.",
      driver: toDriverAdminView(driver),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  loginAdmin,
  assignDriver,
  getDrivers,
  updateDriverVerificationStatus,
};
