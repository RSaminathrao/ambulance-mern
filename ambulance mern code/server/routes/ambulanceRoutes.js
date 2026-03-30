const express = require("express");
const {
  bookAmbulance,
  getRequests,
  trackAmbulance,
  getAvailableDrivers,
} = require("../controllers/ambulanceController");
const { assignDriver } = require("../controllers/adminController");

const router = express.Router();

router.post("/book", bookAmbulance);
router.get("/requests", getRequests);
router.get("/track", trackAmbulance);
router.get("/available-drivers", getAvailableDrivers);
router.post("/assign-driver", assignDriver);

module.exports = router;
