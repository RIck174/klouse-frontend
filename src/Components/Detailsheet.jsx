import "../Css/Detailsheet.css";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

function Detailsheet({
  showRideSheet,
  setShowRideSheet,
  position,
  destination,
  setDestination,
}) {
  const [pickupName, setPickupName] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [estimatedDistance, setEstimatedDistance] = useState(null);
  const [driverName, setDriverName] = useState(null);
  const navigate = useNavigate();
  const debounceTimer = useRef(null);
  const fromSuggestion = useRef(false);

  //geting pickupname
  useEffect(() => {
    if (!position) return;

    const fetchAddress = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}`,
        );
        const data = await res.json();
        setPickupName(data.name);
        if (!data.name) {
          setPickupName(data.address.suburb);
        }
      } catch (err) {
        console.log("Failed to fetch address");
      }
    };

    fetchAddress();
  }, [position]);

  //getting destination name
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
        const name = data.name || data.address.suburb;
        setDestinationName(name);
        setSuggestions([]);
      } catch (err) {
        console.log("Failed to fetch address");
      }
    };
    fetchAddress();
  }, [destination]);

  useEffect(() => {
    if (!position || !destination) return;

    // Rough distance using Haversine formula
    const R = 6371; // Earth radius in km
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
    setEstimatedFare((5 + distKm * 2.5).toFixed(2)); // GH₵5 base + GH₵2.5/km
  }, [destination, position]);

  // Search for places as user types — debounced so it waits 400ms after typing stops
  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setDestinationName(value);

    // Clear the previous timer every keystroke
    clearTimeout(debounceTimer.current);

    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    // Only fires 400ms after user stops typing
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${value}&limit=5&countrycodes=gh&addressdetails=1`,
        );
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.log("Search failed");
      }
    }, 400);
  };

  // When user clicks a suggestion
  const handleSuggestionClick = (suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    fromSuggestion.current = true;
    setDestination([lat, lon]);
    setDestinationName(suggestion.display_name.split(",")[0]);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  //getting the destination from search
  const handleDestinationSearch = async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${destinationName},Ghana&format=json&limit=1`,
      );

      const data = await response.json();

      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setDestination([lat, lon]);
      }
    } catch (error) {
      console.error("Geocoding error: ", error);
    }
  };

  //request ride
  const requestRide = async () => {
    try {
      if (!destination) {
        return alert("Please pick a destination");
      }
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/ride/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destination: [destination[1], destination[0]],
          destinationName: destinationName,
        }),
      });
      const data = await response.json();
      console.log("response: ", data);

      if (data.ride?._id) {
        navigate(`/rides/${data.ride._id}`);
      }
    } catch (err) {
      console.log("Ride request failed", err);
    }
  };

  return (
    <div
      className={`sheet-overlay ${showRideSheet ? "active" : ""}`}
      onClick={() => setShowRideSheet(false)}
    >
      <div
        className={`rideSheet ${showRideSheet ? "active" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="sheet-handle" />

        <div className="sheet-content">
          {/* Both inputs on the same row */}
          <div className="inputs-row">
            {/* Pickup — left */}
            <div className="input-group">
              <div className="input-label">FROM</div>
              <div className="location-input pickup-display">
                <i className="bx bxs-circle pickup-dot" />
                <span>{pickupName || "Getting location..."}</span>
              </div>
            </div>

            {/* Destination — right, suggestions drop under this only */}
            <div className="input-group">
              <div className="input-label">TO</div>
              <div className="location-input">
                <i className="bx bxs-map destination-dot" />
                <input
                  className="destination-input"
                  type="text"
                  placeholder="Where to?"
                  value={destinationName}
                  onChange={handleDestinationChange}
                  onFocus={() =>
                    suggestions.length > 0 && setShowSuggestions(true)
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleDestinationSearch()
                  }
                />
              </div>

              {/* Suggestions sit inside the destination input-group so they align under it */}
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
            </div>
          </div>

          {/* Fare preview */}
          {estimatedFare && (
            <div className="fare-preview">
              <div className="fare-preview-item">
                <i className="bx bxs-map" />
                <span>{estimatedDistance} km</span>
              </div>
              <div className="fare-preview-item fare-highlight">
                <i className="bx bxs-wallet" />
                <span>~GH₵ {estimatedFare}</span>
              </div>
            </div>
          )}

          <button className="confirm-btn" onClick={requestRide}>
            Confirm <i className="bx bxs-chevron-right" />
          </button>
        </div>
      </div>
    </div>
  );
}
export default Detailsheet;
