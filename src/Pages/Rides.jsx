import { useEffect, useState, useMemo } from "react";
import Navigation from "../Components/Navigation";
import { ShowRoute } from "../Components/MapHelpers";
import "../Css/Homepage.css";
import "../Css/Rides.css";
import "boxicons/css/boxicons.min.css";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import useActiveRide from "../hooks/useActiveRide";
import useRideTracking from "../hooks/useRideTracking";
import socket from "../socket";

function Rides() {
  const { id: rideId } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null); // ride data from backend

  useActiveRide(rideId);
  const {
    driverPosition,
    userPosition,
    eta,
    distance,
    driverInfo,
    rideStatus,
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

  // Fetch ride data from backend
  useEffect(() => {
    if (!rideId) return;

    const fetchRide = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/ride/${rideId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) return;
        const data = await res.json();
        setRide(data);
      } catch (err) {
        console.error("Failed to fetch ride:", err);
      }
    };

    fetchRide();
  }, [rideId]);

  useEffect(() => {
    socket.on("rideCompleted", () => {
      navigate("/home");
    });
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

  // ── STATE 1: No rideId ──
  if (!rideId) {
    return (
      <div className="homepage-container">
        <Navigation />
        <div className="no-ride-overlay">
          <h2>No Active Ride</h2>
          <p>Request a ride from the home screen</p>
          <button
            className="btn"
            onClick={() => navigate("/home", { state: { openSheet: true } })}
          >
            Request Ride
          </button>
        </div>
      </div>
    );
  }

  // ── STATE 2 & 3: Has rideId ──
  return (
    <div className="homepage-container">
      <Navigation />

      {userPosition ? (
        <MapContainer
          center={userPosition}
          zoom={15}
          zoomControl={false}
          style={{ height: "100vh", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <Marker position={userPosition} />
          {pickupLatLng && <Marker position={pickupLatLng} />}
          {destinationLatLng && <Marker position={destinationLatLng} />}

          {/* Road route — only draws when route data is ready */}
          {pickupLatLng && destinationLatLng && (
            <ShowRoute pickup={pickupLatLng} destination={destinationLatLng} />
          )}

          {driverPosition && <Marker position={driverPosition} />}
        </MapContainer>
      ) : (
        <div className="map-loading">Locating you...</div>
      )}

      <div className="ride-bottom-sheet">
        {rideStatus === "searching" && (
          <div className="sheet-searching">
            <div className="searching-spinner" />
            <p>Finding your driver...</p>
            <button className="cancel-btn" onClick={cancelRide}>
              Cancel Ride
            </button>
          </div>
        )}

        {rideStatus === "accepted" && (
          <div className="sheet-accepted">
            <div className="driver-info">
              <div className="driver-avatar">
                <i className="bx bxs-user" />
              </div>
              <div className="driver-details">
                <h3>{driverInfo?.name ?? "Driver"}</h3>
                <span className="driver-rating">
                  <i className="bx bxs-star" />
                  {driverInfo?.rating ?? "—"}
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
                ? `Driver arriving in ${eta} min • ${distance} km away`
                : "Calculating..."}
            </div>

            <button className="cancel-btn" onClick={cancelRide}>
              Cancel <i className="bx bxs-x-circle" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Rides;
