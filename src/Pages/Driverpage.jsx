import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import socket from "../socket";
import "../Css/Driverpage.css";
import "boxicons/css/boxicons.min.css";
import Sidebar from "../Components/Sidebar";

const API = import.meta.env.VITE_API_URL;

function LiveCenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
  return null;
}

function DriverPage() {
  const [driverPosition, setDriverPosition] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [pendingRide, setPendingRide] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);
  const locationWatcher = useRef(null);
  const locationInterval = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch driver profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };
    fetchProfile();
  }, []);

  // Register socket
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      socket.emit("register", payload.id);
    } catch (e) {
      console.error("Could not decode token", e);
    }
  }, []);
  //scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Listen for ride events
  useEffect(() => {
    socket.on("newRideRequest", (data) => {
      setPendingRide(data);
      showToast("New ride request!", "info");
    });

    socket.on("rideTaken", ({ rideId }) => {
      setPendingRide((prev) => (prev?.rideId === rideId ? null : prev));
    });

    socket.on("rideCancelled", () => {
      setActiveRide(null);
      showToast("Rider cancelled the ride", "error");
    });

    return () => {
      socket.off("newRideRequest");
      socket.off("rideTaken");
      socket.off("rideCancelled");
    };
  }, []);

  const goOnline = () => {
    setIsOnline(true);
    locationWatcher.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setDriverPosition([coords.latitude, coords.longitude]);
      },
      (err) => console.error("GPS error", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  };

  // Send location to backend + emit to rider every 5s
  useEffect(() => {
    if (!isOnline || !driverPosition) return;

    const sendLocation = async () => {
      const token = localStorage.getItem("token");
      try {
        await fetch(`${API}/user/location`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: driverPosition[0],
            lng: driverPosition[1],
          }),
        });

        if (activeRide) {
          socket.emit("driverLocation", {
            rideId: activeRide._id,
            lat: driverPosition[0],
            lng: driverPosition[1],
          });
        }
      } catch (err) {
        console.error("Failed to send location", err);
      }
    };

    sendLocation();
    locationInterval.current = setInterval(sendLocation, 5000);
    return () => clearInterval(locationInterval.current);
  }, [isOnline, driverPosition, activeRide]);

  const goOffline = async () => {
    setIsOnline(false);
    setDriverPosition(null);
    if (locationWatcher.current)
      navigator.geolocation.clearWatch(locationWatcher.current);
    clearInterval(locationInterval.current);
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/user/offline`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Failed to go offline", err);
    }
  };

  const acceptRide = async () => {
    if (!pendingRide) return;
    try {
      const token = localStorage.getItem("token");
      const rideId = pendingRide.rideId || pendingRide._id;
      const res = await fetch(`${API}/ride/accept/${rideId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setActiveRide(data.ride);
        setPendingRide(null);
        socket.emit("rideRoom", rideId);
        showToast("Ride accepted!", "success");
      } else {
        showToast(data.message || "Could not accept ride", "error");
        setPendingRide(null);
      }
    } catch (err) {
      console.error("Accept failed", err);
    }
  };

  const completeRide = async () => {
    if (!activeRide) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/ride/complete/${activeRide._id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActiveRide(null);
        showToast("Ride completed!", "success");
      } else {
        const data = await res.json();
        showToast(data.message || "Could not complete ride", "error");
      }
    } catch (err) {
      console.error("Complete failed", err);
    }
  };

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const pickupCoords = activeRide?.pickup?.coordinates
    ? [activeRide.pickup.coordinates[1], activeRide.pickup.coordinates[0]]
    : null;

  const destCoords = activeRide?.destination?.coordinates
    ? [
        activeRide.destination.coordinates[1],
        activeRide.destination.coordinates[0],
      ]
    : null;

  return (
    <div className="driver-page">
      {/* ── Sidebar ── */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* ── Floating brand badge top-left ── */}
      <div className="driver-float-brand">
        <button
          className="float-btn"
          onClick={() => setSidebarOpen(true)}
          style={{
            width: 34,
            height: 34,
            fontSize: 20,
            boxShadow: "none",
            background: "transparent",
          }}
        >
          <i className="bx bx-menu" />
        </button>
        <span className="driver-brand-name">
          Klouse <span>Driver</span>
        </span>
        <div className={`online-dot ${isOnline ? "online" : ""}`} />
      </div>

      {/* ── Floating online/offline button top-right ── */}
      <button
        className={`driver-toggle-btn ${isOnline ? "go-offline" : "go-online"}`}
        onClick={isOnline ? goOffline : goOnline}
      >
        {isOnline ? "Go Offline" : "Go Online"}
      </button>

      {/* ── MAP ── */}
      <div className="driver-map-wrap">
        {driverPosition ? (
          <MapContainer
            center={driverPosition}
            zoom={15}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              tileSize={512}
              zoomOffset={-1}
              detectRetina={true}
            />
            <LiveCenter position={driverPosition} />
            <Marker position={driverPosition}>
              <Popup>You are here</Popup>
            </Marker>
            {pickupCoords && (
              <Marker position={pickupCoords}>
                <Popup>Pickup</Popup>
              </Marker>
            )}
            {destCoords && (
              <Marker position={destCoords}>
                <Popup>Destination</Popup>
              </Marker>
            )}
          </MapContainer>
        ) : (
          <div className="driver-map-placeholder">
            <i className="bx bx-map-alt" />
            <p>
              {isOnline
                ? "Getting your location..."
                : "Go online to see the map"}
            </p>
          </div>
        )}
      </div>

      {/* ── BOTTOM PANEL ── */}
      <div className="driver-bottom">
        {/* Offline */}
        {!isOnline && (
          <div className="driver-offline-state">
            <i className="bx bx-moon" />
            <span>You're offline — tap Go Online to start</span>
          </div>
        )}

        {/* Online, waiting */}
        {isOnline && !pendingRide && !activeRide && (
          <div className="driver-waiting-state">
            <div className="waiting-spinner" />
            <p>Waiting for ride requests...</p>
            <span>You'll be notified when a rider is nearby</span>
          </div>
        )}

        {/* Pending ride request */}
        {pendingRide && !activeRide && (
          <div className="ride-request-card">
            <div className="request-header">
              <div className="request-ping" />
              <span className="request-title">New Ride Request</span>
            </div>
            <div className="request-details">
              <div className="request-row">
                <i className="bx bxs-circle pickup-col" />
                <span>Pickup nearby</span>
              </div>
              <div className="request-divider-line" />
              <div className="request-row">
                <i className="bx bxs-map dest-col" />
                <span>Destination set</span>
              </div>
            </div>
            <div className="request-actions">
              <button
                className="btn-decline"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("token");
                    const rideId = pendingRide.rideId || pendingRide._id;
                    await fetch(`${API}/ride/decline/${rideId}`, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` },
                    });
                  } catch (err) {
                    console.error("Failed to decline ride", err);
                  }
                  setPendingRide(null);
                }}
              >
                Decline
              </button>
              <button className="btn-accept" onClick={acceptRide}>
                Accept Ride
              </button>
            </div>
          </div>
        )}

        {/* Active ride */}
        {activeRide && (
          <div className="active-ride-card">
            <div className="active-header">
              <div className="active-pulse" />
              <span className="active-title">Ride in Progress</span>
              <span className="active-fare">
                GH₵ {activeRide.fare?.toFixed(2) ?? "—"}
              </span>
            </div>
            <div className="active-route">
              <div className="route-row">
                <div className="route-dot pickup-dot-d" />
                <div className="route-info">
                  <span className="route-label">Pickup</span>
                  <span className="route-value">Rider's location</span>
                </div>
              </div>
              <div className="route-line" />
              <div className="route-row">
                <div className="route-dot dest-dot-d" />
                <div className="route-info">
                  <span className="route-label">Destination</span>
                  <span className="route-value">
                    {activeRide.destinationName || "—"}
                  </span>
                </div>
              </div>
            </div>
            <button className="btn-complete" onClick={completeRide}>
              <i className="bx bxs-flag-checkered" />
              Mark as Completed
            </button>
          </div>
        )}
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`driver-toast driver-toast-${toast.type}`}>
          <i
            className={`bx ${
              toast.type === "success"
                ? "bxs-check-circle"
                : toast.type === "error"
                  ? "bxs-error-circle"
                  : "bxs-info-circle"
            }`}
          />
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default DriverPage;
