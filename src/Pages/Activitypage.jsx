import { useState, useEffect } from "react";
import Sidebar from "../Components/Sidebar";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const FILTERS = ["All", "Completed", "Cancelled"];

  // Fetch all rides
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

  // Filter rides
  const filteredRides = rides
    .filter((ride) => activeFilter === "All" || ride.status === activeFilter)
    .filter((ride) =>
      ride.destinationName?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  const completedRides = rides.filter((r) => r.status === "Completed");
  const cancelledRides = rides.filter((r) => r.status === "Cancelled");
  const totalSpent = completedRides.reduce((sum, r) => sum + (r.fare || 0), 0);
  const lastRide = rides[0];

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
    const month = new Date(ride.createdAt).toLocaleDateString("en-GH", {
      month: "short",
      year: "numeric",
    });
    acc[month] = (acc[month] || 0) + (ride.fare || 0);
    return acc;
  }, {});

  const monthlyData = Object.entries(monthlySpending)
    .map(([month, total]) => ({ month, total }))
    .slice(0, 4);

  // Loading state
  if (loading) {
    return (
      <div className="activity-page">
        <div className="activity-loading">
          <div className="searching-spinner" />
          <p>Loading activity...</p>
        </div>
      </div>
    );
  }

  // Last ride map coords
  const lastPickup = lastRide
    ? [lastRide.pickup.coordinates[1], lastRide.pickup.coordinates[0]]
    : null;
  const lastDest = lastRide
    ? [lastRide.destination.coordinates[1], lastRide.destination.coordinates[0]]
    : null;

  return (
    <div className="activity-page">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="activity-content">
        {/* ── LEFT COLUMN ── */}
        <div className="activity-left">
          {/* Top row — hamburger + title */}
          <div className="activity-top-row">
            <button
              className="float-btn"
              onClick={() => setSidebarOpen(true)}
              style={{ width: 40, height: 40, fontSize: 22, flexShrink: 0 }}
            >
              <i className="bx bx-menu" />
            </button>
            <h2 className="activity-title">Activity</h2>
          </div>

          {/* Stats row — always visible on mobile */}
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-card-value">{rides.length}</span>
              <span className="stat-card-label">Total</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-value">{completedRides.length}</span>
              <span className="stat-card-label">Done</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-value">{cancelledRides.length}</span>
              <span className="stat-card-label">Cancelled</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-value">₵{totalSpent.toFixed(0)}</span>
              <span className="stat-card-label">Spent</span>
            </div>
          </div>

          {/* Last Journey Card — mobile only */}
          {lastRide && lastPickup && lastDest && (
            <div className="last-journey-card mobile-only">
              <div className="last-journey-header">
                <span className="last-journey-label">Last Journey</span>
                <span className="last-journey-fare">
                  {lastRide.status === "Cancelled"
                    ? "Cancelled"
                    : `GH₵ ${(lastRide.fare || 0).toFixed(2)}`}
                </span>
              </div>
              <div className="last-journey-destination">
                <i className="bx bxs-map" />
                {lastRide.destinationName || "Unknown destination"}
              </div>
              <div className="last-journey-map">
                <div className="last-journey-map-inner">
                  <MapContainer
                    center={lastPickup}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                    zoomControl={false}
                    dragging={false}
                    scrollWheelZoom={false}
                    attributionControl={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      tileSize={512}
                      zoomOffset={-1}
                      detectRetina={true}
                    />
                    <ShowRoute pickup={lastPickup} destination={lastDest} />
                    <Marker position={lastPickup}>
                      <Popup>Pickup</Popup>
                    </Marker>
                    <Marker position={lastDest}>
                      <Popup>Destination</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
              <div className="last-journey-footer">
                <span className="last-journey-date">
                  <i className="bx bx-calendar" />
                  {formatDate(lastRide.createdAt)}
                </span>
                <span
                  className={`last-journey-status ${
                    lastRide.status === "Completed"
                      ? "status-completed"
                      : "status-cancelled"
                  }`}
                >
                  {lastRide.status}
                </span>
              </div>
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            placeholder="Search destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="activity-search"
          />

          {/* Filter tabs */}
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

          {/* Rides list */}
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
                  <div className="activity-details">
                    <span>{ride.destinationName || "Unknown destination"}</span>
                    <span>{formatDate(ride.createdAt)}</span>
                  </div>
                  <div className="activity-right">
                    <span className="activity-fare">
                      {ride.status === "Cancelled"
                        ? "—"
                        : `GH₵ ${(ride.fare || 0).toFixed(2)}`}
                    </span>
                    <span
                      className={`activity-badge ${
                        ride.status === "Completed"
                          ? "badge-completed"
                          : "badge-cancelled"
                      }`}
                    >
                      {ride.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Monthly spending — mobile only */}
          {monthlyData.length > 0 && (
            <div className="spending-card mobile-only">
              <p className="spending-title">Monthly Spending</p>
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
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL — desktop only ── */}
        <div className="activity-right-panel">
          {/* Stats */}
          <div className="right-card">
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
                <span className="stat-value">{cancelledRides.length}</span>
                <span className="stat-label">Cancelled</span>
              </div>
            </div>
          </div>

          {/* Last ride map */}
          {lastRide && lastPickup && lastDest && (
            <div className="right-card map-card">
              <h3 className="right-card-title">Last Ride</h3>
              <div className="map-card-info">
                <span className="map-destination">
                  <i className="bx bxs-map" />
                  {lastRide.destinationName || "Unknown"}
                </span>
                <span className="map-fare">
                  GH₵ {(lastRide.fare || 0).toFixed(2)}
                </span>
              </div>
              <div className="map-card-container">
                <MapContainer
                  center={lastPickup}
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
                  <ShowRoute pickup={lastPickup} destination={lastDest} />
                  <Marker position={lastPickup}>
                    <Popup>Pickup</Popup>
                  </Marker>
                  <Marker position={lastDest}>
                    <Popup>Destination</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}

          {/* Monthly spending */}
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
