import { useEffect, useState } from "react";
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

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const token = localStorage.getItem("token"); // get token here
        const res = await fetch("http://localhost:5000/ride/route", {
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
        map.fitBounds(coords, { padding: [30, 30] });
      } catch (err) {
        console.error("Route fetch failed", err);
      }
    };
    fetchRoute();
  }, [[pickup, destination]]);

  if (!route) return null;

  return (
    <Polyline positions={route} color="#1a1a2e" weight={6} opacity={0.8} />
  );
}
