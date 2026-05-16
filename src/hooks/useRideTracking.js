import { useEffect, useState } from "react";
import { getDistance } from "geolib";
import socket from "../socket";

function useRideTracking(rideId) {
  const [driverPosition, setDriverPosition] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [rideStatus, setRideStatus] = useState("searching");

  // Listen for driver location
  useEffect(() => {
    if (!rideId) return;

    socket.emit("rideRoom", rideId);

    socket.on("driverLocationUpdated", ({ lat, lng }) => {
      setDriverPosition([lat, lng]);
    });

    socket.on("rideAccepted", ({ driverName }) => {
      setDriverInfo({ name: driverName });
      setRideStatus("accepted");
    });

    socket.on("driverArrived", () => {
      setRideStatus("arrived");
    });

    socket.on("rideStarted", () => {
      setRideStatus("inProgress");
    });

    return () => {
      socket.off("driverLocationUpdated");
      socket.off("rideAccepted");
      socket.off("driverArrived");
      socket.off("rideStarted");
    };
  }, [rideId]);

  // Watch user GPS
  useEffect(() => {
    const watcher = navigator.geolocation.watchPosition(({ coords }) => {
      setUserPosition([coords.latitude, coords.longitude]);
    });
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // Recalculate distance and ETA when positions change
  useEffect(() => {
    if (!userPosition || !driverPosition) return;

    const meters = getDistance(
      { latitude: driverPosition[0], longitude: driverPosition[1] },
      { latitude: userPosition[0], longitude: userPosition[1] },
    );

    const km = meters / 1000;
    setDistance(km.toFixed(2));
    setEta(Math.round((km / 30) * 60));
  }, [driverPosition, userPosition]);

  return {
    driverPosition,
    userPosition,
    eta,
    distance,
    driverInfo,
    rideStatus,
    setRideStatus,
  };
}

export default useRideTracking;
