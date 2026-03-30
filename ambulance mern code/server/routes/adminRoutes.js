const express = require("express");
const {
  loginAdmin,
  assignDriver,
  getDrivers,
  updateDriverVerificationStatus,
} = require("../controllers/adminController");
const { getRequests } = require("../controllers/ambulanceController");

const router = express.Router();

router.post("/login", loginAdmin);
router.get("/requests", getRequests);
router.get("/drivers", getDrivers);
router.post("/assign-driver", assignDriver);
router.patch("/drivers/:driverId/verification", updateDriverVerificationStatus);

module.exports = router;
