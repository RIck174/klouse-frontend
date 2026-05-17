import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import socket from "../socket";
import "../Css/Driverpage.css";
import "boxicons/css/boxicons.min.css";
import Sidebar from "../Components/Sidebar";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
const API = import.meta.env.VITE_API_URL;

function LiveCenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
  return null;
}

function PulsingCircle({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;

    const el = document.createElement("div");
    el.className = "pulse-ring";

    const marker = L.marker(position, {
      icon: L.divIcon({
        className: "",
        html: el.outerHTML,
        iconSize: [200, 200],
        iconAnchor: [100, 100],
      }),
      interactive: false,
      zIndexOffset: -1,
    }).addTo(map);

    return () => map.removeLayer(marker);
  }, [position, map]);

  return null;
}

function DriverPage() {
  const navigate = useNavigate();
  const [driverPosition, setDriverPosition] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [pendingRide, setPendingRide] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [countdown, setCountdown] = useState(20);

  const countdownRef = useRef(null);
  const locationWatcher = useRef(null);
  const locationInterval = useRef(null);
  const prevPositionRef = useRef(null);
  const [bearing, setBearing] = useState(0);

  function calculateBearing(prev, next) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;

    const dLng = toRad(next[1] - prev[1]);
    const lat1 = toRad(prev[0]);
    const lat2 = toRad(next[0]);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  useEffect(() => {
    if (!driverPosition) return;

    if (routeCoords.length > 1) {
      const angle = getBearingFromRoute(driverPosition, routeCoords);
      setBearing(angle);
    } else if (prevPositionRef.current) {
      const angle = calculateBearing(prevPositionRef.current, driverPosition);
      setBearing(angle);
    }

    prevPositionRef.current = driverPosition;
  }, [driverPosition, routeCoords]);

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
      startCountdown();
      playRequestSound();
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
          socket.emit("driverLocationUpdate", {
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

  const fetchRouteCoords = async (from, to) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/ride/route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickup: [from[1], from[0]],
          destination: [to[1], to[0]],
        }),
      });
      const data = await res.json();
      const coords = data.features[0].geometry.coordinates.map(([lng, lat]) => [
        lat,
        lng,
      ]);
      setRouteCoords(coords);
    } catch (err) {
      console.error("Failed to fetch route coords", err);
    }
  };

  const getBearingFromRoute = (position, coords) => {
    if (!coords || coords.length < 2) return bearing;

    let closestIndex = 0;
    let minDist = Infinity;

    coords.forEach(([lat, lng], i) => {
      const d = Math.sqrt(
        Math.pow(lat - position[0], 2) + Math.pow(lng - position[1], 2),
      );
      if (d < minDist) {
        minDist = d;
        closestIndex = i;
      }
    });

    const nextIndex = Math.min(closestIndex + 1, coords.length - 1);
    return calculateBearing(coords[closestIndex], coords[nextIndex]);
  };

  const acceptRide = async () => {
    if (!pendingRide) return;
    clearInterval(countdownRef.current);
    setCountdown(20);
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
        // Immediately send current position to rider
        if (driverPosition) {
          socket.emit("driverLocationUpdate", {
            rideId,
            lat: driverPosition[0],
            lng: driverPosition[1],
          });
        }
        showToast("Ride accepted!", "success");

        // Fetch route from driver to pickup
        if (driverPosition && data.ride.pickup?.coordinates) {
          const pickup = [
            data.ride.pickup.coordinates[1],
            data.ride.pickup.coordinates[0],
          ];
          fetchRouteCoords(driverPosition, pickup);
        }
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
        setRouteCoords([]); // clear route
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

  const markArrived = async () => {
    if (!activeRide) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/ride/arrived/${activeRide._id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setActiveRide(data.ride);
        showToast("Rider notified you've arrived!", "success");
      }
    } catch (err) {
      console.error("Failed to mark arrived", err);
    }
  };

  const startRide = async () => {
    if (!activeRide) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/ride/start/${activeRide._id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setActiveRide(data.ride);
        // Now fetch route from pickup to destination
        if (
          activeRide.pickup?.coordinates &&
          activeRide.destination?.coordinates
        ) {
          const pickup = [
            activeRide.pickup.coordinates[1],
            activeRide.pickup.coordinates[0],
          ];
          const destination = [
            activeRide.destination.coordinates[1],
            activeRide.destination.coordinates[0],
          ];
          fetchRouteCoords(pickup, destination);
        }
        showToast("Ride started!", "success");
      }
    } catch (err) {
      console.error("Failed to start ride", err);
    }
  };

  const carIcon = L.divIcon({
    className: "",
    html: `<div style="
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: rotate(${bearing}deg);
    transition: transform 0.8s ease;
  ">
    <img src="https://res.cloudinary.com/dkalpzvt0/image/upload/v1778893145/vecteezy_white-suv-on-transparent-background-3d-rendering_25309495_ev3bhe.webp" style="width: 44px; height: 44px; object-fit: contain;"/>
  </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

  const playSoundRequest = () => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const beep = (freq, start, duration) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = freq;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + start);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + start + duration,
      );
      oscillator.start(audioCtx.currentTime + start);
      oscillator.stop(audioCtx.currentTime + start + duration);
    };

    beep(880, 0, 0.15);
    beep(660, 0.2, 0.15);
    beep(880, 0.4, 0.3);
  };

  const startCountdown = () => {
    setCountdown(20);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setPendingRide(null); // auto decline - no API call
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
  };

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
            width: 24,
            height: 24,
            fontSize: 18,
            boxShadow: "none",
            background: "transparent",
            padding: 0,
            minWidth: "unset",
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
            <Marker position={driverPosition} icon={carIcon}>
              <Popup>You are here</Popup>
            </Marker>

            {isOnline && !activeRide && driverPosition && (
              <PulsingCircle position={driverPosition} />
            )}

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

            {routeCoords.length > 1 && (
              <Polyline
                positions={routeCoords}
                color="#1a56db"
                weight={5}
                opacity={0.85}
              />
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
            <button
              className="earnings-shortcut-btn"
              onClick={() => navigate("/earnings")}
            >
              <i className="bx bxs-wallet" /> View Earnings
            </button>
          </div>
        )}

        {/* Pending ride request */}
        {pendingRide && !activeRide && (
          <div className="ride-request-float">
            {/* Countdown ring */}
            <div className="request-countdown-wrap">
              <svg className="countdown-svg" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="#1a56db"
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - countdown / 20)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 22 22)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span className="countdown-number">{countdown}</span>
            </div>

            <div className="request-float-content">
              {/* Header */}
              <div className="request-float-header">
                <div className="request-ping" />
                <span className="request-title">New Ride Request</span>
                <span className="request-float-badge">
                  {pendingRide?.vehicleType}
                </span>
              </div>

              {/* Details */}
              <div className="request-float-details">
                <div className="request-float-row">
                  <i
                    className="bx bxs-circle"
                    style={{ color: "#1a56db", fontSize: 12 }}
                  />
                  <span>Pickup nearby</span>
                  {driverPosition && pendingRide?.pickup && (
                    <span className="request-float-distance">
                      {Math.sqrt(
                        Math.pow(
                          (pendingRide.pickup.coordinates[1] -
                            driverPosition[0]) *
                            111,
                          2,
                        ) +
                          Math.pow(
                            (pendingRide.pickup.coordinates[0] -
                              driverPosition[1]) *
                              111,
                            2,
                          ),
                      ).toFixed(1)}{" "}
                      km away
                    </span>
                  )}
                </div>
                <div className="request-float-divider" />
                <div className="request-float-row">
                  <i
                    className="bx bxs-map"
                    style={{ color: "#0f172a", fontSize: 12 }}
                  />
                  <span>
                    {pendingRide?.destinationName || "Destination set"}
                  </span>
                  <span className="request-float-fare">
                    GH₵ {pendingRide?.fare?.toFixed(2) || "—"}
                  </span>
                </div>
                {pendingRide?.notes && (
                  <div className="request-float-row">
                    <i
                      className="bx bxs-note"
                      style={{ color: "#94a3b8", fontSize: 12 }}
                    />
                    <span style={{ color: "#64748b", fontSize: "12px" }}>
                      {pendingRide.notes}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="request-float-actions">
                <button
                  className="btn-decline"
                  onClick={async () => {
                    clearInterval(countdownRef.current);
                    setCountdown(20);
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
          </div>
        )}

        {/* Active ride */}
        {activeRide && (
          <div className="active-ride-card">
            <div className="active-header">
              <div className="active-pulse" />
              <span className="active-title">
                {activeRide.status === "Arrived"
                  ? "Waiting for Rider"
                  : activeRide.status === "InProgress"
                    ? "Ride in Progress"
                    : "Heading to Pickup"}
              </span>
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

            {/* Heading to pickup */}
            {activeRide.status === "Accepted" && (
              <button className="btn-arrived" onClick={markArrived}>
                <i className="bx bxs-map-pin" />
                I've Arrived at Pickup
              </button>
            )}

            {/* Arrived - waiting for rider */}
            {activeRide.status === "Arrived" && (
              <button className="btn-start" onClick={startRide}>
                <i className="bx bxs-right-arrow-circle" />
                Start Ride
              </button>
            )}

            {/* Ride in progress */}
            {activeRide.status === "InProgress" && (
              <button className="btn-complete" onClick={completeRide}>
                <i className="bx bxs-flag-checkered" />
                Mark as Completed
              </button>
            )}
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
