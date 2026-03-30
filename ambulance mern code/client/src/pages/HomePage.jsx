import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Button from "../components/Button";

function HomePage() {
  return (
    <div className="page-shell">
      <Navbar />
      <section className="relative flex min-h-[calc(100vh-64px)] items-center overflow-hidden">
        <div className="pointer-events-none absolute -left-24 -top-10 h-72 w-72 rounded-full bg-red-100/45 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-medical-100/45 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-red-50/60 blur-3xl" />

        <div className="mx-auto w-full max-w-7xl px-4 py-14 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mt-5 text-4xl font-bold leading-tight text-medical-700 md:text-6xl">
              Smart Ambulance Response and Management System
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 md:text-lg">
              Centralized booking, real-time request monitoring, and reliable
              dispatch workflows across patient, driver, and admin operations.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/hire-ambulance">
              <Button className="!bg-red-600 !text-white hover:!bg-red-700">
                Request Ambulance
              </Button>
            </Link>
            <Link to="/track-ambulance">
              <Button variant="secondary">Track Active Request</Button>
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}

export default HomePage;
