import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import { dispatchService } from "../services/api";
import { TAMIL_NADU_CENTER } from "../constants/geo";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const driverIcon = new L.Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "leaflet-driver-marker",
});

const requestIcon = new L.Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "leaflet-request-marker",
});

function DispatchMapPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  const loadData = async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      else setLoading(true);
      const response = await dispatchService.getMapData();
      setData(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load dispatch map.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(true), 15000);
    return () => clearInterval(timer);
  }, []);

  const bounds = useMemo(() => {
    const regionBounds = data?.district?.bounds;
    if (!regionBounds) return null;
    return [
      [regionBounds.minLat, regionBounds.minLon],
      [regionBounds.maxLat, regionBounds.maxLon],
    ];
  }, [data]);

  return (
    <div className="page-shell">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Dispatch Map - Tamil Nadu</h1>
          <Button onClick={() => loadData(true)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {loading ? (
          <Card>
            <LoadingSpinner text="Loading dispatch map..." />
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card title="Available Drivers">
                <p className="text-2xl font-bold text-green-700">{data?.counts?.availableDrivers || 0}</p>
              </Card>
              <Card title="Pending Requests">
                <p className="text-2xl font-bold text-yellow-700">{data?.counts?.pendingRequests || 0}</p>
              </Card>
              <Card title="Recent Assignments">
                <p className="text-2xl font-bold text-medical-700">{data?.counts?.recentAssignments || 0}</p>
              </Card>
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
                      icon={driverIcon}
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
                      icon={requestIcon}
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
                Blue markers: available drivers | Red markers: pending requests | Purple lines: recent
                driver assignments.
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default DispatchMapPage;
