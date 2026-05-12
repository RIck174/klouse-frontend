import { useEffect, useState, useRef } from "react";
import { useMap, Polyline } from "react-leaflet";

export function FitBounds({ pickup, destination }) {
  const map = useMap();
  useEffect(() => {
    if (pickup && destination) {
      map.fitBounds([pickup, destination], { padding: [30, 30] });
    }
  }, [map, pickup, destination]);
  return null;
}

// This lives OUTSIDE the component — survives re-renders
const fittedRoutes = new Set();

export function ShowRoute({ pickup, destination }) {
  const map = useMap();
  const [route, setRoute] = useState(null);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_API_URL}/ride/route`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pickup: [pickup[1], pickup[0]],
            destination: [destination[1], destination[0]],
          }),
        });
        const data = await res.json();
        const coords = data.features[0].geometry.coordinates.map(
          ([lng, lat]) => [lat, lng],
        );
        setRoute(coords);

        // Create a unique key for this pickup+destination pair
        const routeKey = `${pickup[0]},${pickup[1]}-${destination[0]},${destination[1]}`;

        // Only fitBounds if we haven't done it for this exact route before
        if (!fittedRoutes.has(routeKey)) {
          map.fitBounds(coords, { padding: [30, 30] });
          fittedRoutes.add(routeKey);
        }
      } catch (err) {
        console.error("Route fetch failed", err);
      }
    };
    fetchRoute();
  }, [map, pickup, destination]);

  if (!route) return null;

  return (
    <Polyline positions={route} color="#1a56db" weight={5} opacity={0.85} />
  );
}
