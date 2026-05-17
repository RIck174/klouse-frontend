import { useState, useEffect } from "react";
import Sidebar from "../Components/Sidebar";
import "boxicons/css/boxicons.min.css";
import "../Css/Earningspage.css";

const API = import.meta.env.VITE_API_URL;

function EarningsPage() {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/ride/earnings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setEarnings(data);
      } catch (err) {
        console.error("Failed to fetch earnings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredRides = earnings?.rides?.filter((ride) => {
    const date = new Date(ride.createdAt);
    const now = new Date();
    if (activeFilter === "today") {
      return date.toDateString() === now.toDateString();
    }
    if (activeFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="earnings-page">
        <div className="earnings-loading">
          <div className="searching-spinner" />
          <p>Loading earnings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="earnings-page">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Top bar */}
      <div className="earnings-topbar">
        <button
          className="earnings-menu-btn"
          onClick={() => setSidebarOpen(true)}
        >
          <i className="bx bx-menu" />
        </button>
        <h1 className="earnings-title">Earnings</h1>
      </div>

      <div className="earnings-content">
        {/* Stats Cards */}
        <div className="earnings-stats">
          <div className="earnings-stat-card earnings-stat-primary">
            <div className="earnings-stat-icon">
              <i className="bx bxs-wallet" />
            </div>
            <div className="earnings-stat-info">
              <span className="earnings-stat-label">Total Earnings</span>
              <span className="earnings-stat-value">
                GH₵ {(earnings?.totalEarnings || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="earnings-stats-row">
            <div className="earnings-stat-card">
              <span className="earnings-stat-label">Today</span>
              <span className="earnings-stat-value-sm">
                GH₵ {(earnings?.todayEarnings || 0).toFixed(2)}
              </span>
            </div>
            <div className="earnings-stat-card">
              <span className="earnings-stat-label">This Week</span>
              <span className="earnings-stat-value-sm">
                GH₵ {(earnings?.weekEarnings || 0).toFixed(2)}
              </span>
            </div>
            <div className="earnings-stat-card">
              <span className="earnings-stat-label">Avg Fare</span>
              <span className="earnings-stat-value-sm">
                GH₵ {(earnings?.avgFare || 0).toFixed(2)}
              </span>
            </div>
            <div className="earnings-stat-card">
              <span className="earnings-stat-label">Total Rides</span>
              <span className="earnings-stat-value-sm">
                {earnings?.totalRides || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="earnings-filters">
          {["all", "today", "week"].map((filter) => (
            <button
              key={filter}
              className={`earnings-filter-tab ${activeFilter === filter ? "earnings-filter-active" : ""}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter === "all"
                ? "All Time"
                : filter === "today"
                  ? "Today"
                  : "This Week"}
            </button>
          ))}
        </div>

        {/* Rides List */}
        <div className="earnings-list-header">
          <span>Ride History</span>
          <span>{filteredRides?.length || 0} rides</span>
        </div>

        {filteredRides?.length === 0 ? (
          <div className="earnings-empty">
            <i className="bx bxs-car" />
            <p>No rides for this period</p>
          </div>
        ) : (
          <div className="earnings-list">
            {filteredRides?.map((ride) => (
              <div key={ride._id} className="earnings-ride-card">
                <div className="earnings-ride-icon">
                  <i className="bx bxs-car" />
                </div>
                <div className="earnings-ride-info">
                  <span className="earnings-ride-destination">
                    {ride.destinationName || "Unknown destination"}
                  </span>
                  <span className="earnings-ride-date">
                    {formatDate(ride.createdAt)}
                  </span>
                </div>
                <span className="earnings-ride-fare">
                  + GH₵ {(ride.fare || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EarningsPage;
