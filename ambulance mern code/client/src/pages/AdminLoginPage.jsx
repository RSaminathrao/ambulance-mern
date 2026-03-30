import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import InputField from "../components/InputField";
import Button from "../components/Button";
import { adminService } from "../services/api";

function AdminLoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await adminService.login(formData);
      localStorage.setItem("adminSession", JSON.stringify(response.data.admin));
      toast.success("Admin login successful.");
      navigate("/admin-dashboard");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Admin login failed.");
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="mx-auto max-w-lg px-4 py-8">
        <Card title="Admin Login" subtitle="Use configured admin credentials">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <InputField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            <InputField
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <div className="flex justify-end">
              <Button type="submit">Login as Admin</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default AdminLoginPage;
