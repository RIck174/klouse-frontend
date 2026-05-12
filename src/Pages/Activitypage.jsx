import { useState, useEffect } from "react";
import Navigation from "../Components/Navigation";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { ShowRoute } from "../Components/MapHelpers";
import "leaflet/dist/leaflet.css";
import "../Css/Homepage.css";
import "../Css/Activitypage.css";
import "boxicons/css/boxicons.min.css";

const API = import.meta.env.VITE_API_URL;

function Activity() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedRide, setSelectedRide] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const FILTERS = ["All", "Completed", "Cancelled"];

  //Fetch all rides
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/ride/all-history`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setRides(data);
      } catch (err) {
        console.error("Failed to fetch rides", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter rides based on active tab
  const filteredRides = rides
    .filter((ride) => activeFilter === "All" || ride.status === activeFilter)
    .filter((ride) =>
      ride.destinationName?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  //Completed Rides
  const completedRides = rides.filter((ride) => ride.status === "Completed");
  const totalSpent = completedRides.reduce((sum, r) => sum + (r.fare || 0), 0);

  const lastRide = rides[0];

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const monthlySpending = completedRides.reduce((acc, ride) => {
    const month = new Date(ride.createdAt).toLocaleDateString("en-Gh", {
      month: "short",
      year: "numeric",
    });

    acc[month] = (acc[month] || 0) + (ride.fare || 0);
    return acc;
  }, {});

  const monthlyData = Object.entries(monthlySpending)
    .map(([month, total]) => ({ month, total }))
    .slice(0, 4);

  //loading state
  if (loading) {
    return (
      <div className="activity-page">
        <Navigation />
        <div className="activity-loading">
          <div className="searching-spinner" />
          <p>Loading activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-page">
      <Navigation />
      <div className="activity-content">
        <div className="activity-left">
          <h2 className="activity-title">Activity</h2>
          <input
            type="text"
            placeholder="Search destination"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="activity-search"
          />

          {/* ── FILTER TABS ── */}
          <div className="activity-filters">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                className={`filter-tab ${filter === activeFilter ? "filter-active" : ""}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* ── RIDES LIST ── */}
          {filteredRides.length === 0 ? (
            <div className="activity-empty">
              <i className="bx bxs-car" />
              <p>
                No {activeFilter === "All" ? "" : activeFilter.toLowerCase()}{" "}
                rides yet
              </p>
            </div>
          ) : (
            <div className="activity-list">
              {filteredRides.map((ride) => (
                <div key={ride._id} className="activity-card">
                  <div
                    className={`activity-icon ${ride.status === "Cancelled" ? "activity-icon-cancelled" : ""}`}
                  >
                    <i className="bx bxs-car" />
                  </div>

                  {/* Middle — details */}
                  <div className="activity-details">
                    <span>{ride.destinationName || "Unknown destination"}</span>
                    <span>{formatDate(ride.createdAt)}</span>
                  </div>

                  {/* Right — fare + status badge */}
                  <div className="activity-right">
                    <span className="activity-fare">
                      {ride.status === "Cancelled"
                        ? "-"
                        : `GH₵ ${(ride.fare || 0).toFixed(2)} `}
                    </span>
                    <span
                      className={`activity-badge  ${ride.status === "Completed" ? "badge-completed" : "badge-cancelled"}`}
                    >
                      {ride.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="activity-right-panel">
          <div className="right-card stats-card">
            <h3 className="right-card-title">Overview</h3>

            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{rides.length}</span>
                <span className="stat-label">Total Rides</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{completedRides.length}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">GH₵ {totalSpent.toFixed(2)}</span>
                <span className="stat-label">Total Spent</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {rides.length - completedRides.length}
                </span>
                <span className="stat-label">Cancelled</span>
              </div>
            </div>
          </div>

          {lastRide && (
            <div className="right-card map-card">
              <h3 className="right-card-title">Last Ride</h3>
              <div className="map-card-info">
                <span className="map-destintion">
                  <i className="bx bxs-map" />
                  {lastRide.destinationName || "Unknown"}
                </span>
              </div>
              <div className="map-card-container">
                <MapContainer
                  center={[
                    lastRide.pickup.coordinates[1],
                    lastRide.pickup.coordinates[0],
                  ]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={false}
                  dragging={false}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    tileSize={512}
                    zoomOffset={-1}
                    detectRetina={true}
                  />
                  <ShowRoute
                    pickup={[
                      lastRide.pickup.coordinates[1],
                      lastRide.pickup.coordinates[0],
                    ]}
                    destination={[
                      lastRide.destination.coordinates[1],
                      lastRide.destination.coordinates[0],
                    ]}
                  />
                  <Marker
                    position={[
                      lastRide.pickup.coordinates[1],
                      lastRide.pickup.coordinates[0],
                    ]}
                  >
                    <Popup>Pickup</Popup>
                  </Marker>

                  <Marker
                    position={[
                      lastRide.destination.coordinates[1],
                      lastRide.destination.coordinates[0],
                    ]}
                  >
                    <Popup>Destination</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}

          <div className="right-card spending-card">
            <h3 className="right-card-title">Monthly Spending</h3>
            {monthlyData.length === 0 ? (
              <p className="spending-empty">No spending data yet</p>
            ) : (
              <div className="spending-list">
                {monthlyData.map(({ month, total }) => (
                  <div key={month} className="spending-row">
                    <span className="spending-month">{month}</span>
                    <div className="spending-bar-wrap">
                      <div
                        className="spending-bar"
                        style={{
                          width: `${(total / Math.max(...monthlyData.map((m) => m.total))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="spending-amount">
                      GH₵ {total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default Activity;
