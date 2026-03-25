import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const GEOAPIFY_KEY = process.env.REACT_APP_GEOAPIFY_KEY || "02cb3a68d60c4ca49d7dde0c4d7811bf";
const MAP_STYLE = `https://maps.geoapify.com/v1/styles/osm-carto/style.json?apiKey=${GEOAPIFY_KEY}`;

const US_CENTER = [-95.7129, 37.0902];

// Haversine distance in miles
function haversine(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export { haversine };

export default function MapComponent({
  jobs = [],
  crew = [],
  userLocation,
  onJobClick,
  height = "500px",
  distanceFilter = null,
  flyToCoords = null,
  showOnlyContractorJobs = false,
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const prevFlyTo = useRef(null);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: userLocation ? [userLocation.lng, userLocation.lat] : US_CENTER,
      zoom: userLocation ? 11 : 4,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("load", () => {
      setMapReady(true);
    });
    mapRef.current = map;
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FlyTo on coords change
  useEffect(() => {
    if (!mapRef.current || !flyToCoords) return;
    const key = `${flyToCoords[0]},${flyToCoords[1]}`;
    if (prevFlyTo.current === key) return;
    prevFlyTo.current = key;
    mapRef.current.flyTo({ center: flyToCoords, zoom: 10, speed: 1.4 });
  }, [flyToCoords]);

  // Fly to user location when it becomes available
  useEffect(() => {
    if (!mapRef.current || !userLocation || !mapReady) return;
    mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 11, speed: 1.2 });
  }, [userLocation, mapReady]);

  // Render markers
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";

    // User location marker (green pulse)
    if (userLocation) {
      const el = document.createElement("div");
      el.style.cssText = "width:18px;height:18px;background:#10B981;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(16,185,129,0.3)";
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML("<strong style='color:#10B981'>Your Location</strong>"))
        .addTo(mapRef.current);
      markersRef.current.push(m);
    }

    // Job markers
    const filteredJobs = jobs.filter((job) => {
      if (!job.location?.lat || !job.location?.lng) return false;
      if (distanceFilter && userLocation) {
        const dist = haversine(userLocation.lat, userLocation.lng, job.location.lat, job.location.lng);
        return dist <= distanceFilter;
      }
      return true;
    });

    filteredJobs.forEach((job) => {
      // Color: red=emergency, yellow=featured, green=available
      const color = job.is_emergency ? "#EF4444" : job.is_featured ? "#F59E0B" : "#10B981";
      const size = job.is_emergency ? 36 : job.is_featured ? 32 : 28;
      const el = document.createElement("div");
      el.style.cssText = `width:${size}px;height:${size}px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer`;
      if (onJobClick) el.addEventListener("click", () => onJobClick(job));

      const photoHtml = job.contractor_photo
        ? `<img src="${backendUrl}${job.contractor_photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid #0000FF" />`
        : `<div style="width:32px;height:32px;border-radius:50%;background:#050A30;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px">${(job.contractor_name || "?")[0]}</div>`;

      const popup = new maplibregl.Popup({ offset: 20 }).setHTML(`
        <div style="font-family:Inter,sans-serif;min-width:200px;padding:4px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            ${photoHtml}
            <div>
              <strong style="font-size:13px">${job.title}</strong>
              <p style="font-size:11px;color:#666;margin:2px 0">${job.contractor_name || ""}</p>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px">
            <span style="color:#0000FF;font-weight:bold">$${job.pay_rate}/hr</span>
            <span style="color:#666">${job.trade || ""}</span>
          </div>
          <p style="font-size:11px;color:#888;margin:4px 0">${job.crew_accepted?.length || 0}/${job.crew_needed} crew</p>
          ${job.is_emergency ? '<span style="background:#FEE2E2;color:#DC2626;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:bold">EMERGENCY</span>' : ""}
          ${job.is_featured ? '<span style="background:#FEF3C7;color:#D97706;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:bold">FEATURED</span>' : ""}
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([job.location.lng, job.location.lat])
        .setPopup(popup)
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    });

    // Crew markers
    crew.forEach((member) => {
      if (!member.location?.lat || !member.location?.lng) return;
      const el = document.createElement("div");
      const photoUrl = member.profile_photo ? `${backendUrl}${member.profile_photo}` : null;
      if (photoUrl) {
        el.style.cssText = "width:32px;height:32px;border-radius:50%;border:3px solid #7EC8E3;overflow:hidden;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3)";
        const img = document.createElement("img");
        img.src = photoUrl;
        img.style.cssText = "width:100%;height:100%;object-fit:cover";
        el.appendChild(img);
      } else {
        el.style.cssText = "width:28px;height:28px;background:#050A30;border-radius:50%;border:3px solid #7EC8E3;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3)";
        el.textContent = (member.name || "?")[0].toUpperCase();
      }
      const popup = new maplibregl.Popup({ offset: 16 }).setHTML(`
        <div style="font-family:Inter,sans-serif">
          <strong style="font-size:13px">${member.name}</strong>
          <p style="font-size:11px;color:#666;margin:3px 0;text-transform:capitalize">${member.trade || "General Labor"}</p>
          <p style="font-size:11px">Rating: ${member.rating?.toFixed(1) || "New"} ⭐</p>
          <p style="font-size:11px;color:${member.availability ? "#10B981" : "#EF4444"}">${member.availability ? "Available" : "Not Available"}</p>
        </div>
      `);
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([member.location.lng, member.location.lat])
        .setPopup(popup)
        .addTo(mapRef.current);
      markersRef.current.push(m);
    });
  }, [jobs, crew, userLocation, mapReady, distanceFilter, onJobClick]);

  return (
    <div style={{ height, width: "100%", position: "relative" }} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
      <div ref={mapContainer} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
