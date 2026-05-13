import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { ShowRoute } from "../Components/MapHelpers";
import { useNavigate } from "react-router-dom";
import Detailsheet from "../Components/Detailsheet";
import "leaflet/dist/leaflet.css";
import "../Css/Homepage.css";
import socket from "../socket";
import useActiveRide from "../hooks/useActiveRide";

const API = import.meta.env.VITE_API_URL;

function RecenterMap({ position, hasCentered, setHasCentered }) {
  const map = useMap();
  useEffect(() => {
    if (position && !hasCentered) {
      map.setView([7.9465, -1.0232], 6);
      setTimeout(() => {
        map.flyTo(position, 17, {
          duration: 2.5,
          easeLinearity: 0.25,
        });
        setHasCentered(true);
      }, 500);
    }
  }, [position, hasCentered, map, setHasCentered]);
  return null;
}

function LocationMarker({ setDestination }) {
  useMapEvents({
    click(e) {
      setDestination([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function RidePage({ showRideSheet, setShowRideSheet, onMenuClick }) {
  const [position, setPosition] = useState(null);
  const [destination, setDestination] = useState(null);
  const [hasCentered, setHasCentered] = useState(false);
  const [destinationName, setDestinationName] = useState("");
  const [vehicleType, setVehicleType] = useState("Car");
  const [userProfile, setUserProfile] = useState(null);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const navigate = useNavigate();
  const lastSentPosition = useRef(null);

  useActiveRide(null);

  // Fetch user profile for name/avatar
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUserProfile(data);
      } catch (err) {
        console.log("Failed to fetch profile");
      }
    };
    fetchProfile();
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
      } catch (err) {
        console.log("Failed to fetch saved places");
      }
    };
    fetchPlaces();
  }, []);

  // Watch user location
  useEffect(() => {
    const watcher = navigator.geolocation.watchPosition(
      (location) => {
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;
        setPosition([lat, lng]);
        console.log("Current position:", lat, lng);
        console.log("Accuracy:", location.coords.accuracy);
      },
      (error) => console.log("Could not get location, using default", error),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // Send location to backend (only if moved >10m)
  useEffect(() => {
    if (!position) return;
    if (lastSentPosition.current) {
      const [lastLat, lastLng] = lastSentPosition.current;
      if (
        Math.abs(position[0] - lastLat) < 0.0001 &&
        Math.abs(position[1] - lastLng) < 0.0001
      )
        return;
    }
    lastSentPosition.current = position;
    const sendLocationToBackend = async () => {
      try {
        const token = localStorage.getItem("token");
        await fetch(`${API}/user/location`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lat: position[0], lng: position[1] }),
        });
      } catch (err) {
        console.log("Failed to send location");
      }
    };
    sendLocationToBackend();
  }, [position]);

  // Register socket
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      socket.emit("register", payload.id);
    }
  }, []);

  // Listen for ride accepted
  useEffect(() => {
    socket.on("rideAccepted", (data) => {
      socket.emit("rideRoom", data.rideId);
      navigate(`/rides/${data.rideId}`);
    });
    return () => socket.off("rideAccepted");
  }, [navigate]);

  const getInitials = () => {
    if (!userProfile?.email) return "?";
    return userProfile.email.slice(0, 2).toUpperCase();
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <>
      {/* Map */}
      <div className="map-section">
        {position && (
          <MapContainer
            zoom={6}
            center={[7.9465, -1.0232]}
            zoomControl={false}
            className="map"
            minZoom={6}
            maxBounds={[
              [4.5, -3.5],
              [11.5, 1.5],
            ]}
            maxBoundsViscosity={1.0}
          >
            <RecenterMap
              position={position}
              hasCentered={hasCentered}
              setHasCentered={setHasCentered}
            />
            <LocationMarker setDestination={setDestination} />
            <Marker position={position}>
              <Popup>Your pickup location</Popup>
            </Marker>
            {destination && (
              <Marker position={destination}>
                <Popup>{destinationName || "Destination"}</Popup>
              </Marker>
            )}
            {destination && (
              <ShowRoute pickup={position} destination={destination} />
            )}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              tileSize={512}
              zoomOffset={-1}
              detectRetina={true}
            />
          </MapContainer>
        )}
      </div>

      {/* Floating top controls */}
      <div className="floating-top">
        <button className="float-btn float-menu" onClick={onMenuClick}>
          <i className="bx bx-menu" />
        </button>

        <div className="vehicle-toggle">
          <div
            className="toggle-slider"
            style={{
              transform:
                vehicleType === "Car" ? "translateX(0)" : "translateX(100%)",
            }}
          />
          <button
            className={`toggle-opt ${vehicleType === "Car" ? "toggle-opt-active" : ""}`}
            onClick={() => setVehicleType("Car")}
          >
            <i className="bx bxs-car" /> Car
          </button>
          <button
            className={`toggle-opt ${vehicleType === "Motorbike" ? "toggle-opt-active" : ""}`}
            onClick={() => setVehicleType("Motorbike")}
          >
            <i className="bx bxs-cycling" /> Moto
          </button>
        </div>

        <div
          className="float-btn float-avatar"
          onClick={() => navigate("/settings")}
        >
          {userProfile?.profileImage ? (
            <img
              src={userProfile.profileImage}
              alt="avatar"
              className="avatar-img-small"
            />
          ) : (
            <span className="avatar-initials">{getInitials()}</span>
          )}
        </div>
      </div>

      {/* Always-peeking bottom panel */}
      {/* Always-peeking bottom panel */}
      {!showRideSheet && (
        <div
          className="home-bottom-panel"
          onTouchMove={(e) => e.preventDefault()}
        >
          <div className="panel-handle" />
          <p className="panel-greeting">
            {greeting()}
            {userProfile?.username ? `, ${userProfile.username}` : ""}
          </p>
          <div
            className="panel-search-bar"
            onClick={() => setShowRideSheet(true)}
          >
            <i className="bx bxs-map panel-search-icon" />
            <span className="panel-search-placeholder">Where to?</span>
          </div>
          <div className="panel-chips">
            {savedPlaces.slice(0, 3).map((place) => (
              <div
                key={place._id}
                className="panel-chip"
                onClick={() => setShowRideSheet(true)}
              >
                <i className={`bx ${place.icon}`} />
                {place.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <Detailsheet
        showRideSheet={showRideSheet}
        setShowRideSheet={setShowRideSheet}
        position={position}
        destination={destination}
        setDestination={setDestination}
        vehicleType={vehicleType}
      />
    </>
  );
}
export default RidePage;
