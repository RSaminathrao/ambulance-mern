import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import HireAmbulancePage from "./pages/HireAmbulancePage";
import TrackAmbulancePage from "./pages/TrackAmbulancePage";
import DriverRegistrationPage from "./pages/DriverRegistrationPage";
import DriverLoginPage from "./pages/DriverLoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import DriverDashboardPage from "./pages/DriverDashboardPage";

function ProtectedRoute({ children, storageKey }) {
  const session = localStorage.getItem(storageKey);
  if (!session) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/hire-ambulance" element={<HireAmbulancePage />} />
      <Route path="/track-ambulance" element={<TrackAmbulancePage />} />
      <Route path="/driver-register" element={<DriverRegistrationPage />} />
      <Route path="/driver-login" element={<DriverLoginPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route
        path="/admin-dashboard/*"
        element={
          <ProtectedRoute storageKey="adminSession">
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver-dashboard/*"
        element={
          <ProtectedRoute storageKey="driverSession">
            <DriverDashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
