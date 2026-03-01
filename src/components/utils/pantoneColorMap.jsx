// Basic Pantone color mapping for common hex colors
const PANTONE_MAP = {
  '#FF0000': 'Pantone 186 C',
  '#FF3333': 'Pantone 017 C',
  '#FF6666': 'Pantone 16-1546 C',
  '#FF9999': 'Pantone 16-1520 C',
  '#FFCCCC': 'Pantone 12-0605 C',
  '#FF6B35': 'Pantone 16-1511 C',
  '#FF8855': 'Pantone 16-1524 C',
  '#FFAA88': 'Pantone 16-1520 C',
  '#FFCCBB': 'Pantone 12-0605 C',
  '#FF6600': 'Pantone 1585 C',
  '#FF8800': 'Pantone 16-1512 C',
  '#FFAA33': 'Pantone 14-1321 C',
  '#FFCC77': 'Pantone 12-0605 C',
  '#FFEE88': 'Pantone 12-0605 C',
  '#FFFF00': 'Pantone 103 C',
  '#FFFF33': 'Pantone 100 C',
  '#FFFF77': 'Pantone 99 C',
  '#FFFFAA': 'Pantone 12-0605 C',
  '#00CC00': 'Pantone 354 C',
  '#00EE00': 'Pantone 375 C',
  '#33FF33': 'Pantone 376 C',
  '#77FF77': 'Pantone 13-0520 C',
  '#00EEEE': 'Pantone 319 C',
  '#33FFFF': 'Pantone 325 C',
  '#0000FF': 'Pantone 280 C',
  '#2222FF': 'Pantone 279 C',
  '#5555FF': 'Pantone 278 C',
  '#6611FF': 'Pantone 2685 C',
  '#8844FF': 'Pantone 2618 C',
  '#BB11DD': 'Pantone 254 C',
  '#FF00CC': 'Pantone 219 C',
  '#FF55AA': 'Pantone 218 C',
  '#FF99F5': 'Pantone 236 C',
  '#000000': 'Pantone Black C',
  '#FFFFFF': 'Pantone White',
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function colorDistance(rgb1, rgb2) {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function getClosestPantone(hexColor) {
  const upperHex = hexColor.toUpperCase();
  
  // Direct match
  if (PANTONE_MAP[upperHex]) {
    return PANTONE_MAP[upperHex];
  }

  // Find closest match
  const inputRgb = hexToRgb(upperHex);
  if (!inputRgb) return hexColor;

  let closestColor = Object.keys(PANTONE_MAP)[0];
  let minDistance = Infinity;

  Object.keys(PANTONE_MAP).forEach((hex) => {
    const rgb = hexToRgb(hex);
    const distance = colorDistance(inputRgb, rgb);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = hex;
    }
  });

  return PANTONE_MAP[closestColor] || hexColor;
}