import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Components/Sidebar";
import "../Css/Settingspage.css";
import "boxicons/css/boxicons.min.css";

const API = import.meta.env.VITE_API_URL;

const FAQS = [
  {
    q: "How do I request a ride?",
    a: "Tap 'Request Ride' on the home screen, set your destination, and confirm. A nearby driver will be matched to you.",
  },
  {
    q: "How is my fare calculated?",
    a: "Fares are based on a GH₵5 base fare plus GH₵2.50 per km. The estimated fare is shown before you confirm.",
  },
  {
    q: "How do I cancel a ride?",
    a: "Open your active ride screen and tap 'Cancel Ride'. Note that repeated cancellations may affect your account.",
  },
  {
    q: "How do I become a driver?",
    a: "Go to Settings → Become a Driver, fill in your vehicle details and driver's license info.",
  },
  {
    q: "How do I add money to my wallet?",
    a: "Go to Payment, tap 'Add Money', enter an amount and pay via MoMo. Paystack integration coming soon.",
  },
];

function EditModal({ title, fields, onSave, onClose, loading }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>
            <i className="bx bx-x" />
          </button>
        </div>
        <div className="modal-body">{fields}</div>
        <button className="modal-save-btn" onClick={onSave} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function Settings() {
  const [user, setUser] = useState({});
  const [modal, setModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [reportText, setReportText] = useState("");
  const [notifs, setNotifs] = useState({ rides: true, promos: false });
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [newPlace, setNewPlace] = useState({
    label: "",
    icon: "bxs-map-pin",
    name: "",
    coordinates: [],
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const navigate = useNavigate();

  // ── Fetch profile
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUser(data); // profile header reads from here
        setFormData(data); // modals edit from here
      } catch {
        console.log("Failed to fetch user info");
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/places`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSavedPlaces(data);
      } catch {
        console.log("Failed to fetch saved places");
      }
    };
    fetchPlaces();
  }, []);

  // ── Auto-dismiss toast
  useEffect(() => {
    if (!success && !error) return;
    const t = setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3000);
    return () => clearTimeout(t);
  }, [success, error]);

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const openModal = (key) => {
    setFormData({ ...user });
    setModal(key);
    setError("");
  };
  const closeModal = () => {
    setModal(null);
    setError("");
  };

  // ── Avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Step 1 — Upload to Cloudinary
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "klouse_profiles");

      const cRes = await fetch(
        `https://api.cloudinary.com/v1_1/dkalpzvt0/image/upload`,
        { method: "POST", body: fd },
      );

      if (!cRes.ok) throw new Error("Cloudinary upload failed");

      const cJson = await cRes.json();
      const imgUrl = cJson.secure_url;

      if (!imgUrl) throw new Error("No image URL returned");

      // Step 2 — Save URL to backend
      const token = localStorage.getItem("token");
      const updateRes = await fetch(`${API}/user/profile-image`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imgUrl }),
      });

      if (!updateRes.ok) {
        const errData = await updateRes.json();
        throw new Error(errData.message || "Failed to save image");
      }

      // Step 3 — Update UI with real URL
      setUser((p) => ({ ...p, profileImage: imgUrl }));
      setTimeout(() => setPreview(null), 100);
      setSuccess("Photo updated!");
    } catch (err) {
      console.error("Avatar upload error:", err);
      setError(err.message || "Failed to upload photo");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Save username
  const saveUsername = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user/profile-update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newUsername: formData.username }),
      });
      if (!res.ok) throw new Error("Update failed");
      setUser((p) => ({ ...p, username: formData.username }));
      setSuccess("Username updated");
      closeModal();
    } catch {
      setError("Failed to update username");
    } finally {
      setLoading(false);
    }
  };

  // ── Save email
  const saveEmail = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user/profile-update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEmail: formData.email }),
      });
      if (!res.ok) throw new Error("Update failed");
      setUser((p) => ({ ...p, email: formData.email }));
      setSuccess("Email updated");
      closeModal();
    } catch {
      setError("Failed to update email");
    } finally {
      setLoading(false);
    }
  };

  // ── Change password
  const savePassword = async () => {
    if (!formData.newPassword) return setError("Enter a new password");
    if (formData.newPassword !== formData.confirmPassword)
      return setError("Passwords do not match");
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user/passwordUpdate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess("Password changed");
      closeModal();
    } catch (err) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  // ── Send report (placeholder — wire to backend when ready)
  const sendReport = () => {
    if (!reportText.trim()) return setError("Please describe your problem");
    setSuccess("Report submitted. We'll get back to you soon.");
    setReportText("");
  };

  // ── Delete account
  const handleDeleteAccount = async () => {
    if (!window.confirm("Delete your account? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user/delete-account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: formData.deletePassword }),
      });
      if (!res.ok) throw new Error();
      localStorage.removeItem("token");
      window.location.href = "/";
    } catch {
      setError("Failed to delete account. Check your password.");
    }
  };

  const deletePlace = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/places/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedPlaces((prev) => prev.filter((p) => p._id !== id));
      setSuccess("Place deleted");
    } catch {
      setError("Failed to delete place");
    }
  };

  const saveNewPlace = async () => {
    if (!newPlace.label || !newPlace.name) {
      return setError("Please fill in label and name");
    }
    if (newPlace.coordinates.length === 0) {
      return setError("Please search and select a location");
    }
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/places`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPlace),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedPlaces((prev) => [data, ...prev]);
        setNewPlace({
          label: "",
          icon: "bxs-map-pin",
          name: "",
          coordinates: [],
        });
        setSuccess("Place saved!");
        closeModal();
      } else {
        setError(data.message || "Failed to save place");
      }
    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-GH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const avatarSrc = preview || user.profileImage;

  return (
    <div className="settings-page">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Top bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "60px",
          background: "white",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: "14px",
          zIndex: 1000,
          boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            width: 40,
            height: 40,
            border: "none",
            background: "transparent",
            fontSize: 24,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0f172a",
            borderRadius: "12px",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <i className="bx bx-menu" />
        </button>
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "18px",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.3px",
          }}
        >
          Settings
        </span>
      </div>

      <div className="settings-content">
        {/* Toast */}
        {success && (
          <div className="settings-toast success">
            <i className="bx bxs-check-circle" />
            {success}
          </div>
        )}
        {error && (
          <div className="settings-toast error">
            <i className="bx bxs-error-circle" />
            {error}
          </div>
        )}

        {/* ── PROFILE HEADER ── */}
        <div className="profile-header">
          <label className="avatar-wrap">
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                {user.username ? user.username[0].toUpperCase() : "?"}
              </div>
            )}
            <div className="avatar-edit-badge">
              <i className="bx bx-camera" />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              hidden
            />
          </label>

          <div className="profile-info">
            <h2 className="profile-name">{user.username || "—"}</h2>
            <span className="profile-email">{user.email || "—"}</span>
            <div className="profile-meta">
              {joinDate && (
                <span className="meta-chip">
                  <i className="bx bx-calendar" />
                  {joinDate}
                </span>
              )}
              <span
                className={`meta-chip role-chip ${user.role === "driver" ? "driver" : ""}`}
              >
                <i
                  className={`bx ${user.role === "driver" ? "bxs-car" : "bxs-user"}`}
                />
                {user.role === "driver" ? "Driver" : "Rider"}
              </span>
            </div>
          </div>
        </div>

        {/* ── ACCOUNT ── */}
        <div className="settings-section">
          <div className="section-label">Account</div>
          <div className="settings-list">
            <div className="settings-row" onClick={() => openModal("username")}>
              <div className="row-left">
                <div className="row-icon">
                  <i className="bx bxs-user" />
                </div>
                <div className="row-text">
                  <span className="row-label">Username</span>
                  <span className="row-value">{user.username || "—"}</span>
                </div>
              </div>
              <i className="bx bx-chevron-right row-arrow" />
            </div>

            <div className="row-divider" />

            <div className="settings-row" onClick={() => openModal("email")}>
              <div className="row-left">
                <div className="row-icon">
                  <i className="bx bxs-envelope" />
                </div>
                <div className="row-text">
                  <span className="row-label">Email</span>
                  <span className="row-value">{user.email || "—"}</span>
                </div>
              </div>
              <i className="bx bx-chevron-right row-arrow" />
            </div>

            <div className="row-divider" />

            <div className="settings-row" onClick={() => openModal("password")}>
              <div className="row-left">
                <div className="row-icon">
                  <i className="bx bxs-lock-alt" />
                </div>
                <div className="row-text">
                  <span className="row-label">Password</span>
                  <span className="row-value">••••••••</span>
                </div>
              </div>
              <i className="bx bx-chevron-right row-arrow" />
            </div>
          </div>
        </div>

        {/* ── PREFERENCES ── */}
        <div className="settings-section">
          <div className="section-label">Preferences</div>
          <div className="settings-list">
            {/* Ride notifications toggle */}
            <div className="settings-row">
              <div className="row-left">
                <div className="row-icon">
                  <i className="bx bxs-bell" />
                </div>
                <div className="row-text">
                  <span className="row-label">Ride Notifications</span>
                  <span className="row-value">Driver updates &amp; status</span>
                </div>
              </div>
              <div
                className={`toggle ${notifs.rides ? "on" : ""}`}
                onClick={() => setNotifs((p) => ({ ...p, rides: !p.rides }))}
              />
            </div>

            <div className="row-divider" />

            {/* Promo notifications toggle */}
            <div className="settings-row">
              <div className="row-left">
                <div className="row-icon">
                  <i className="bx bxs-offer" />
                </div>
                <div className="row-text">
                  <span className="row-label">Promotions</span>
                  <span className="row-value">Deals &amp; offers</span>
                </div>
              </div>
              <div
                className={`toggle ${notifs.promos ? "on" : ""}`}
                onClick={() => setNotifs((p) => ({ ...p, promos: !p.promos }))}
              />
            </div>
          </div>
        </div>

        {/* ── SAVED PLACES ── */}
        <div className="settings-section">
          <div className="section-label">Saved Places</div>
          <div className="settings-list">
            {savedPlaces.length === 0 && (
              <div
                style={{ padding: "16px", color: "#94a3b8", fontSize: "13px" }}
              >
                No saved places yet. Add one below.
              </div>
            )}
            {savedPlaces.map((place, i) => (
              <div key={place._id}>
                <div className="settings-row">
                  <div className="row-left">
                    <div className="row-icon">
                      <i className={`bx ${place.icon}`} />
                    </div>
                    <div className="row-text">
                      <span className="row-label">{place.label}</span>
                      <span className="row-value">{place.name}</span>
                    </div>
                  </div>
                  <i
                    className="bx bxs-trash"
                    style={{
                      color: "#dc2626",
                      fontSize: "18px",
                      cursor: "pointer",
                    }}
                    onClick={() => deletePlace(place._id)}
                  />
                </div>
                {i < savedPlaces.length - 1 && <div className="row-divider" />}
              </div>
            ))}
            <div className="row-divider" />
            <div className="settings-row" onClick={() => setModal("addPlace")}>
              <div className="row-left">
                <div className="row-icon green-icon">
                  <i className="bx bxs-plus-circle" />
                </div>
                <div className="row-text">
                  <span className="row-label">Add a Place</span>
                  <span className="row-value">
                    Save a location for quick access
                  </span>
                </div>
              </div>
              <i className="bx bx-chevron-right row-arrow" />
            </div>
          </div>
        </div>

        {/* ── DRIVE WITH KLOUSE ── */}
        {user.role === "driver" ? (
          <div className="settings-section">
            <div className="section-label">Driver</div>
            <div className="settings-list">
              <div className="settings-row" onClick={() => navigate("/driver")}>
                <div className="row-left">
                  <div className="row-icon accent-icon">
                    <i className="bx bxs-car" />
                  </div>
                  <div className="row-text">
                    <span className="row-label">Driver Dashboard</span>
                    <span className="row-value">
                      Go online and accept rides
                    </span>
                  </div>
                </div>
                <i className="bx bx-chevron-right row-arrow" />
              </div>
            </div>
          </div>
        ) : (
          <div className="settings-section">
            <div className="section-label">Drive with Klouse</div>
            <div className="settings-list">
              <div
                className="settings-row"
                onClick={() => navigate("/driver-signup")}
              >
                <div className="row-left">
                  <div className="row-icon accent-icon">
                    <i className="bx bxs-car" />
                  </div>
                  <div className="row-text">
                    <span className="row-label">Become a Driver</span>
                    <span className="row-value">
                      Earn money driving with Klouse
                    </span>
                  </div>
                </div>
                <i className="bx bx-chevron-right row-arrow" />
              </div>
            </div>
          </div>
        )}

        {/* ── HELP & SUPPORT ── */}
        <div className="settings-section">
          <div className="section-label">Help &amp; Support</div>
          <div className="settings-list">
            {/* Contact via WhatsApp */}
            <a
              className="settings-row"
              href="https://wa.me/233000000000"
              target="_blank"
              rel="noreferrer"
            >
              <div className="row-left">
                <div className="row-icon green-icon">
                  <i className="bx bxl-whatsapp" />
                </div>
                <div className="row-text">
                  <span className="row-label">WhatsApp Support</span>
                  <span className="row-value">Chat with us on WhatsApp</span>
                </div>
              </div>
              <i className="bx bx-chevron-right row-arrow" />
            </a>

            <div className="row-divider" />

            {/* Contact via Email */}
            <a className="settings-row" href="mailto:support@klouse.com">
              <div className="row-left">
                <div className="row-icon">
                  <i className="bx bxs-envelope" />
                </div>
                <div className="row-text">
                  <span className="row-label">Email Support</span>
                  <span className="row-value">support@klouse.com</span>
                </div>
              </div>
              <i className="bx bx-chevron-right row-arrow" />
            </a>

            <div className="row-divider" />

            {/* Report a problem */}
            <div className="settings-row" onClick={() => openModal("report")}>
              <div className="row-left">
                <div className="row-icon warn-icon">
                  <i className="bx bxs-error" />
                </div>
                <div className="row-text">
                  <span className="row-label">Report a Problem</span>
                  <span className="row-value">Let us know what went wrong</span>
                </div>
              </div>
              <i className="bx bx-chevron-right row-arrow" />
            </div>

            <div className="row-divider" />

            {/* FAQs */}
            <div className="faq-section">
              <div className="faq-header-row">
                <div className="row-left" style={{ padding: "14px 16px" }}>
                  <div className="row-icon">
                    <i className="bx bxs-help-circle" />
                  </div>
                  <div className="row-text">
                    <span className="row-label">FAQs</span>
                  </div>
                </div>
              </div>
              <div className="faq-list">
                {FAQS.map((faq, i) => (
                  <div
                    key={i}
                    className={`faq-item ${openFaq === i ? "open" : ""}`}
                  >
                    <button
                      className="faq-question"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      <span>{faq.q}</span>
                      <i
                        className={`bx bx-chevron-down faq-arrow ${openFaq === i ? "rotated" : ""}`}
                      />
                    </button>
                    <div className="faq-answer">{faq.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── ABOUT ── */}
        <div className="settings-section">
          <div className="section-label">About</div>
          <div className="settings-list">
            <div className="settings-row">
              <div className="row-left">
                <div className="row-icon">
                  <i className="bx bxs-info-circle" />
                </div>
                <div className="row-text">
                  <span className="row-label">App Version</span>
                  <span className="row-value">1.0.0</span>
                </div>
              </div>
            </div>

            <div className="row-divider" />

            <a
              className="settings-row"
              href="/terms"
              onClick={(e) => e.preventDefault()}
            >
              <div className="row-left">
                <div className="row-icon">
                  <i className="bx bxs-file" />
                </div>
                <div className="row-text">
                  <span className="row-label">Terms of Service</span>
                </div>
              </div>
              <i className="bx bx-chevron-right row-arrow" />
            </a>

            <div className="row-divider" />

            <a
              className="settings-row"
              href="/privacy"
              onClick={(e) => e.preventDefault()}
            >
              <div className="row-left">
                <div className="row-icon">
                  <i className="bx bxs-shield" />
                </div>
                <div className="row-text">
                  <span className="row-label">Privacy Policy</span>
                </div>
              </div>
              <i className="bx bx-chevron-right row-arrow" />
            </a>
          </div>
        </div>

        {/* ── DANGER ZONE ── */}
        <div className="settings-section">
          <div className="section-label">Danger Zone</div>
          <div className="settings-list">
            <div style={{ padding: "14px 16px 4px" }}>
              <div className="form-group">
                <label>Confirm with your password to delete</label>
                <input
                  type="password"
                  name="deletePassword"
                  value={formData.deletePassword || ""}
                  onChange={handleChange}
                  placeholder="Enter your password"
                />
              </div>
            </div>
            <div style={{ padding: "0 16px 16px" }}>
              <button className="btn-delete" onClick={handleDeleteAccount}>
                <i className="bx bxs-trash" /> Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MODALS ══ */}

      {modal === "username" && (
        <EditModal
          title="Change Username"
          loading={loading}
          onSave={saveUsername}
          onClose={closeModal}
          fields={
            <div className="form-group">
              <label>New Username</label>
              <input
                type="text"
                name="username"
                value={formData.username || ""}
                onChange={handleChange}
                placeholder="Enter username"
                autoFocus
              />
            </div>
          }
        />
      )}

      {modal === "email" && (
        <EditModal
          title="Change Email"
          loading={loading}
          onSave={saveEmail}
          onClose={closeModal}
          fields={
            <div className="form-group">
              <label>New Email</label>
              <input
                type="email"
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
                placeholder="Enter email"
                autoFocus
              />
            </div>
          }
        />
      )}

      {modal === "password" && (
        <EditModal
          title="Change Password"
          loading={loading}
          onSave={savePassword}
          onClose={closeModal}
          fields={
            <>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword || ""}
                  onChange={handleChange}
                  placeholder="Current password"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword || ""}
                  onChange={handleChange}
                  placeholder="New password"
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword || ""}
                  onChange={handleChange}
                  placeholder="Repeat new password"
                />
              </div>
              {error && (
                <p className="modal-error">
                  <i className="bx bxs-error-circle" />
                  {error}
                </p>
              )}
            </>
          }
        />
      )}

      {modal === "report" && (
        <EditModal
          title="Report a Problem"
          loading={false}
          onSave={sendReport}
          onClose={closeModal}
          fields={
            <div className="form-group">
              <label>Describe the problem</label>
              <textarea
                className="report-textarea"
                placeholder="Tell us what happened..."
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={4}
              />
            </div>
          }
        />
      )}

      {modal === "addPlace" && (
        <EditModal
          title="Add a Place"
          loading={loading}
          onSave={saveNewPlace}
          onClose={closeModal}
          fields={
            <>
              <div className="form-group">
                <label>Label (e.g. Home, Gym, Work)</label>
                <input
                  type="text"
                  placeholder="e.g. Home"
                  value={newPlace.label}
                  onChange={(e) =>
                    setNewPlace((p) => ({ ...p, label: e.target.value }))
                  }
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Icon</label>
                <select
                  value={newPlace.icon}
                  onChange={(e) =>
                    setNewPlace((p) => ({ ...p, icon: e.target.value }))
                  }
                  style={{
                    padding: "13px 16px",
                    borderRadius: "14px",
                    border: "1.5px solid #e2e8f0",
                    background: "#f8faff",
                    color: "#0f172a",
                    fontSize: "14px",
                    width: "100%",
                    outline: "none",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  <option value="bxs-map-pin">📍 Pin</option>
                  <option value="bxs-home">🏠 Home</option>
                  <option value="bxs-briefcase">💼 Work</option>
                  <option value="bxs-dumbbell">🏋️ Gym</option>
                  <option value="bxs-church">⛪ Church</option>
                  <option value="bxs-graduation">🎓 School</option>
                  <option value="bxs-shopping-bag">🛍️ Shopping</option>
                  <option value="bxs-heart">❤️ Favourite</option>
                </select>
              </div>
              <div className="form-group">
                <label>Search Location</label>
                <input
                  type="text"
                  placeholder="Type a place name in Ghana..."
                  value={newPlace.name}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setNewPlace((p) => ({
                      ...p,
                      name: value,
                      coordinates: [],
                    }));
                    if (value.length < 3) return;
                    try {
                      const res = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${value}&limit=5&countrycodes=gh`,
                        { headers: { "User-Agent": "KlouseApp/1.0" } },
                      );
                      const data = await res.json();
                      setPlaceSuggestions(data);
                    } catch {
                      console.log("Search failed");
                    }
                  }}
                />
                {placeSuggestions.length > 0 && (
                  <div
                    style={{
                      background: "white",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: "12px",
                      marginTop: "6px",
                      overflow: "hidden",
                    }}
                  >
                    {placeSuggestions.map((s, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setNewPlace((p) => ({
                            ...p,
                            name: s.display_name.split(",")[0],
                            coordinates: [parseFloat(s.lon), parseFloat(s.lat)],
                          }));
                          setPlaceSuggestions([]);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "13px",
                          color: "#0f172a",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <strong>{s.display_name.split(",")[0]}</strong>
                        <span style={{ color: "#94a3b8", marginLeft: "6px" }}>
                          {s.display_name.split(",").slice(1, 3).join(",")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {newPlace.coordinates.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    color: "#16a34a",
                    marginTop: "4px",
                  }}
                >
                  <i className="bx bxs-check-circle" />
                  Location selected
                </div>
              )}
            </>
          }
        />
      )}
    </div>
  );
}

export default Settings;
