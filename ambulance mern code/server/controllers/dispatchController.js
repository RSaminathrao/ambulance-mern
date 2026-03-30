const AmbulanceRequest = require("../models/AmbulanceRequest");
const Driver = require("../models/Driver");

const DriverLocation = require("../dispatch-worker/models/DriverLocation");
const RequestLocation = require("../dispatch-worker/models/RequestLocation");
const DispatchAudit = require("../dispatch-worker/models/DispatchAudit");
const { TAMIL_NADU_BBOX } = require("../dispatch-worker/config");

function toLatLon(locationDoc) {
  if (!locationDoc?.location?.coordinates) return null;
  const [lon, lat] = locationDoc.location.coordinates;
  return { lat, lon };
}

const getDispatchMapData = async (_, res) => {
  try {
    const [availableDrivers, pendingRequests, recentAudits] = await Promise.all([
      Driver.find({ availabilityStatus: "Available" }).sort({ updatedAt: -1 }),
      AmbulanceRequest.find({ status: "Pending" }).sort({ createdAt: -1 }).limit(100),
      DispatchAudit.find({ status: "assigned" }).sort({ createdAt: -1 }).limit(100),
    ]);

    const driverIds = availableDrivers.map((driver) => driver._id);
    const requestIds = pendingRequests.map((request) => request._id);
    const assignedRequestIds = recentAudits.map((audit) => audit.requestId);
    const assignedDriverIds = recentAudits
      .map((audit) => audit.selectedDriverId)
      .filter(Boolean);

    const [
      availableDriverLocations,
      pendingRequestLocations,
      assignedRequests,
      assignedDrivers,
      assignedRequestLocations,
      assignedDriverLocations,
    ] = await Promise.all([
      DriverLocation.find({ driverId: { $in: driverIds } }),
      RequestLocation.find({ requestId: { $in: requestIds } }),
      AmbulanceRequest.find({ _id: { $in: assignedRequestIds } }).populate(
        "assignedDriver",
        "name phone ambulanceType ambulanceNumber"
      ),
      Driver.find({ _id: { $in: assignedDriverIds } }),
      RequestLocation.find({ requestId: { $in: assignedRequestIds } }),
      DriverLocation.find({ driverId: { $in: assignedDriverIds } }),
    ]);

    const driverLocationMap = new Map(
      availableDriverLocations.map((locationDoc) => [
        String(locationDoc.driverId),
        toLatLon(locationDoc),
      ])
    );
    const requestLocationMap = new Map(
      pendingRequestLocations.map((locationDoc) => [
        String(locationDoc.requestId),
        toLatLon(locationDoc),
      ])
    );
    const assignedRequestLocationMap = new Map(
      assignedRequestLocations.map((locationDoc) => [
        String(locationDoc.requestId),
        toLatLon(locationDoc),
      ])
    );
    const assignedDriverLocationMap = new Map(
      assignedDriverLocations.map((locationDoc) => [
        String(locationDoc.driverId),
        toLatLon(locationDoc),
      ])
    );
    const assignedDriverMap = new Map(
      assignedDrivers.map((driver) => [String(driver._id), driver])
    );
    const assignedRequestMap = new Map(
      assignedRequests.map((request) => [String(request._id), request])
    );

    const drivers = availableDrivers
      .map((driver) => {
        const location = driverLocationMap.get(String(driver._id));
        if (!location) return null;
        return {
          _id: driver._id,
          name: driver.name,
          ambulanceType: driver.ambulanceType,
          ambulanceNumber: driver.ambulanceNumber,
          availabilityStatus: driver.availabilityStatus,
          location,
        };
      })
      .filter(Boolean);

    const requests = pendingRequests
      .map((request) => {
        const location = requestLocationMap.get(String(request._id));
        if (!location) return null;
        return {
          _id: request._id,
          patientName: request.patientName,
          callerName: request.callerName,
          callerPhone: request.callerPhone,
          injuryType: request.injuryType,
          status: request.status,
          location,
        };
      })
      .filter(Boolean);

    const assignments = recentAudits
      .map((audit) => {
        if (!audit.requestId || !audit.selectedDriverId) return null;
        const request = assignedRequestMap.get(String(audit.requestId));
        const driver = assignedDriverMap.get(String(audit.selectedDriverId));
        const requestLocation = assignedRequestLocationMap.get(String(audit.requestId));
        const driverLocation = assignedDriverLocationMap.get(String(audit.selectedDriverId));
        if (!request || !driver || !requestLocation || !driverLocation) return null;

        return {
          requestId: request._id,
          driverId: driver._id,
          patientName: request.patientName,
          callerName: request.callerName,
          injuryType: request.injuryType,
          ambulanceNumber: driver.ambulanceNumber,
          driverName: driver.name,
          distanceKm: audit.distanceKm,
          assignedAt: audit.createdAt,
          requestLocation,
          driverLocation,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      district: {
        name: "Tamil Nadu",
        bounds: TAMIL_NADU_BBOX,
      },
      counts: {
        availableDrivers: drivers.length,
        pendingRequests: requests.length,
        recentAssignments: assignments.length,
      },
      drivers,
      requests,
      assignments,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDispatchMapData,
};
