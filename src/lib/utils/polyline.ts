/**
 * Decodes an encoded polyline string into an array of [latitude, longitude] tuples.
 * This is based on Google's Encoded Polyline Algorithm Format.
 */
export function decodePolyline(encoded: string): [number, number][] {
  const poly: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }

  return poly;
}

/**
 * Converts a set of coordinates into an SVG path string optimized for a given width/height.
 * Returns the path string and the viewBox.
 */
export function coordinatesToSVG(
  coordinates: [number, number][],
  width: number,
  height: number,
  padding = 20
) {
  if (coordinates.length === 0) return { path: '', viewBox: '0 0 0 0' };

  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;

  for (const [lat, lng] of coordinates) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;

  const scaleX = (width - padding * 2) / lngRange;
  const scaleY = (height - padding * 2) / latRange;
  const scale = Math.min(scaleX, scaleY);

  const points = coordinates.map(([lat, lng]) => {
    const x = (lng - minLng) * scale + padding + (width - padding * 2 - lngRange * scale) / 2;
    const y = (maxLat - lat) * scale + padding + (height - padding * 2 - latRange * scale) / 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return { path: `M ${points.join(' L ')}`, viewBox: `0 0 ${width} ${height}` };
}
