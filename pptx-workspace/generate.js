const path = require('path');
const fs = require('fs');
const PptxGenJS = require('pptxgenjs');

// Import html2pptx from the skill scripts
const html2pptx = require('/Users/qifenghou/.claude/skills/pptx/scripts/html2pptx.js');

async function generate() {
  const slidesDir = path.join(__dirname, 'slides');
  const outputPath = path.join(__dirname, 'Copilot-Atlas-Multi-Agent-Workflow.pptx');

  // Create a new presentation matching our HTML dimensions (720pt x 405pt = 10" x 5.625")
  const pres = new PptxGenJS();
  pres.defineLayout({ name: 'CUSTOM_16_9', width: 10, height: 5.625 });
  pres.layout = 'CUSTOM_16_9';

  // Collect all slide HTML files in order
  const slideFiles = [];
  for (let i = 1; i <= 13; i++) {
    const num = String(i).padStart(2, '0');
    const filePath = path.join(slidesDir, `slide${num}.html`);
    if (fs.existsSync(filePath)) {
      slideFiles.push(filePath);
    } else {
      console.warn(`Warning: ${filePath} not found, skipping.`);
    }
  }

  console.log(`Found ${slideFiles.length} slides`);
  slideFiles.forEach((f, i) => console.log(`  Slide ${i + 1}: ${path.basename(f)}`));

  // Process each slide
  for (let i = 0; i < slideFiles.length; i++) {
    const slideFile = slideFiles[i];
    console.log(`\nProcessing slide ${i + 1}/${slideFiles.length}: ${path.basename(slideFile)}`);
    try {
      await html2pptx(slideFile, pres);
      console.log(`  ✓ Slide ${i + 1} added successfully`);
    } catch (err) {
      console.error(`  ✗ Error on slide ${i + 1}: ${err.message}`);
      // Continue with remaining slides
    }
  }

  // Save the presentation
  console.log('\nSaving PPTX...');
  await pres.writeFile({ fileName: outputPath });
  console.log(`\nDone! Output: ${outputPath}`);
}

generate().catch(err => {
  console.error('Error generating PPTX:', err);
  process.exit(1);
});
