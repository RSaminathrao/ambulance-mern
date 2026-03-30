import { useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import InputField from "../components/InputField";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import LocationPickerMap from "../components/LocationPickerMap";
import { ambulanceService } from "../services/api";
import { TAMIL_NADU_BOUNDS } from "../constants/geo";

const initialState = {
  patientName: "",
  callerName: "",
  callerPhone: "",
  injuryType: "",
  latitude: "",
  longitude: "",
};

function HireAmbulancePage() {
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMapPick = ({ lat, lng }) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  const validate = () => {
    if (!/^\d{10}$/.test(formData.callerPhone)) {
      toast.error("Caller phone must be 10 digits.");
      return false;
    }

    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast.error("Valid latitude and longitude are required.");
      return false;
    }
    if (
      latitude < TAMIL_NADU_BOUNDS.minLat ||
      latitude > TAMIL_NADU_BOUNDS.maxLat ||
      longitude < TAMIL_NADU_BOUNDS.minLon ||
      longitude > TAMIL_NADU_BOUNDS.maxLon
    ) {
      toast.error("Location must be within Tamil Nadu.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      await ambulanceService.book(formData);
      toast.success("Ambulance request submitted. Status: Pending");
      setFormData(initialState);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Booking failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card title="Hire Ambulance" subtitle="Submit emergency request details">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <InputField
              label="Patient Name"
              name="patientName"
              value={formData.patientName}
              onChange={handleChange}
              required
            />
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
              placeholder="10 digit phone"
              required
            />
            <InputField
              label="Ambulance Type required"
              name="injuryType"
              type="select"
              options={[
                "Basic Life Support",
                "Advanced Life Support",
                "Non Emergency",
              ]}
              value={formData.injuryType}
              onChange={handleChange}
              required
            />
            <InputField
              label="Patient Latitude (Tamil Nadu)"
              name="latitude"
              type="number"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="e.g. 10.38"
              required
            />
            <InputField
              label="Patient Longitude (Tamil Nadu)"
              name="longitude"
              type="number"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="e.g. 78.82"
              required
            />
            <div className="md:col-span-2">
              <LocationPickerMap
                title="Choose Patient Location on Map"
                latitude={Number(formData.latitude)}
                longitude={Number(formData.longitude)}
                onPick={handleMapPick}
                bounds={TAMIL_NADU_BOUNDS}
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between">
              {loading ? <LoadingSpinner text="Submitting request..." /> : <span />}
              <Button type="submit" disabled={loading}>
                Submit Request
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default HireAmbulancePage;
