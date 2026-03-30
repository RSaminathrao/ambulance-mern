import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import InputField from "../components/InputField";
import Button from "../components/Button";
import { driverService } from "../services/api";

function DriverLoginPage() {
  const [formData, setFormData] = useState({ phone: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await driverService.login(formData);
      localStorage.setItem("driverSession", JSON.stringify(response.data.driver));
      toast.success("Login successful.");
      navigate("/driver-dashboard");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Driver login failed.");
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="mx-auto max-w-lg px-4 py-8">
        <Card title="Driver Login">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <InputField label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required />
            <InputField
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <div className="flex items-center justify-between">
              <Link to="/driver-register" className="text-sm text-medical-700 hover:underline">
                New Driver? Register
              </Link>
              <Button type="submit">Login</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default DriverLoginPage;
