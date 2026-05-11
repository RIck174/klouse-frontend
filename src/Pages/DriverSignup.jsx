import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../Components/Navigation";
import "../Css/Settingspage.css";
import "boxicons/css/boxicons.min.css";

const API = import.meta.env.VITE_API_URL;

function DriverSignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    vehicleType: "",
    vehicleModel: "",
    licensePlate: "",
    driversLicense: "",
  });

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (
      !formData.vehicleType ||
      !formData.vehicleModel ||
      !formData.licensePlate ||
      !formData.driversLicense
    ) {
      return setError("Please fill in all fields");
    }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token); // save fresh token
        navigate("/driver");
      } else {
        setError(data.message || "Failed to register as driver");
      }
    } catch (err) {
      setError("Server error, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <Navigation />
      <div className="settings-content">
        <div className="profile-header">
          <div className="profile-info">
            <h2 className="profile-name">Become a Driver</h2>
            <span className="profile-email">
              Fill in your vehicle details to get started
            </span>
          </div>
        </div>

        {error && (
          <div className="settings-toast error">
            <i className="bx bxs-error-circle" />
            {error}
          </div>
        )}

        <div className="settings-section">
          <div className="section-label">Vehicle Info</div>
          <div className="settings-list">
            <div style={{ padding: "16px" }}>
              <div className="form-group">
                <label>Vehicle Type</label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  style={{
                    padding: "13px 16px",
                    borderRadius: "14px",
                    border: "1.5px solid #2a2a2a",
                    background: "#1e1e1e",
                    color: formData.vehicleType ? "#e8e8e8" : "#333",
                    fontSize: "14px",
                    width: "100%",
                    outline: "none",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  <option value="">Select vehicle type</option>
                  <option value="Car">Car</option>
                  <option value="Motorbike">Motorbike</option>
                </select>
              </div>

              <div className="form-group">
                <label>Vehicle Model</label>
                <input
                  type="text"
                  name="vehicleModel"
                  placeholder="e.g. Toyota Corolla"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>License Plate</label>
                <input
                  type="text"
                  name="licensePlate"
                  placeholder="e.g. GR-1234-23"
                  value={formData.licensePlate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Driver's License Number</label>
                <input
                  type="text"
                  name="driversLicense"
                  placeholder="Enter your license number"
                  value={formData.driversLicense}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 16px" }}>
          <button
            className="modal-save-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Register as Driver"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DriverSignup;
