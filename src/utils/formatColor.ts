export function getHexColorName(hex: string): string {
  if (!hex || !hex.startsWith('#')) return hex;
  
  const colors: Record<string, string> = {
    '#000000': 'Black',
    '#ffffff': 'White',
    '#ff0000': 'Red',
    '#00ff00': 'Green',
    '#0000ff': 'Blue',
    '#ffff00': 'Yellow',
    '#00ffff': 'Cyan',
    '#ff00ff': 'Magenta',
    '#c0c0c0': 'Silver',
    '#808080': 'Gray',
    '#800000': 'Maroon',
    '#808000': 'Olive',
    '#008000': 'Dark Green',
    '#800080': 'Purple',
    '#008080': 'Teal',
    '#000080': 'Navy',
    '#f59e0b': 'Amber',
    '#3b82f6': 'Blue',
    '#93c5fd': 'Light Blue',
    '#e2e8f0': 'Light Gray',
    '#1e293b': 'Slate',
    '#a7f3d0': 'Mint',
    '#10b981': 'Emerald',
    '#ddd6fe': 'Light Purple',
    '#7c3aed': 'Violet',
    '#f87171': 'Soft Red',
    '#5a2a2a': 'Dark Brown',
    '#fdba74': 'Orange'
  };

  const normalized = hex.toLowerCase();
  if (colors[normalized]) return colors[normalized];
  
  // If no exact match, just return the hex or try to approximate (simple version: return hex)
  return hex;
}
