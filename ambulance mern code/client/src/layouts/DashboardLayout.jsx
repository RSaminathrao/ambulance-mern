import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function DashboardLayout({ sidebarItems, children }) {
  return (
    <div className="page-shell">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 md:flex md:gap-6">
        <Sidebar items={sidebarItems} />
        <main className="mt-6 flex-1 md:mt-0">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
