const express = require("express");
const { getDispatchMapData } = require("../controllers/dispatchController");

const router = express.Router();

router.get("/map-data", getDispatchMapData);

module.exports = router;
