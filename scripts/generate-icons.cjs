const fs = require('fs');
const path = require('path');

function generateSVGIcon(size) {
  const padding = size * 0.15;
  const innerSize = size - (padding * 2);
  const fontSize = innerSize * 0.65;
  const borderRadius = size * 0.2;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1B4332"/>
      <stop offset="100%" style="stop-color:#2D6A4F"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${borderRadius}" fill="url(#bgGrad)"/>
  <text x="${size/2}" y="${size/2 + fontSize*0.35}" 
        font-family="Inter, Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="700" 
        fill="#52B788" 
        text-anchor="middle">P</text>
</svg>`;
}

const sizes = [192, 512];
const iconsDir = path.join(__dirname, '..', 'client', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const svg = generateSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Generated ${filename}`);
});

console.log('Icons generated successfully!');
