import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import InputField from "../components/InputField";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import LocationPickerMap from "../components/LocationPickerMap";
import { driverService } from "../services/api";
import { TAMIL_NADU_BOUNDS } from "../constants/geo";

const initialState = {
  name: "",
  licenseNumber: "",
  licenseImage: null,
  phone: "",
  ambulanceNumber: "",
  ambulanceType: "",
  password: "",
  latitude: "",
  longitude: "",
};

const MAX_LICENSE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LICENSE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read selected file."));
    reader.readAsDataURL(file);
  });
}

function DriverRegistrationPage() {
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleMapPick = ({ lat, lng }) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  const handleLicenseImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFormData((prev) => ({ ...prev, licenseImage: null }));
      return;
    }

    if (!ALLOWED_LICENSE_IMAGE_TYPES.has(file.type)) {
      toast.error("License image must be a JPG, PNG, or WEBP file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_LICENSE_IMAGE_SIZE_BYTES) {
      toast.error("License image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFormData((prev) => ({
        ...prev,
        licenseImage: {
          dataUrl,
          fileName: file.name,
          mimeType: file.type,
        },
      }));
    } catch (error) {
      toast.error(error.message || "Unable to read license image.");
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!/^\d{10}$/.test(formData.phone)) {
      toast.error("Phone number must be 10 digits.");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password should be at least 6 characters.");
      return;
    }
    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);
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
    if (!formData.licenseImage) {
      toast.error("Driving license image is required.");
      return;
    }
    try {
      setLoading(true);
      await driverService.register(formData);
      toast.success("Driver registration submitted for admin approval.");
      setFormData(initialState);
      const input = document.getElementById("licenseImage");
      if (input) input.value = "";
    } catch (error) {
      toast.error(error?.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card title="Driver Registration">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <InputField label="Driver Name" name="name" value={formData.name} onChange={handleChange} required />
            <InputField
              label="License Number"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleChange}
              required
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="licenseImage">
                Driving License Image
              </label>
              <input
                id="licenseImage"
                name="licenseImage"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLicenseImageChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-medical-500 focus:ring-2 focus:ring-medical-200 outline-none"
                required
              />
              <p className="text-xs text-gray-500">
                Upload a clear license image for verification. JPG, PNG, or WEBP up to 5 MB.
              </p>
              {formData.licenseImage?.fileName && (
                <p className="text-xs text-green-700">Selected: {formData.licenseImage.fileName}</p>
              )}
            </div>
            <InputField label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required />
            <InputField
              label="Ambulance Number"
              name="ambulanceNumber"
              value={formData.ambulanceNumber}
              onChange={handleChange}
              required
            />
            <InputField
              label="Ambulance Type"
              name="ambulanceType"
              type="select"
              options={["Basic Life Support", "Advanced Life Support", "Non Emergency"]}
              value={formData.ambulanceType}
              onChange={handleChange}
              required
            />
            <InputField
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <InputField
              label="Current Latitude (Tamil Nadu)"
              name="latitude"
              type="number"
              value={formData.latitude}
              onChange={handleChange}
              required
            />
            <InputField
              label="Current Longitude (Tamil Nadu)"
              name="longitude"
              type="number"
              value={formData.longitude}
              onChange={handleChange}
              required
            />
            <div className="md:col-span-2">
              <LocationPickerMap
                title="Choose Driver Location on Map"
                latitude={Number(formData.latitude)}
                longitude={Number(formData.longitude)}
                onPick={handleMapPick}
                bounds={TAMIL_NADU_BOUNDS}
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between">
              <Link to="/driver-login" className="text-sm text-medical-700 hover:underline">
                Already registered? Login
              </Link>
              <Button type="submit" disabled={loading}>
                Register Driver
              </Button>
            </div>
            {loading && (
              <div className="md:col-span-2">
                <LoadingSpinner text="Registering driver..." />
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}

export default DriverRegistrationPage;
