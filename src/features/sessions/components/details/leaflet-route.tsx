'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletRouteProps {
  coordinates: [number, number][];
  height?: string;
  interactive?: boolean;
}

export function LeafletRoute({ 
  coordinates, 
  height = '288px',
  interactive = true,
}: LeafletRouteProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || coordinates.length === 0) return;
    if (map.current) return;

    map.current = L.map(mapContainer.current, {
      zoomControl: interactive,
      attributionControl: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map.current);

    const bounds = L.latLngBounds(coordinates.map(([lat, lng]) => [lat, lng]));
    map.current.fitBounds(bounds, { padding: [40, 40] });

    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim() || '220 90% 56%';
    
    const routeColor = `hsl(${primaryColor})`;

    L.polyline(coordinates, {
      color: routeColor,
      weight: 12,
      opacity: 0.2,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map.current);

    L.polyline(coordinates, {
      color: routeColor,
      weight: 6,
      opacity: 0.4,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map.current);

    L.polyline(coordinates, {
      color: routeColor,
      weight: 3,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map.current);

    const startIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width: 14px; height: 14px; background: #22c55e; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const endIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width: 14px; height: 14px; background: #ef4444; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    if (coordinates.length > 0) {
      L.marker(coordinates[0], { icon: startIcon }).addTo(map.current);
    }

    if (coordinates.length > 1) {
      L.marker(coordinates[coordinates.length - 1], { icon: endIcon }).addTo(map.current);
    }

    if (interactive && map.current.zoomControl) {
      map.current.zoomControl.setPosition('bottomright');
    }

    map.current.whenReady(() => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [coordinates, interactive]);

  if (coordinates.length === 0) {
    return null;
  }

  return (
    <div 
      ref={mapContainer} 
      className="w-full"
      style={{ 
        height,
        opacity: mapLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
      }} 
    />
  );
}
