export function getHexColorName(hex: string): string {
  if (!hex) return '';
  if (!hex.startsWith('#')) return hex;
  
  const colors: Record<string, string> = {
    '#000000': 'Black', '#0f0f0f': 'Black', '#111111': 'Black',
    '#ffffff': 'White', '#f5f5f5': 'Off White',
    '#ff0000': 'Red', '#722f37': 'Wine', '#800000': 'Maroon',
    '#0000ff': 'Blue', '#000080': 'Navy Blue', '#87ceeb': 'Sky Blue',
    '#008000': 'Green', '#556b2f': 'Olive Green', '#10b981': 'Emerald',
    '#ffff00': 'Yellow', '#f59e0b': 'Amber', '#ffa500': 'Orange',
    '#800080': 'Purple', '#e6e6fa': 'Lavender', '#7c3aed': 'Violet',
    '#ffc0cb': 'Pink', '#ffb6c1': 'Light Pink',
    '#a52a2a': 'Brown', '#5a2a2a': 'Dark Brown', '#d2b48c': 'Tan / Khaki',
    '#808080': 'Grey', '#c0c0c0': 'Silver', '#ffd700': 'Gold',
  };

  const normalized = hex.toLowerCase();
  if (colors[normalized]) return colors[normalized];

  const hexToRgb = (h: string) => {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    h = h.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  };

  const targetRgb = hexToRgb(normalized);
  if (!targetRgb) return hex;

  let closestName = hex;
  let minDistance = Infinity;

  for (const [cHex, cName] of Object.entries(colors)) {
    const rgb = hexToRgb(cHex);
    if (rgb) {
      const dist = Math.sqrt(
        Math.pow(targetRgb.r - rgb.r, 2) + Math.pow(targetRgb.g - rgb.g, 2) + Math.pow(targetRgb.b - rgb.b, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestName = cName;
      }
    }
  }

  // If reasonably close, return it, else original hex
  return minDistance < 60 ? closestName : hex;
}
