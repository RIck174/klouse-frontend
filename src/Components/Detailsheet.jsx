import "../Css/Detailsheet.css";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

function Detailsheet({
  showRideSheet,
  setShowRideSheet,
  position,
  destination,
  setDestination,
  vehicleType,
}) {
  const [destinationName, setDestinationName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [estimatedDistance, setEstimatedDistance] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [recentDestinations, setRecentDestinations] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();
  const debounceTimer = useRef(null);
  const fromSuggestion = useRef(false);

  // Fetch saved places from database
  useEffect(() => {
    if (!showRideSheet) return;
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

    // Still load recent destinations from localStorage
    const recent = JSON.parse(
      localStorage.getItem("recentDestinations") || "[]",
    );
    setRecentDestinations(recent);
  }, [showRideSheet]);

  // Getting destination name from map tap
  useEffect(() => {
    if (!destination) return;
    if (fromSuggestion.current) {
      fromSuggestion.current = false;
      return;
    }
    const fetchAddress = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${destination[0]}&lon=${destination[1]}`,
        );
        const data = await res.json();
        const name = data.name || data.address?.suburb || "Selected location";
        setDestinationName(name);
        setSuggestions([]);
      } catch (err) {
        console.log("Failed to fetch address");
      }
    };
    fetchAddress();
  }, [destination]);

  // Distance/fare/ETA calculation
  useEffect(() => {
    if (!position || !destination) return;
    const R = 6371;
    const dLat = ((destination[0] - position[0]) * Math.PI) / 180;
    const dLon = ((destination[1] - position[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((position[0] * Math.PI) / 180) *
        Math.cos((destination[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    setEstimatedDistance(distKm.toFixed(1));
    setEstimatedFare((5 + distKm * 2.5).toFixed(2));
    setEstimatedTime(Math.round((distKm / 30) * 60));
  }, [destination, position]);

  const saveToRecent = (name, coords) => {
    const recent = JSON.parse(
      localStorage.getItem("recentDestinations") || "[]",
    );
    const updated = [
      { name, coords },
      ...recent.filter((r) => r.name !== name),
    ].slice(0, 3);
    localStorage.setItem("recentDestinations", JSON.stringify(updated));
  };

  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setDestinationName(value);
    clearTimeout(debounceTimer.current);
    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${value}&limit=5&countrycodes=gh&addressdetails=1`,
          { headers: { "User-Agent": "KlouseApp/1.0" } },
        );
        const data = await res.json();
        if (data.length > 0) {
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.log("Search failed");
      }
    }, 500);
  };

  const handleSuggestionClick = (suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    const name = suggestion.display_name.split(",")[0];
    fromSuggestion.current = true;
    setDestination([lat, lon]);
    setDestinationName(name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleDestinationSearch = async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${destinationName},Ghana&limit=1`,
      );
      const data = await response.json();
      if (data.length > 0) {
        setDestination([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  const requestRide = async () => {
    try {
      if (!destination) return alert("Please pick a destination");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/ride/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destination: [destination[1], destination[0]],
          destinationName,
          vehicleType,
          notes,
        }),
      });
      const data = await response.json();
      if (data.ride?._id) {
        saveToRecent(destinationName, destination);
        navigate(`/rides/${data.ride._id}`);
      }
    } catch (err) {
      console.log("Ride request failed", err);
    }
  };

  return (
    <div
      className={`sheet-overlay ${showRideSheet ? "active" : ""}`}
      onClick={() => {
        setShowRideSheet(false);
        setShowSuggestions(false);
      }}
    >
      <div
        className={`rideSheet ${showRideSheet ? "active" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-content">
          {/* Search bar */}
          <div className="search-bar-wrap">
            <i className="bx bxs-map destination-dot" />
            <input
              className="destination-input"
              type="text"
              placeholder="Where to?"
              value={destinationName}
              onChange={handleDestinationChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={(e) => e.key === "Enter" && handleDestinationSearch()}
            />
            {destinationName.length > 0 && (
              <i
                className="bx bx-x clear-btn"
                onClick={() => {
                  setDestinationName("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
              />
            )}
          </div>

          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-list">
              {suggestions.map((s, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(s)}
                >
                  <i className="bx bxs-map-pin" />
                  <div className="suggestion-text">
                    <span className="suggestion-name">
                      {s.display_name.split(",")[0]}
                    </span>
                    <span className="suggestion-area">
                      {s.display_name.split(",").slice(1, 3).join(",")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Saved places from database */}
          {!showSuggestions && savedPlaces.length > 0 && (
            <div className="saved-places-row">
              {savedPlaces.map((place) => (
                <div
                  key={place._id}
                  className="saved-place-chip"
                  onClick={() => {
                    fromSuggestion.current = true;
                    // coordinates stored as [lng, lat] so flip for Leaflet
                    setDestination([
                      place.coordinates[1],
                      place.coordinates[0],
                    ]);
                    setDestinationName(place.label);
                  }}
                >
                  <i className={`bx ${place.icon}`} />
                  <span>{place.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recent destinations */}
          {!showSuggestions && recentDestinations.length > 0 && (
            <div className="recent-section">
              <p className="recent-label">Recent</p>
              {recentDestinations.map((r, i) => (
                <div
                  key={i}
                  className="recent-item"
                  onClick={() => {
                    fromSuggestion.current = true;
                    setDestination(r.coords);
                    setDestinationName(r.name);
                  }}
                >
                  <i className="bx bx-time-five" />
                  <span>{r.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Fare preview */}
          {estimatedFare && (
            <div className="fare-preview">
              <div className="fare-preview-item">
                <i className="bx bxs-map" />
                <span>{estimatedDistance} km</span>
              </div>
              <div className="fare-preview-item">
                <i className="bx bxs-time" />
                <span>~{estimatedTime} min</span>
              </div>
              <div className="fare-preview-item fare-highlight">
                <i className="bx bxs-wallet" />
                <span>~GH₵ {estimatedFare}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          {destination && (
            <div className="notes-wrap">
              <input
                type="text"
                className="notes-input"
                placeholder="Add a note for your driver... (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}

          {/* Confirm button */}
          <button
            className={`confirm-btn ${destination ? "confirm-btn-active" : ""}`}
            onClick={requestRide}
          >
            Confirm Ride <i className="bx bxs-chevron-right" />
          </button>
        </div>
      </div>
    </div>
  );
}
export default Detailsheet;
