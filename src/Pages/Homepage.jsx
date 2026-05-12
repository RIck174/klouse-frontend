import { useLocation } from "react-router-dom";
import "../Css/Homepage.css";
import { useState, useEffect } from "react";
import Sidebar from "../Components/Sidebar";
import Ridepage from "./Ridepage";

function Homepage() {
  const [showRideSheet, setShowRideSheet] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openSheet) {
      setShowRideSheet(true);
    }
  }, [location.state]);

  return (
    <div className="homepage-container">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <Ridepage
        showRideSheet={showRideSheet}
        setShowRideSheet={setShowRideSheet}
        onMenuClick={() => setSidebarOpen(true)}
      />
    </div>
  );
}
export default Homepage;
