const express = require("express");
const {
  registerDriver,
  loginDriver,
  updateAvailability,
  updateDriverLocation,
  getDriverLocation,
  getAssignedRequests,
  getDriverTrips,
  getDriverEarnings,
  selectHospitalForRequest,
} = require("../controllers/driverController");

const router = express.Router();

router.post("/register", registerDriver);
router.post("/login", loginDriver);
router.patch("/availability", updateAvailability);
router.patch("/location", updateDriverLocation);
router.get("/location", getDriverLocation);
router.get("/assigned-requests", getAssignedRequests);
router.get("/trips", getDriverTrips);
router.get("/earnings", getDriverEarnings);
router.patch("/select-hospital", selectHospitalForRequest);

module.exports = router;
