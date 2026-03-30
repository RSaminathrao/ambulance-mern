import { useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import Card from "./Card";
import { TAMIL_NADU_CENTER } from "../constants/geo";

const driverPinIcon = L.divIcon({
  className: "pin-icon-wrapper",
  html: '<span class="map-pin map-pin-blue"></span>',
  iconSize: [26, 36],
  iconAnchor: [13, 36],
});

const requestPinIcon = L.divIcon({
  className: "pin-icon-wrapper",
  html: '<span class="map-pin map-pin-red"></span>',
  iconSize: [26, 36],
  iconAnchor: [13, 36],
});

function DispatchMapPanel({ data }) {
  const bounds = useMemo(() => {
    const regionBounds = data?.district?.bounds;
    if (!regionBounds) return null;
    return [
      [regionBounds.minLat, regionBounds.minLon],
      [regionBounds.maxLat, regionBounds.maxLon],
    ];
  }, [data]);

  return (
    <>
      <div className="rounded-xl border border-red-100 bg-white px-3 py-2 shadow-card">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md bg-green-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">
              Available Drivers
            </p>
            <p className="text-base font-bold text-green-800">{data?.counts?.availableDrivers || 0}</p>
          </div>
          <div className="rounded-md bg-yellow-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-yellow-700">
              Pending Requests
            </p>
            <p className="text-base font-bold text-yellow-800">{data?.counts?.pendingRequests || 0}</p>
          </div>
          <div className="rounded-md bg-pink-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-pink-700">
              Recent Assignments
            </p>
            <p className="text-base font-bold text-pink-800">{data?.counts?.recentAssignments || 0}</p>
          </div>
        </div>
      </div>

      <Card>
        <div className="h-[520px] w-full overflow-hidden rounded-xl">
          <MapContainer
            center={TAMIL_NADU_CENTER}
            zoom={7}
            style={{ height: "100%", width: "100%" }}
            maxBounds={bounds || undefined}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {(data?.drivers || []).map((driver) => (
              <Marker
                key={`driver-${driver._id}`}
                position={[driver.location.lat, driver.location.lon]}
                icon={driverPinIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">Driver: {driver.name}</p>
                    <p>Ambulance: {driver.ambulanceNumber}</p>
                    <p>Type: {driver.ambulanceType}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {(data?.requests || []).map((request) => (
              <Marker
                key={`request-${request._id}`}
                position={[request.location.lat, request.location.lon]}
                icon={requestPinIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">Request: {request.patientName}</p>
                    <p>Caller: {request.callerName}</p>
                    <p>Type: {request.injuryType}</p>
                    <p>Status: {request.status}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {(data?.assignments || []).slice(0, 25).map((assignment) => (
              <Polyline
                key={`line-${assignment.requestId}-${assignment.driverId}-${assignment.assignedAt}`}
                positions={[
                  [assignment.requestLocation.lat, assignment.requestLocation.lon],
                  [assignment.driverLocation.lat, assignment.driverLocation.lon],
                ]}
                pathOptions={{ color: "#7c3aed", weight: 3, opacity: 0.8 }}
              />
            ))}
          </MapContainer>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Blue markers: available drivers | Red markers: pending requests | Purple lines: recent driver
          assignments.
        </p>
      </Card>
    </>
  );
}

export default DispatchMapPanel;
