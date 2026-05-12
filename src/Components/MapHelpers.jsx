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

export function ShowRoute({ pickup, destination }) {
  const map = useMap();
  const [route, setRoute] = useState(null);
  const hasFit = useRef(false);

  useEffect(() => {
    hasFit.current = false; // reset if pickup/destination changes
  }, [pickup, destination]);

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

        // Only fit bounds once per new route
        if (!hasFit.current) {
          map.fitBounds(coords, { padding: [30, 30] });
          hasFit.current = true;
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
