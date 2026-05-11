import { useLocation } from "react-router-dom";
import "../Css/Homepage.css";
import { useState, useEffect } from "react";
import Navigation from "../Components/Navigation";
import Ridepage from "./Ridepage";

function Homepage() {
  const [showRideSheet, setShowRideSheet] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openSheet) {
      setShowRideSheet(true);
    }
  }, [location.state]);

  return (
    <div className="homepage-container">
      <Navigation />

      <Ridepage
        showRideSheet={showRideSheet}
        setShowRideSheet={setShowRideSheet}
      />
    </div>
  );
}
export default Homepage;
