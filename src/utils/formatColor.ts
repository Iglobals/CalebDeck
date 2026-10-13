export function getHexColorName(hex: string): string {
  if (!hex) return '';

  const input = hex.trim();
  if (!input) return '';

  const lower = input.toLowerCase();
  const normalized = lower.startsWith('#') ? lower : `#${lower}`;

  const exact: Record<string, string> = {
    '#000000': 'Black', '#111111': 'Black', '#0f0f0f': 'Black',
    '#ffffff': 'White', '#f5f5f5': 'Off White', '#f8fafc': 'White',
    '#ff0000': 'Red', '#ff2d2d': 'Red', '#dc2626': 'Red', '#b91c1c': 'Deep Red',
    '#800000': 'Maroon', '#722f37': 'Wine', '#8b0000': 'Dark Red',
    '#0000ff': 'Blue', '#1d4ed8': 'Royal Blue', '#2563eb': 'Blue', '#000080': 'Navy Blue',
    '#87ceeb': 'Sky Blue', '#60a5fa': 'Blue',
    '#008000': 'Green', '#166534': 'Green', '#10b981': 'Emerald', '#556b2f': 'Olive Green',
    '#ffff00': 'Yellow', '#facc15': 'Yellow', '#f59e0b': 'Amber', '#ff9900': 'Orange', '#ffa500': 'Orange',
    '#800080': 'Purple', '#7c3aed': 'Violet', '#a855f7': 'Purple', '#e6e6fa': 'Lavender',
    '#ffc0cb': 'Pink', '#ffb6c1': 'Pink', '#ec4899': 'Pink',
    '#a52a2a': 'Brown', '#8b5a2b': 'Brown', '#5a2a2a': 'Dark Brown', '#d2b48c': 'Tan',
    '#808080': 'Grey', '#c0c0c0': 'Silver', '#d1d5db': 'Silver', '#ffd700': 'Gold',
    '#f97316': 'Orange', '#fbbf24': 'Gold', '#f4d35e': 'Gold'
  };

  if (exact[normalized]) return exact[normalized];
  if (input.toLowerCase() === 'red') return 'Red';
  if (input.toLowerCase() === 'brown') return 'Brown';
  if (input.toLowerCase() === 'black') return 'Black';
  if (input.toLowerCase() === 'white') return 'White';

  const hexToRgb = (h: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const expanded = h.replace(shorthandRegex, (_, r, g, b) => `${r}${r}${g}${g}${b}${b}`);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expanded);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const targetRgb = hexToRgb(normalized);
  if (!targetRgb) return input;

  const r = targetRgb.r;
  const g = targetRgb.g;
  const b = targetRgb.b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const brightness = (max + min) / 2;
  const saturation = max === 0 ? 0 : (delta / max) * 100;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  if (hue <= 12 || hue >= 348) {
    if (brightness < 80 && saturation < 55) return 'Dark Red';
    return 'Red';
  }

  if (hue >= 20 && hue <= 45) {
    if (brightness < 80 && saturation < 52) return 'Brown';
    return 'Orange';
  }

  if (hue > 45 && hue <= 70) return 'Yellow';
  if (hue > 70 && hue <= 170) return 'Green';
  if (hue > 170 && hue <= 220) return 'Blue';
  if (hue > 220 && hue <= 290) return 'Purple';
  if (hue > 290 && hue <= 348) return 'Pink';

  const palette = Object.entries(exact).map(([key, label]) => ({ label, rgb: hexToRgb(key)! }));
  let closestName = input;
  let minDistance = Infinity;

  for (const entry of palette) {
    const dist = Math.sqrt(
      Math.pow(targetRgb.r - entry.rgb.r, 2) +
      Math.pow(targetRgb.g - entry.rgb.g, 2) +
      Math.pow(targetRgb.b - entry.rgb.b, 2)
    );
    if (dist < minDistance) {
      minDistance = dist;
      closestName = entry.label;
    }
  }

  return minDistance < 140 ? closestName : input;
}
