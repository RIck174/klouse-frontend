import { useEffect, useState, useMemo } from "react";
import { ShowRoute } from "../Components/MapHelpers";
import "../Css/Homepage.css";
import "../Css/Rides.css";
import "boxicons/css/boxicons.min.css";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import useActiveRide from "../hooks/useActiveRide";
import useRideTracking from "../hooks/useRideTracking";
import socket from "../socket";
import Sidebar from "../Components/Sidebar";
import L from "leaflet";

function Rides() {
  const { id: rideId } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useActiveRide(rideId);
  const {
    driverPosition,
    userPosition,
    eta,
    distance,
    driverInfo,
    rideStatus,
    setRideStatus,
  } = useRideTracking(rideId);

  const pickupLatLng = useMemo(() => {
    return ride?.pickup?.coordinates
      ? [ride.pickup.coordinates[1], ride.pickup.coordinates[0]]
      : null;
  }, [ride]);

  const destinationLatLng = useMemo(() => {
    return ride?.destination?.coordinates
      ? [ride.destination.coordinates[1], ride.destination.coordinates[0]]
      : null;
  }, [ride]);

  // Fetch ride data
  useEffect(() => {
    if (!rideId) return;
    const fetchRide = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/ride/${rideId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        setRide(data);
        // Set initial status from fetched ride
        if (data.status === "Accepted") setRideStatus("accepted");
        else if (data.status === "Arrived") setRideStatus("arrived");
        else if (data.status === "InProgress") setRideStatus("inProgress");
        else if (data.status === "Searching") setRideStatus("searching");
      } catch (err) {
        console.error("Failed to fetch ride:", err);
      }
    };
    fetchRide();
  }, [rideId]);

  // Listen for ride completed
  useEffect(() => {
    socket.on("rideCompleted", () => navigate("/home"));
    return () => socket.off("rideCompleted");
  }, []);

  // Cancel ride
  const cancelRide = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${import.meta.env.VITE_API_URL}/ride/cancel/${rideId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate("/home");
    } catch (err) {
      console.error("Failed to cancel ride:", err);
    }
  };

  // ── No rideId ──
  if (!rideId) {
    return (
      <div className="rides-container">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <button
          className="float-btn float-menu"
          onClick={() => setSidebarOpen(true)}
          style={{ position: "absolute", top: 16, left: 16, zIndex: 1000 }}
        >
          <i className="bx bx-menu" />
        </button>
        <div className="no-ride-overlay">
          <i
            className="bx bxs-car"
            style={{ fontSize: "52px", color: "#1a56db", marginBottom: "4px" }}
          />
          <h2>No Active Ride</h2>
          <p>Request a ride from the home screen</p>
          <button
            className="no-ride-btn"
            onClick={() => navigate("/home", { state: { openSheet: true } })}
          >
            Request a Ride
          </button>
        </div>
      </div>
    );
  }

  // ── Has rideId ──
  return (
    <div className="rides-container">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <button
        className="float-btn float-menu"
        onClick={() => setSidebarOpen(true)}
        style={{ position: "absolute", top: 16, left: 16, zIndex: 1000 }}
      >
        <i className="bx bx-menu" />
      </button>

      {userPosition ? (
        <MapContainer
          center={userPosition}
          zoom={15}
          zoomControl={false}
          style={{ height: "100vh", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            tileSize={512}
            zoomOffset={-1}
            detectRetina={true}
          />
          <Marker position={userPosition} />
          {pickupLatLng && <Marker position={pickupLatLng} />}
          {destinationLatLng && <Marker position={destinationLatLng} />}
          {pickupLatLng && destinationLatLng && (
            <ShowRoute pickup={pickupLatLng} destination={destinationLatLng} />
          )}
          {driverPosition && (
            <Marker
              position={driverPosition}
              icon={L.divIcon({
                className: "",
                html: `<div style="
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img src="https://res.cloudinary.com/dkalpzvt0/image/upload/v1778893145/vecteezy_white-suv-on-transparent-background-3d-rendering_25309495_ev3bhe.webp" style="width: 44px; height: 44px; object-fit: contain;"/>
      </div>`,
                iconSize: [44, 44],
                iconAnchor: [22, 22],
              })}
            />
          )}
        </MapContainer>
      ) : (
        <div className="map-loading">Locating you...</div>
      )}

      {/* Bottom Sheet */}
      <div className="ride-bottom-sheet">
        {/* Searching */}
        {rideStatus === "searching" && (
          <div className="sheet-searching">
            <div className="searching-spinner" />
            <p>Finding your driver...</p>
            <p className="searching-sub">This usually takes under a minute</p>
            <button className="cancel-btn" onClick={cancelRide}>
              <i className="bx bx-x" /> Cancel Ride
            </button>
          </div>
        )}

        {/* Accepted - driver heading to pickup */}
        {rideStatus === "accepted" && (
          <div className="sheet-accepted">
            <div className="driver-info">
              <div className="driver-avatar">
                <i className="bx bxs-user" />
              </div>
              <div className="driver-details">
                <h3>{driverInfo?.name ?? "Your Driver"}</h3>
                <span className="driver-rating">
                  <i className="bx bxs-star" />
                  {driverInfo?.rating ?? "5.0"}
                </span>
              </div>
              <div className="fare-box">
                <span className="fare-label">Fare</span>
                <span className="fare-amount">GH₵ {ride?.fare ?? "—"}</span>
              </div>
            </div>
            <div className="eta-row">
              <i className="bx bxs-time" />
              {eta != null
                ? `Driver arriving in ${eta} min · ${distance} km away`
                : "Calculating ETA..."}
            </div>
            <button className="cancel-btn" onClick={cancelRide}>
              <i className="bx bx-x" /> Cancel Ride
            </button>
          </div>
        )}

        {/* Driver arrived */}
        {rideStatus === "arrived" && (
          <div className="sheet-accepted">
            <div className="driver-info">
              <div className="driver-avatar">
                <i className="bx bxs-user" />
              </div>
              <div className="driver-details">
                <h3>{driverInfo?.name ?? "Your Driver"}</h3>
                <span className="driver-rating">
                  <i className="bx bxs-star" />
                  {driverInfo?.rating ?? "5.0"}
                </span>
              </div>
              <div className="fare-box">
                <span className="fare-label">Fare</span>
                <span className="fare-amount">GH₵ {ride?.fare ?? "—"}</span>
              </div>
            </div>
            <div
              className="eta-row"
              style={{
                background: "#f0fdf4",
                borderColor: "#bbf7d0",
                color: "#16a34a",
              }}
            >
              <i className="bx bxs-map-pin" style={{ color: "#16a34a" }} />
              Your driver has arrived! Head to the pickup point.
            </div>
            <button className="cancel-btn" onClick={cancelRide}>
              <i className="bx bx-x" /> Cancel Ride
            </button>
          </div>
        )}

        {/* Ride in progress */}
        {rideStatus === "inProgress" && (
          <div className="sheet-accepted">
            <div className="driver-info">
              <div className="driver-avatar">
                <i className="bx bxs-user" />
              </div>
              <div className="driver-details">
                <h3>{driverInfo?.name ?? "Your Driver"}</h3>
                <span className="driver-rating">
                  <i className="bx bxs-star" />
                  {driverInfo?.rating ?? "5.0"}
                </span>
              </div>
              <div className="fare-box">
                <span className="fare-label">Fare</span>
                <span className="fare-amount">GH₵ {ride?.fare ?? "—"}</span>
              </div>
            </div>
            <div
              className="eta-row"
              style={{
                background: "#eff6ff",
                borderColor: "#bfdbfe",
                color: "#1a56db",
              }}
            >
              <i className="bx bxs-navigation" style={{ color: "#1a56db" }} />
              Ride in progress — heading to your destination
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Rides;
