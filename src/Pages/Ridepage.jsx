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

//Centering the map
function RecenterMap({ position, hasCentered, setHasCentered }) {
  const map = useMap();

  useEffect(() => {
    if (!hasCentered) {
      map.setView(position, 15);
      setHasCentered(true);
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

function RidePage({ showRideSheet, setShowRideSheet }) {
  const [position, setPosition] = useState(null);
  const [destination, setDestination] = useState(null);
  const [hasCentered, setHasCentered] = useState(false);
  const [destinationName, setDestinationName] = useState("");
  const navigate = useNavigate();

  const lastSentPosition = useRef(null);

  // Check for active ride on mount
  useActiveRide(null);

  //getting user location
  useEffect(() => {
    const watcher = navigator.geolocation.watchPosition(
      (location) => {
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;

        setPosition([lat, lng]);

        console.log("Current position:", lat, lng);
        console.log("Accuracy: ", location.coords.accuracy);
      },
      (error) => {
        console.log("Could not get location, using default", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  //  Send location to backend
  // Only sends if user has moved more than ~10 metres
  useEffect(() => {
    if (!position) return;

    if (lastSentPosition.current) {
      const [lastLat, lastLng] = lastSentPosition.current;
      const movedLat = Math.abs(position[0] - lastLat);
      const movedLng = Math.abs(position[1] - lastLng);

      // 0.0001 degrees ≈ 10 metres
      if (movedLat < 0.0001 && movedLng < 0.0001) return;
    }

    lastSentPosition.current = position;

    const sendLocationToBackend = async () => {
      try {
        const token = localStorage.getItem("token");
        await fetch(`${import.meta.env.VITE_API_URL}/user/location`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: position[0],
            lng: position[1],
          }),
        });
      } catch (err) {
        console.log("Failed to send location");
      }
    };
    sendLocationToBackend();
  }, [position]);

  // Register user socket
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
    return () => {
      socket.off("rideAccepted");
    };
  }, [navigate]);

  return (
    <>
      <div className="map-section">
        {position && (
          <MapContainer zoom={10} zoomControl={false} className="map">
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

            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </MapContainer>
        )}
      </div>

      <div className="ride-btn" onClick={() => setShowRideSheet(true)}>
        <button className="btn">Request Ride</button>
      </div>
      <Detailsheet
        showRideSheet={showRideSheet}
        setShowRideSheet={setShowRideSheet}
        position={position}
        destination={destination}
        setDestination={setDestination}
      />
    </>
  );
}
export default RidePage;
