import { NavLink } from "react-router-dom";

function Sidebar({ items }) {
  return (
    <aside className="w-full rounded-2xl bg-white p-4 shadow-card border border-red-100 md:w-64 md:min-h-[calc(100vh-8rem)]">
      <h2 className="mb-4 text-lg font-bold text-medical-700">Dashboard</h2>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={Boolean(item.exact)}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-medical-600 text-white"
                  : "text-gray-700 hover:bg-red-50 hover:text-medical-700"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
