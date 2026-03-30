import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { Route, Routes, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import InputField from "../components/InputField";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";
import LoadingSpinner from "../components/LoadingSpinner";
import LocationPickerMap from "../components/LocationPickerMap";
import { driverService } from "../services/api";
import { TAMIL_NADU_BOUNDS, TAMIL_NADU_CENTER } from "../constants/geo";

const previousLocationIcon = L.divIcon({
  className: "pin-icon-wrapper",
  html: '<span class="map-pin map-pin-red"></span>',
  iconSize: [26, 36],
  iconAnchor: [13, 36],
});

const currentLocationIcon = L.divIcon({
  className: "pin-icon-wrapper",
  html: '<span class="map-pin map-pin-blue"></span>',
  iconSize: [26, 36],
  iconAnchor: [13, 36],
});

function FitRouteBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points?.length) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, points]);

  return null;
}

function DriverOverview({ driver, earnings }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card title="Driver">
        <p className="font-semibold text-gray-800">{driver.name}</p>
        <p className="text-sm text-gray-500">{driver.ambulanceNumber}</p>
        {driver?.location && (
          <p className="mt-1 text-xs text-gray-500">
            {driver.location.latitude}, {driver.location.longitude}
          </p>
        )}
      </Card>
      <Card title="Availability">
        <StatusBadge status={driver.availabilityStatus} />
      </Card>
      <Card title="Total Earnings">
        <p className="text-2xl font-bold text-medical-700">Rs. {earnings.totalEarnings || 0}</p>
      </Card>
    </div>
  );
}

