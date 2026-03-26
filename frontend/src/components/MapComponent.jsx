import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Navigation } from "lucide-react";

// Free OSM raster tiles — no API key required
const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap</a> contributors",
    },
  },
  layers: [{ id: "osm-tiles", type: "raster", source: "osm", minzoom: 0, maxzoom: 19 }],
};

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

// Safe image HTML with fallback initials
function safePhotoHtml(photoUrl, name, size = 32) {
  const initial = (name || "?")[0].toUpperCase();
  if (photoUrl) {
    return `<img src="${photoUrl}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid #0000FF"
      onerror="this.style.display='none';this.nextSibling.style.display='flex'" />
      <div style="display:none;width:${size}px;height:${size}px;border-radius:50%;background:#050A30;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${Math.round(size*0.4)}px">${initial}</div>`;
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#050A30;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${Math.round(size*0.4)}px">${initial}</div>`;
}

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

  // Center map on user location
  const centerOnUser = useCallback(() => {
    if (!mapRef.current) return;
    if (userLocation) {
      mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 12, speed: 1.5 });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 12, speed: 1.5 }),
        () => {}
      );
    }
  }, [userLocation]);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: OSM_STYLE,
      center: userLocation ? [userLocation.lng, userLocation.lat] : US_CENTER,
      zoom: userLocation ? 11 : 4,
      attributionControl: true,
    });

    // Navigation controls (zoom in/out + compass)
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), "top-right");

    // Geolocate control
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showAccuracyCircle: false,
    }), "top-right");

    map.on("load", () => setMapReady(true));
    map.on("error", (e) => {
      // suppress tile errors (OSM throttle)
      if (e?.error?.status === 429) return;
    });

    mapRef.current = map;
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; setMapReady(false); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FlyTo on coords change
  useEffect(() => {
    if (!mapRef.current || !flyToCoords) return;
    const key = `${flyToCoords[0]},${flyToCoords[1]}`;
    if (prevFlyTo.current === key) return;
    prevFlyTo.current = key;
    mapRef.current.flyTo({ center: flyToCoords, zoom: 13, speed: 1.4 });
  }, [flyToCoords]);

  // Fly to user location when it becomes available
  useEffect(() => {
    if (!mapRef.current || !userLocation || !mapReady) return;
    mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 11, speed: 1.2 });
  }, [userLocation, mapReady]);

  // Render markers
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";

    // User location marker (green pulse)
    if (userLocation) {
      const el = document.createElement("div");
      el.title = "Your Location";
      el.style.cssText = "width:18px;height:18px;background:#10B981;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(16,185,129,0.25);cursor:default";
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
          "<div style='font-family:Inter,sans-serif;font-size:12px;font-weight:bold;color:#10B981;padding:2px 4px'>Your Location</div>"
        ))
        .addTo(mapRef.current);
      markersRef.current.push(m);
    }

    // Job markers
    const filteredJobs = jobs.filter((job) => {
      if (!job.location?.lat || !job.location?.lng) return false;
      if (distanceFilter && userLocation) {
        return haversine(userLocation.lat, userLocation.lng, job.location.lat, job.location.lng) <= distanceFilter;
      }
      return true;
    });

    filteredJobs.forEach((job) => {
      const color = job.is_emergency ? "#EF4444" : job.is_featured ? "#F59E0B" : "#10B981";
      const size = job.is_emergency ? 36 : job.is_featured ? 32 : 28;
      const el = document.createElement("div");
      el.style.cssText = `width:${size}px;height:${size}px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);cursor:pointer;transition:transform 0.15s`;
      el.addEventListener("mouseenter", () => { el.style.transform = "rotate(-45deg) scale(1.2)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = "rotate(-45deg) scale(1)"; });
      if (onJobClick) el.addEventListener("click", () => onJobClick(job));

      const photoHtml = safePhotoHtml(job.contractor_photo ? `${backendUrl}${job.contractor_photo}` : null, job.contractor_name, 36);

      const popup = new maplibregl.Popup({ offset: 24, maxWidth: "240px" }).setHTML(`
        <div style="font-family:Inter,sans-serif;padding:6px 2px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            ${photoHtml}
            <div>
              <strong style="font-size:13px;color:#050A30">${job.title}</strong>
              <p style="font-size:11px;color:#666;margin:2px 0">${job.contractor_name || ""}</p>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;margin-bottom:6px">
            <span style="color:#0000FF;font-weight:bold">$${job.pay_rate}/hr</span>
            <span style="color:#555;text-align:right;text-transform:capitalize">${job.trade || ""}</span>
          </div>
          <p style="font-size:11px;color:#888;margin:0">${job.crew_accepted?.length || 0}/${job.crew_needed} crew filled</p>
          ${job.location?.city ? `<p style="font-size:11px;color:#888;margin:2px 0">📍 ${job.location.city}</p>` : ""}
          <div style="margin-top:5px;display:flex;gap:4px;flex-wrap:wrap">
            ${job.is_emergency ? '<span style="background:#FEE2E2;color:#DC2626;font-size:10px;padding:2px 7px;border-radius:10px;font-weight:bold">EMERGENCY</span>' : ""}
            ${job.is_featured ? '<span style="background:#FEF3C7;color:#D97706;font-size:10px;padding:2px 7px;border-radius:10px;font-weight:bold">FEATURED</span>' : ""}
          </div>
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
        el.style.cssText = "width:36px;height:36px;border-radius:50%;border:3px solid #7EC8E3;overflow:hidden;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);background:#050A30";
        const img = document.createElement("img");
        img.src = photoUrl;
        img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block";
        img.onerror = () => {
          el.style.cssText = "width:36px;height:36px;background:#050A30;border-radius:50%;border:3px solid #7EC8E3;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3)";
          el.textContent = (member.name || "?")[0].toUpperCase();
        };
        el.appendChild(img);
      } else {
        el.style.cssText = "width:32px;height:32px;background:#050A30;border-radius:50%;border:3px solid #7EC8E3;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3)";
        el.textContent = (member.name || "?")[0].toUpperCase();
      }

      const popup = new maplibregl.Popup({ offset: 18, closeButton: false, maxWidth: "200px" }).setHTML(`
        <div style="font-family:Inter,sans-serif;padding:4px 2px">
          <strong style="font-size:13px;color:#050A30">${member.name}</strong>
          <p style="font-size:11px;color:#0000FF;margin:3px 0;text-transform:capitalize;font-weight:600">${member.trade || "General Labor"}</p>
          <p style="font-size:11px;margin:2px 0">⭐ ${member.rating?.toFixed(1) || "New"} · ${member.jobs_completed || 0} jobs</p>
          ${member.location?.city ? `<p style="font-size:11px;color:#888;margin:2px 0">📍 ${member.location.city}, ${member.location.state || ""}</p>` : ""}
          <p style="font-size:11px;font-weight:bold;color:${member.availability ? "#10B981" : "#EF4444"};margin-top:4px">
            ${member.availability ? "✓ Available" : "✗ Unavailable"}
          </p>
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
    <div style={{ height, width: "100%", position: "relative" }}
      className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
      <div ref={mapContainer} style={{ height: "100%", width: "100%" }} />

      {/* Center map button */}
      {mapReady && (
        <button
          onClick={centerOnUser}
          title="Center on my location"
          data-testid="center-map-btn"
          className="absolute bottom-4 left-4 z-10 bg-white dark:bg-slate-800 shadow-lg rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-bold text-[#050A30] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors"
          style={{ pointerEvents: "all" }}>
          <Navigation className="w-4 h-4 text-[#0000FF]" />
          Center Map
        </button>
      )}
    </div>
  );
}
