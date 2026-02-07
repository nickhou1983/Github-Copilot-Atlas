const sharp = require('sharp');
const path = require('path');

async function createGradient(filename, color1, color2, angle = '135') {
  const w = 1440, h = 810;
  let gradientDef;
  if (angle === '135') {
    gradientDef = `<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">`;
  } else if (angle === '180') {
    gradientDef = `<linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">`;
  } else {
    gradientDef = `<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>${gradientDef}
      <stop offset="0%" style="stop-color:${color1}"/>
      <stop offset="100%" style="stop-color:${color2}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, 'slides', filename));
}

async function createCircleDecor(filename, color, opacity) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
    <circle cx="150" cy="150" r="140" fill="${color}" opacity="${opacity}"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, 'slides', filename));
}

async function createIcon(filename, svgContent) {
  await sharp(Buffer.from(svgContent)).png().toFile(path.join(__dirname, 'slides', filename));
}

(async () => {
  // Title slide gradient
  await createGradient('bg-title.png', '#0F1629', '#1A2744');
  // Content slide gradient
  await createGradient('bg-content.png', '#0F1629', '#162038', '180');
  // Section divider gradient
  await createGradient('bg-section.png', '#1A2744', '#0D2137', '135');
  // End slide gradient
  await createGradient('bg-end.png', '#0F1629', '#1E1B3A', '135');

  // Decorative circles
  await createCircleDecor('circle-blue.png', '#4A7BF7', '0.15');
  await createCircleDecor('circle-cyan.png', '#00D4AA', '0.12');

  // Agent icons (simple colored circles with initials)
  const agents = [
    { name: 'atlas', color: '#4A7BF7', letter: 'A' },
    { name: 'prometheus', color: '#FF6B35', letter: 'P' },
    { name: 'oracle', color: '#00D4AA', letter: 'O' },
    { name: 'explorer', color: '#FFD93D', letter: 'E' },
    { name: 'sisyphus', color: '#C084FC', letter: 'S' },
    { name: 'review', color: '#F472B6', letter: 'R' },
    { name: 'frontend', color: '#34D399', letter: 'F' },
  ];

  for (const a of agents) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <circle cx="60" cy="60" r="56" fill="${a.color}"/>
      <text x="60" y="60" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-weight="bold" font-size="48" fill="white">${a.letter}</text>
    </svg>`;
    await createIcon(`icon-${a.name}.png`, svg);
  }

  // Arrow icon
  const arrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40" viewBox="0 0 80 40">
    <polygon points="0,12 55,12 55,0 80,20 55,40 55,28 0,28" fill="#4A7BF7"/>
  </svg>`;
  await createIcon('arrow-right.png', arrowSvg);

  // Down arrow
  const downArrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
    <polygon points="12,0 28,0 28,30 40,30 20,50 0,30 12,30" fill="#00D4AA"/>
  </svg>`;
  await createIcon('arrow-down.png', downArrowSvg);

  // Checkmark
  const checkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <circle cx="30" cy="30" r="28" fill="#00D4AA"/>
    <path d="M18 30 L26 38 L42 22" stroke="white" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  await createIcon('check.png', checkSvg);

  // Workflow phases icons
  const phaseColors = ['#4A7BF7', '#00D4AA', '#FF6B35', '#C084FC'];
  const phaseLabels = ['1', '2', '3', '4'];
  for (let i = 0; i < 4; i++) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
      <rect x="4" y="4" width="72" height="72" rx="16" fill="${phaseColors[i]}"/>
      <text x="40" y="40" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-weight="bold" font-size="36" fill="white">${phaseLabels[i]}</text>
    </svg>`;
    await createIcon(`phase-${i + 1}.png`, svg);
  }

  console.log('All background and icon assets created.');
})();
