import { useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import Card from "./Card";
import { TAMIL_NADU_CENTER } from "../constants/geo";

const redPinIcon = L.divIcon({
  className: "pin-icon-wrapper",
  html: '<span class="map-pin map-pin-red"></span>',
  iconSize: [26, 36],
  iconAnchor: [13, 36],
});

function PickLocationEvents({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng);
    },
  });
  return null;
}

function LocationPickerMap({
  title,
  latitude,
  longitude,
  onPick,
  bounds,
  defaultCenter = TAMIL_NADU_CENTER,
}) {
  const selectedPosition = useMemo(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return [latitude, longitude];
  }, [latitude, longitude]);

  const mapBounds = useMemo(() => {
    if (!bounds) return null;
    return [
      [bounds.minLat, bounds.minLon],
      [bounds.maxLat, bounds.maxLon],
    ];
  }, [bounds]);

  return (
    <Card title={title}>
      <div className="h-72 w-full overflow-hidden rounded-xl border border-red-100">
        <MapContainer
          center={selectedPosition || defaultCenter}
          zoom={7}
          style={{ height: "100%", width: "100%" }}
          maxBounds={mapBounds || undefined}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <PickLocationEvents onPick={onPick} />
          {selectedPosition && <Marker position={selectedPosition} icon={redPinIcon} />}
        </MapContainer>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Click on the map to choose a location inside Tamil Nadu.
      </p>
    </Card>
  );
}

export default LocationPickerMap;
