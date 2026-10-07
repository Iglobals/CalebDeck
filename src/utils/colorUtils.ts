// A curated list of common fashion colors to map hex values to names.
const COLOR_MAP: Record<string, string> = {
  '#000000': 'Black',
  '#0f0f0f': 'Black',
  '#111111': 'Black',
  '#ffffff': 'White',
  '#f5f5f5': 'Off White',
  '#ff0000': 'Red',
  '#722f37': 'Wine',
  '#800000': 'Maroon',
  '#0000ff': 'Blue',
  '#000080': 'Navy Blue',
  '#87ceeb': 'Sky Blue',
  '#008000': 'Green',
  '#556b2f': 'Olive Green',
  '#ffff00': 'Yellow',
  '#ffa500': 'Orange',
  '#800080': 'Purple',
  '#e6e6fa': 'Lavender',
  '#ffc0cb': 'Pink',
  '#ffb6c1': 'Light Pink',
  '#a52a2a': 'Brown',
  '#d2b48c': 'Tan / Khaki',
  '#808080': 'Grey',
  '#c0c0c0': 'Silver',
  '#ffd700': 'Gold',
};

/**
 * Calculates color distance to find the closest match.
 */
const hexToRgb = (hex: string) => {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const colorDistance = (color1: {r: number, g: number, b: number}, color2: {r: number, g: number, b: number}) => {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
    Math.pow(color1.g - color2.g, 2) +
    Math.pow(color1.b - color2.b, 2)
  );
};

export const getHumanReadableColor = (colorValue: string): string => {
  if (!colorValue) return '';
  
  // If it's already a plain name (doesn't start with #)
  if (!colorValue.startsWith('#')) return colorValue;

  const lowerHex = colorValue.toLowerCase();
  
  // Direct match
  if (COLOR_MAP[lowerHex]) return COLOR_MAP[lowerHex];

  // Nearest match
  const targetRgb = hexToRgb(lowerHex);
  if (!targetRgb) return colorValue;

  let closestName = colorValue;
  let minDistance = Infinity;

  for (const [hex, name] of Object.entries(COLOR_MAP)) {
    const rgb = hexToRgb(hex);
    if (rgb) {
      const dist = colorDistance(targetRgb, rgb);
      if (dist < minDistance) {
        minDistance = dist;
        closestName = name;
      }
    }
  }

  // If the closest match is reasonably close, return the name
  if (minDistance < 60) {
    return closestName;
  }

  return colorValue; // fallback to hex if we have no idea
};
