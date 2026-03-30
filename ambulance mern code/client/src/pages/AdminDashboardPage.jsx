import { useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import Table from "../components/Table";
import Button from "../components/Button";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import DispatchMapPanel from "../components/DispatchMapPanel";
import { adminService, dispatchService } from "../services/api";

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadiusKm * c;
}

function AdminOverview({ requests, drivers }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Card title="Total Requests">
        <p className="text-2xl font-bold text-medical-700">{requests.length}</p>
      </Card>
      <Card title="Pending Requests">
        <p className="text-2xl font-bold text-yellow-700">
          {requests.filter((request) => request.status === "Pending").length}
        </p>
      </Card>
      <Card title="Available Drivers">
        <p className="text-2xl font-bold text-green-700">
          {
            drivers.filter(
              (driver) =>
                driver.availabilityStatus === "Available" && driver.verificationStatus === "Verified"
            ).length
          }
        </p>
      </Card>
      <Card title="Pending Approvals">
        <p className="text-2xl font-bold text-yellow-700">
          {drivers.filter((driver) => driver.verificationStatus === "Pending").length}
        </p>
      </Card>
    </div>
  );
}

function AdminRequests({ requests }) {
  const columns = [
    { key: "patientName", label: "Patient" },
    { key: "callerName", label: "Caller" },
    { key: "callerPhone", label: "Phone" },
    { key: "injuryType", label: "Type" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];
  return <Table columns={columns} data={requests} />;
}

function AdminDrivers({ drivers }) {
  const columns = [
    { key: "name", label: "Driver Name" },
    { key: "phone", label: "Phone" },
    { key: "licenseNumber", label: "License Number" },
    { key: "ambulanceNumber", label: "Ambulance Number" },
    { key: "ambulanceType", label: "Ambulance Type" },
    {
      key: "verificationStatus",
      label: "Verification",
      render: (row) => <StatusBadge status={row.verificationStatus} />,
    },
    {
      key: "availabilityStatus",
      label: "Availability",
      render: (row) => <StatusBadge status={row.availabilityStatus} />,
    },
  ];
  return <Table columns={columns} data={drivers} />;
}

function AdminDriverApprovals({ drivers, onReview }) {
  const pendingDrivers = drivers.filter((driver) => driver.verificationStatus === "Pending");

  const columns = [
    { key: "name", label: "Driver Name" },
    { key: "phone", label: "Phone" },
    { key: "licenseNumber", label: "License Number" },
    { key: "ambulanceNumber", label: "Ambulance Number" },
    { key: "ambulanceType", label: "Ambulance Type" },
    {
      key: "licenseImage",
      label: "License Image",
      render: (row) =>
        row.licenseImage?.dataUrl ? (
          <a
            href={row.licenseImage.dataUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block"
          >
            <img
              src={row.licenseImage.dataUrl}
              alt={`${row.name} license`}
              className="h-16 w-24 rounded-lg border border-gray-200 object-cover"
            />
          </a>
        ) : (
          <span className="text-xs text-gray-500">No image</span>
        ),
    },
    {
      key: "createdAt",
      label: "Submitted",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <Table
      columns={columns}
      data={pendingDrivers}
      renderActions={(row) => (
        <div className="flex flex-wrap gap-2">
          <Button className="px-2 py-1 text-xs" onClick={() => onReview(row._id, "Verified")}>
            Approve
          </Button>
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            onClick={() => onReview(row._id, "Rejected")}
          >
            Reject
          </Button>
        </div>
      )}
    />
  );
}

function AdminAssignments({ requests, drivers, onAssign, getDistanceKm }) {
  const pendingRequests = requests.filter((request) => request.status === "Pending");
  const approvedDrivers = drivers.filter(
    (driver) =>
      driver.verificationStatus === "Verified" && driver.availabilityStatus === "Available"
  );

  const columns = [
    { key: "patientName", label: "Patient" },
    { key: "callerName", label: "Caller" },
    { key: "injuryType", label: "Required Type" },
    {
      key: "matchedDriverCount",
      label: "Matching Drivers",
      render: (row) =>
        approvedDrivers.filter((driver) => driver.ambulanceType === row.injuryType).length,
    },
  ];

  return (
    <Table
      columns={columns}
      data={pendingRequests}
      renderActions={(row) => {
        const matchedDrivers = drivers
          .filter(
            (driver) =>
              driver.verificationStatus === "Verified" &&
              driver.availabilityStatus === "Available"
          )
          .filter((driver) => driver.ambulanceType === row.injuryType)
          .map((driver) => ({
            driver,
            distanceKm: getDistanceKm(row._id, driver._id),
          }))
          .sort((left, right) => {
            if (left.distanceKm === null && right.distanceKm === null) return 0;
            if (left.distanceKm === null) return 1;
            if (right.distanceKm === null) return -1;
            return left.distanceKm - right.distanceKm;
          });
        if (matchedDrivers.length === 0) {
          return <span className="text-xs text-gray-500">No matching driver</span>;
        }
        return (
          <div className="flex flex-wrap gap-2">
            {matchedDrivers.map(({ driver, distanceKm }) => (
              <Button
                key={driver._id}
                className="px-2 py-1 text-xs"
                onClick={() => onAssign(row._id, driver._id)}
              >
                Assign {driver.name}{" "}
                {distanceKm === null ? "(distance N/A)" : `(${distanceKm.toFixed(2)} km)`}
              </Button>
            ))}
          </div>
        );
      }}
    />
  );
}

function AdminDashboardPage() {
  const [requests, setRequests] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [dispatchData, setDispatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingMap, setRefreshingMap] = useState(false);
  const navigate = useNavigate();

  const sidebarItems = useMemo(
    () => [
      { label: "Overview", path: "/admin-dashboard", exact: true },
      { label: "Requests", path: "/admin-dashboard/requests" },
      { label: "All Drivers", path: "/admin-dashboard/drivers" },
      { label: "Driver Approvals", path: "/admin-dashboard/approvals" },
      { label: "Assign Driver", path: "/admin-dashboard/assignments" },
      { label: "Dispatch Map", path: "/admin-dashboard/dispatch-map" },
    ],
    []
  );

  const loadData = async ({ silentMapRefresh = false } = {}) => {
    try {
      if (!silentMapRefresh) setLoading(true);
      else setRefreshingMap(true);

      const [requestResponse, driverResponse, dispatchResponse] = await Promise.all([
        adminService.getRequests(),
        adminService.getDrivers(),
        dispatchService.getMapData(),
      ]);
      setRequests(requestResponse.data);
      setDrivers(driverResponse.data);
      setDispatchData(dispatchResponse.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load admin dashboard.");
    } finally {
      if (!silentMapRefresh) setLoading(false);
      setRefreshingMap(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      loadData({ silentMapRefresh: true });
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const requestLocationMap = useMemo(
    () =>
      new Map((dispatchData?.requests || []).map((request) => [String(request._id), request.location])),
    [dispatchData]
  );

  const driverLocationMap = useMemo(
    () =>
      new Map((dispatchData?.drivers || []).map((driver) => [String(driver._id), driver.location])),
    [dispatchData]
  );

  const getDistanceKm = (requestId, driverId) => {
    const requestLocation = requestLocationMap.get(String(requestId));
    const driverLocation = driverLocationMap.get(String(driverId));
    if (!requestLocation || !driverLocation) return null;
    return haversineKm(
      { lat: requestLocation.lat, lon: requestLocation.lon },
      { lat: driverLocation.lat, lon: driverLocation.lon }
    );
  };

  const handleAssign = async (requestId, driverId) => {
    try {
      await adminService.assignDriver({ requestId, driverId });
      toast.success("Driver assigned successfully.");
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Assignment failed.");
    }
  };

  const handleReviewDriver = async (driverId, verificationStatus) => {
    try {
      await adminService.updateDriverVerification(driverId, { verificationStatus });
      toast.success(
        verificationStatus === "Verified" ? "Driver approved successfully." : "Driver rejected successfully."
      );
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to update driver verification.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminSession");
    navigate("/admin-login");
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/admin-dashboard/dispatch-map">
            <Button variant="secondary">Dispatch Map</Button>
          </Link>
          <Link to="/admin-dashboard/assignments">
            <Button variant="secondary">Assign Driver</Button>
          </Link>
          <Link to="/admin-dashboard/approvals">
            <Button variant="secondary">Driver Approvals</Button>
          </Link>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
      {loading ? (
        <Card>
          <LoadingSpinner text="Loading dashboard data..." />
        </Card>
      ) : (
        <Routes>
          <Route index element={<AdminOverview requests={requests} drivers={drivers} />} />
          <Route path="requests" element={<AdminRequests requests={requests} />} />
          <Route path="drivers" element={<AdminDrivers drivers={drivers} />} />
          <Route
            path="approvals"
            element={<AdminDriverApprovals drivers={drivers} onReview={handleReviewDriver} />}
          />
          <Route
            path="assignments"
            element={
              <AdminAssignments
                requests={requests}
                drivers={drivers}
                onAssign={handleAssign}
                getDistanceKm={getDistanceKm}
              />
            }
          />
          <Route
            path="dispatch-map"
            element={
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => loadData({ silentMapRefresh: true })} disabled={refreshingMap}>
                    {refreshingMap ? "Refreshing..." : "Refresh Map"}
                  </Button>
                </div>
                <DispatchMapPanel data={dispatchData} />
              </div>
            }
          />
        </Routes>
      )}
    </DashboardLayout>
  );
}

export default AdminDashboardPage;
