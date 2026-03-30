import { useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import InputField from "../components/InputField";
import Button from "../components/Button";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import { ambulanceService } from "../services/api";

function TrackAmbulancePage() {
  const [formData, setFormData] = useState({ callerName: "", callerPhone: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await ambulanceService.track(formData);
      setResult(response.data);
      toast.success("Tracking result loaded.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to track ambulance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Card title="Track Ambulance" subtitle="Search by caller name and phone">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <InputField
              label="Caller Name"
              name="callerName"
              value={formData.callerName}
              onChange={handleChange}
              required
            />
            <InputField
              label="Caller Phone Number"
              name="callerPhone"
              value={formData.callerPhone}
              onChange={handleChange}
              required
            />
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={loading}>
                Track Now
              </Button>
            </div>
          </form>
          {loading && (
            <div className="mt-4">
              <LoadingSpinner text="Checking request status..." />
            </div>
          )}
        </Card>

        {result && (
          <Card title="Tracking Result">
            <div className="mb-3">
              <StatusBadge status={result.status || "Pending"} />
            </div>
            {result.ambulanceNumber ? (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="font-semibold">Ambulance Number:</span>{" "}
                  {result.ambulanceNumber}
                </p>
                <p>
                  <span className="font-semibold">Ambulance Type:</span>{" "}
                  {result.ambulanceType}
                </p>
                <p>
                  <span className="font-semibold">Driver Name:</span> {result.driverName}
                </p>
                <p>
                  <span className="font-semibold">Driver Phone:</span>{" "}
                  {result.driverPhone}
                </p>
              </div>
            ) : (
              <p className="text-gray-600">{result.message}</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default TrackAmbulancePage;
