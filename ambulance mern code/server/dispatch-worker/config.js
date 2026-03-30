const { TAMIL_NADU_BBOX } = require("../constants/geo");

const GRID_STEP = Number(process.env.DISPATCH_GRID_STEP || 0.01);
const DISPATCH_INTERVAL_MS = Number(process.env.DISPATCH_INTERVAL_MS || 45000);
const MAX_REQUESTS_PER_CYCLE = Number(process.env.DISPATCH_MAX_REQUESTS || 10);

module.exports = {
  TAMIL_NADU_BBOX,
  GRID_STEP,
  DISPATCH_INTERVAL_MS,
  MAX_REQUESTS_PER_CYCLE,
};