function DriverAssignedRequests({ requests, onSelectHospital, selectingHospitalRequestId }) {
  const columns = [
    { key: "patientName", label: "Patient" },
    { key: "callerName", label: "Caller" },
    { key: "callerPhone", label: "Phone" },
    { key: "injuryType", label: "Type" },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "nearestHospitals",
      label: "Hospital",
      render: (row) => {
        if (row.selectedHospital?.name) {
          return (
            <div className="space-y-1 text-xs text-gray-700">
              <p className="font-medium text-blue-700">Chosen Hospital</p>
              <p className="font-medium">{row.selectedHospital.name}</p>
              <p className="text-gray-500">
                {row.selectedHospital.city} | {row.selectedHospital.distanceKm} km
              </p>
            </div>
          );
        }

        if (!row.nearestHospitals?.length) {
          return <span className="text-xs text-gray-500">No suggestions available</span>;
        }

        return (
          <div className="space-y-1">
            {row.nearestHospitals.map((hospital) => (
              <div key={`${row._id}-${hospital.name}`} className="text-xs text-gray-700">
                <p className="font-medium">{hospital.name}</p>
                <p className="text-gray-500">
                  {hospital.city} | {hospital.distanceKm} km
                </p>
                <div className="mt-1">
                  <Button
                    className="px-2 py-1 text-xs"
                    disabled={selectingHospitalRequestId === row._id}
                    onClick={() => onSelectHospital(row._id, hospital)}
                  >
                    {selectingHospitalRequestId === row._id ? "Updating..." : "Choose Hospital"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );
      },
    },
  ];
  return <Table columns={columns} data={requests} />;
}

function TripLocationMap({ trip }) {
  const [routePoints, setRoutePoints] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);

  const previousLocation =
    trip.previousDriverLocation?.latitude !== null &&
    trip.previousDriverLocation?.longitude !== null
      ? [trip.previousDriverLocation.latitude, trip.previousDriverLocation.longitude]
      : null;

  const currentLocation =
    trip.selectedHospital?.latitude !== null && trip.selectedHospital?.longitude !== null
      ? [trip.selectedHospital.latitude, trip.selectedHospital.longitude]
      : null;

  useEffect(() => {
    let isCancelled = false;

    const loadRoute = async () => {
      if (!previousLocation || !currentLocation) {
        setRoutePoints([]);
        return;
      }

      try {
        setRouteLoading(true);
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${previousLocation[1]},${previousLocation[0]};${currentLocation[1]},${currentLocation[0]}?overview=full&steps=true&geometries=geojson`
        );
        const data = await response.json();
        const coordinates = data?.routes?.[0]?.geometry?.coordinates || [];

        if (!isCancelled) {
          setRoutePoints(coordinates.map(([longitude, latitude]) => [latitude, longitude]));
        }
      } catch (_) {
        if (!isCancelled) {
          setRoutePoints([]);
        }
      } finally {
        if (!isCancelled) {
          setRouteLoading(false);
        }
      }
    };

    loadRoute();

    return () => {
      isCancelled = true;
    };
  }, [trip._id, previousLocation, currentLocation]);

  if (!previousLocation || !currentLocation) {
    return <p className="text-xs text-gray-500">Map not available for this trip.</p>;
  }

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-xl border border-red-100">
      <MapContainer
        center={currentLocation || previousLocation || TAMIL_NADU_CENTER}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
      >
        <FitRouteBounds
          points={routePoints.length > 1 ? routePoints : [previousLocation, currentLocation]}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={previousLocation} icon={previousLocationIcon}>
          <Popup>Previous Driver Location</Popup>
        </Marker>
        <Marker position={currentLocation} icon={currentLocationIcon}>
          <Popup>{trip.selectedHospital?.name || "Current Hospital Location"}</Popup>
        </Marker>
        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: "#ef4444",
              weight: 5,
              opacity: 0.9,
              lineJoin: "round",
              lineCap: "round",
            }}
          />
        )}
      </MapContainer>
      {routeLoading && (
        <div className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-xs text-gray-600 shadow">
          Loading route...
        </div>
      )}
    </div>
  );
}

function DriverTrips({ trips, dateFilter, setDateFilter, onFilter }) {
  const [selectedTripId, setSelectedTripId] = useState(null);

  const columns = [
    { key: "date", label: "Date", render: (row) => new Date(row.date).toLocaleDateString() },
    { key: "ambulanceType", label: "Type" },
    { key: "earnings", label: "Earnings", render: (row) => `Rs. ${row.earnings}` },
  ];

  const selectedTrip = trips.find((trip) => trip._id === selectedTripId) || null;

  return (
    <div className="space-y-4">
      <Card title="Filter Trips">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={onFilter}>
          <InputField
            label="Start Date"
            name="startDate"
            type="date"
            value={dateFilter.startDate}
            onChange={(event) =>
              setDateFilter((prev) => ({ ...prev, startDate: event.target.value }))
            }
          />
          <InputField
            label="End Date"
            name="endDate"
            type="date"
            value={dateFilter.endDate}
            onChange={(event) =>
              setDateFilter((prev) => ({ ...prev, endDate: event.target.value }))
            }
          />
          <div className="flex items-end">
            <Button type="submit">Apply Filter</Button>
          </div>
        </form>
      </Card>
      <Table
        columns={columns}
        data={trips}
        renderActions={(row) => (
          <Button
            className="px-2 py-1 text-xs"
            onClick={() => setSelectedTripId((prev) => (prev === row._id ? null : row._id))}
          >
            {selectedTripId === row._id ? "Hide Summary" : "Trip Summary"}
          </Button>
        )}
      />
      {selectedTrip && (
        <Card
          title={`Trip Summary - ${new Date(selectedTrip.date).toLocaleDateString()}`}
          subtitle={selectedTrip.selectedHospital?.name || "No hospital selected"}
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                <p className="text-xs font-semibold text-gray-500">Ambulance Type</p>
                <p className="text-sm font-medium text-gray-800">{selectedTrip.ambulanceType}</p>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                <p className="text-xs font-semibold text-gray-500">Earnings</p>
                <p className="text-sm font-medium text-gray-800">Rs. {selectedTrip.earnings}</p>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                <p className="text-xs font-semibold text-gray-500">Hospital</p>
                <p className="text-sm font-medium text-gray-800">
                  {selectedTrip.selectedHospital?.name || "N/A"}
                </p>
              </div>
            </div>
            <TripLocationMap trip={selectedTrip} />
          </div>
        </Card>
      )}
    </div>
  );
}

function DriverEarnings({ earnings }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card title="Total Earnings">
        <p className="text-2xl font-bold text-medical-700">Rs. {earnings.totalEarnings || 0}</p>
      </Card>
      <Card title="Total Trips">
        <p className="text-2xl font-bold text-gray-800">{earnings.totalTrips || 0}</p>
      </Card>
    </div>
  );
}

function DriverOverviewSection({
  driver,
  earnings,
  locationForm,
  setLocationForm,
  onUpdateLocation,
  savingLocation,
}) {
  return (
    <div className="space-y-4">
      <DriverOverview driver={driver} earnings={earnings} />
      <DriverLocationCard
        locationForm={locationForm}
        setLocationForm={setLocationForm}
        onUpdate={onUpdateLocation}
        savingLocation={savingLocation}
      />
    </div>
  );
}

function DriverLocationCard({ locationForm, setLocationForm, onUpdate, savingLocation }) {
  const [showMapPicker, setShowMapPicker] = useState(false);

  const handleMapPick = ({ lat, lng }) => {
    setLocationForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  return (
    <Card title="Current Driver Location">
      <form
        className="grid gap-3 md:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          onUpdate();
        }}
      >
        <InputField
          label="Latitude"
          name="latitude"
          type="number"
          value={locationForm.latitude}
          onChange={(event) =>
            setLocationForm((prev) => ({ ...prev, latitude: event.target.value }))
          }
          required
        />
        <InputField
          label="Longitude"
          name="longitude"
          type="number"
          value={locationForm.longitude}
          onChange={(event) =>
            setLocationForm((prev) => ({ ...prev, longitude: event.target.value }))
          }
          required
        />
        <div className="flex items-end">
          <Button type="submit" disabled={savingLocation}>
            {savingLocation ? "Saving..." : "Update Location"}
          </Button>
        </div>
        <div className="md:col-span-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowMapPicker((prev) => !prev)}
          >
            {showMapPicker ? "Hide Map Picker" : "Choose on Map"}
          </Button>
        </div>
        {showMapPicker && (
          <div className="md:col-span-3">
            <LocationPickerMap
              title="Choose Current Location on Map"
              latitude={Number(locationForm.latitude)}
              longitude={Number(locationForm.longitude)}
              onPick={handleMapPick}
              bounds={TAMIL_NADU_BOUNDS}
            />
          </div>
        )}
      </form>
    </Card>
  );
}

function DriverDashboardPage() {
  const [driver, setDriver] = useState(() => JSON.parse(localStorage.getItem("driverSession") || "{}"));
  const [requests, setRequests] = useState([]);
  const [trips, setTrips] = useState([]);
  const [earnings, setEarnings] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingLocation, setSavingLocation] = useState(false);
  const [selectingHospitalRequestId, setSelectingHospitalRequestId] = useState(null);
  const [locationForm, setLocationForm] = useState({
    latitude: "",
    longitude: "",
  });
  const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });
  const navigate = useNavigate();

  const sidebarItems = useMemo(
    () => [
      { label: "Overview", path: "/driver-dashboard", exact: true },
      { label: "Assigned Requests", path: "/driver-dashboard/requests" },
      { label: "Trip History", path: "/driver-dashboard/trips" },
      { label: "Earnings", path: "/driver-dashboard/earnings" },
    ],
    []
  );

  const loadDashboard = async (filter = {}) => {
    try {
      setLoading(true);
      const params = { driverId: driver._id, ...filter };
      const [requestResponse, tripResponse, earningResponse] = await Promise.all([
        driverService.getAssignedRequests(driver._id),
        driverService.getTrips(params),
        driverService.getEarnings(params),
      ]);
      setRequests(requestResponse.data);
      setTrips(tripResponse.data);
      setEarnings(earningResponse.data);

      try {
        const locationResponse = await driverService.getLocation(driver._id);
        const location = {
          latitude: locationResponse.data.latitude,
          longitude: locationResponse.data.longitude,
        };
        setLocationForm({
          latitude: String(location.latitude),
          longitude: String(location.longitude),
        });
        const updatedDriver = { ...driver, location };
        setDriver(updatedDriver);
        localStorage.setItem("driverSession", JSON.stringify(updatedDriver));
      } catch (_) {
        // Location can be empty for legacy drivers; user can set manually.
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load driver dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!driver?._id) {
      navigate("/driver-login");
      return;
    }
    loadDashboard();
  }, [driver?._id]);

  useEffect(() => {
    if (driver?.location) {
      setLocationForm({
        latitude: String(driver.location.latitude),
        longitude: String(driver.location.longitude),
      });
    }
  }, [driver?.location?.latitude, driver?.location?.longitude]);

  const handleToggleAvailability = async () => {
    const nextStatus = driver.availabilityStatus === "Available" ? "Offline" : "Available";
    try {
      await driverService.updateAvailability({ driverId: driver._id, availabilityStatus: nextStatus });
      const updated = { ...driver, availabilityStatus: nextStatus };
      setDriver(updated);
      localStorage.setItem("driverSession", JSON.stringify(updated));
      toast.success(`Status changed to ${nextStatus}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to update status.");
    }
  };

  const handleFilterTrips = async (event) => {
    event.preventDefault();
    await loadDashboard(dateFilter);
  };

  const handleUpdateLocation = async () => {
    const latitude = Number(locationForm.latitude);
    const longitude = Number(locationForm.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast.error("Valid latitude and longitude are required.");
      return;
    }
    if (
      latitude < TAMIL_NADU_BOUNDS.minLat ||
      latitude > TAMIL_NADU_BOUNDS.maxLat ||
      longitude < TAMIL_NADU_BOUNDS.minLon ||
      longitude > TAMIL_NADU_BOUNDS.maxLon
    ) {
      toast.error("Driver location must be within Tamil Nadu.");
      return;
    }

    try {
      setSavingLocation(true);
      await driverService.updateLocation({
        driverId: driver._id,
        latitude,
        longitude,
      });
      const updatedDriver = {
        ...driver,
        location: { latitude, longitude },
      };
      setDriver(updatedDriver);
      localStorage.setItem("driverSession", JSON.stringify(updatedDriver));
      toast.success("Driver location updated.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to update location.");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("driverSession");
    navigate("/driver-login");
  };

  const handleSelectHospital = async (requestId, hospital) => {
    try {
      setSelectingHospitalRequestId(requestId);
      const response = await driverService.selectHospital({
        driverId: driver._id,
        requestId,
        hospitalName: hospital.name,
      });
      const updatedDriver = {
        ...driver,
        location: response.data.location,
      };
      setDriver(updatedDriver);
      localStorage.setItem("driverSession", JSON.stringify(updatedDriver));
      setLocationForm({
        latitude: String(response.data.location.latitude),
        longitude: String(response.data.location.longitude),
      });
      toast.success("Hospital selected and driver location updated.");
      await loadDashboard(dateFilter);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to select hospital.");
    } finally {
      setSelectingHospitalRequestId(null);
    }
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Driver Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={handleToggleAvailability}>
            {driver.availabilityStatus === "Available" ? "Set Offline" : "Set Available"}
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <LoadingSpinner text="Loading driver data..." />
        </Card>
      ) : (
        <Routes>
          <Route
            index
            element={
              <DriverOverviewSection
                driver={driver}
                earnings={earnings}
                locationForm={locationForm}
                setLocationForm={setLocationForm}
                onUpdateLocation={handleUpdateLocation}
                savingLocation={savingLocation}
              />
            }
          />
          <Route
            path="requests"
            element={
              <DriverAssignedRequests
                requests={requests}
                onSelectHospital={handleSelectHospital}
                selectingHospitalRequestId={selectingHospitalRequestId}
              />
            }
          />
          <Route
            path="trips"
            element={
              <DriverTrips
                trips={trips}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                onFilter={handleFilterTrips}
              />
            }
          />
          <Route path="earnings" element={<DriverEarnings earnings={earnings} />} />
        </Routes>
      )}
    </DashboardLayout>
  );
}

export default DriverDashboardPage;
