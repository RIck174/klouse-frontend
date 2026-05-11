import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Registration from "./Pages/Registration";
import Homepage from "./Pages/Homepage";
import Payment from "./Pages/Paymentpage";
import Activity from "./Pages/Activitypage";
import Settings from "./Pages/Settingspage";
import Rides from "./Pages/Rides";
import DriverPage from "./Pages/Driverpage";
import DriverSignup from "./Pages/DriverSignup";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

const PRoutes = ({ children }) => {
  const token = localStorage.getItem("token");

  const [valid, setValid] = useState(null);
  // null = still checking
  // true = valid token
  // false = invalid token

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setValid(false);
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/auth/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setValid(false);
        } else {
          setValid(true);
        }
      } catch (err) {
        console.log("Token verification error");
        setValid(false);
      }
    };

    verifyToken();
  }, [token]);

  // Token invalid
  if (valid === false) return <Navigate to="/" />;

  // Token valid
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/home"
          element={
            <PRoutes>
              <Homepage />
            </PRoutes>
          }
        />
        <Route path="/" element={<Registration />} />
        <Route
          path="/rides/:id"
          element={
            <PRoutes>
              <Rides />
            </PRoutes>
          }
        />
        <Route
          path="/rides"
          element={
            <PRoutes>
              <Rides />
            </PRoutes>
          }
        />
        <Route
          path="/payment"
          element={
            <PRoutes>
              <Payment />
            </PRoutes>
          }
        />
        <Route
          path="/activity"
          element={
            <PRoutes>
              <Activity />
            </PRoutes>
          }
        />
        <Route
          path="/settings"
          element={
            <PRoutes>
              <Settings />
            </PRoutes>
          }
        />
        <Route
          path="/driver"
          element={
            <PRoutes>
              <DriverPage />
            </PRoutes>
          }
        />
        <Route
          path="/driver-signup"
          element={
            <PRoutes>
              <DriverSignup />
            </PRoutes>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
