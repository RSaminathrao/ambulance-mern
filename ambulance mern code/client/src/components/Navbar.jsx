import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-red-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-medical-700">
          AmbulanceCare
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link to="/" className="text-gray-700 hover:text-medical-700">
            Home
          </Link>
          <Link to="/hire-ambulance" className="text-gray-700 hover:text-medical-700">
            Hire Ambulance
          </Link>
          <Link to="/track-ambulance" className="text-gray-700 hover:text-medical-700">
            Track
          </Link>
          <Link to="/driver-login" className="text-gray-700 hover:text-medical-700">
            Driver
          </Link>
          <Link to="/admin-login" className="text-gray-700 hover:text-medical-700">
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
