const fs = require('fs');
const path = require('path');
const https = require('https');

// Path to LHCI manifest and output directory
const manifestPath = path.join(__dirname, '../../.lighthouseci/manifest.json');
const outputDir = path.join(__dirname, '../../badges');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Downloads a badge from Shields.io
 * @param {string} label 
 * @param {string} value 
 * @param {string} color 
 * @returns {Promise<void>}
 */
function downloadBadge(label, value, color) {
  const url = `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(value)}-${color}`;
  const filename = `${label.toLowerCase().replace(/%20/g, '-').replace(/ /g, '-')}.svg`;
  const filePath = path.join(outputDir, filename);
  
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'NodeJS/LighthouseBadgeGenerator' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${label} badge: Status code ${res.statusCode}`));
        return;
      }
      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Successfully downloaded: ${filename} (${value})`);
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    if (!fs.existsSync(manifestPath)) {
      console.error(`Error: Manifest file not found at ${manifestPath}`);
      process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!Array.isArray(manifest) || manifest.length === 0) {
      console.error('Error: Manifest is empty or invalid.');
      process.exit(1);
    }

    // Find the representative run (median run) or fallback to first run
    const run = manifest.find(r => r.isRepresentativeRun) || manifest[0];
    const summary = run.summary;

    if (!summary) {
      console.error('Error: No summary found in the representative run.');
      process.exit(1);
    }

    // Categories to generate badges for
    const categories = {
      'Performance': summary.performance,
      'Accessibility': summary.accessibility,
      'Best Practices': summary['best-practices'],
      'SEO': summary.seo,
      'PWA': summary.pwa
    };

    let totalScore = 0;
    let count = 0;

    for (const [name, score] of Object.entries(categories)) {
      if (score === undefined || score === null) {
        console.log(`Skipping category ${name} (no score available)`);
        continue;
      }
      
      const percentage = Math.round(score * 100);
      totalScore += percentage;
      count++;

      // Determine color according to Lighthouse standards
      let color = 'ff3333'; // Red (0-49)
      if (percentage >= 90) {
        color = '00cc66'; // Green (90-100)
      } else if (percentage >= 50) {
        color = 'ffaa33'; // Orange (50-89)
      }

      await downloadBadge(`Lighthouse ${name}`, `${percentage}%`, color);
    }

    // Generate single aggregate score badge
    if (count > 0) {
      const average = Math.round(totalScore / count);
      let color = 'ff3333';
      if (average >= 90) {
        color = '00cc66';
      } else if (average >= 50) {
        color = 'ffaa33';
      }
      await downloadBadge('Lighthouse', `${average}%`, color);
    }

    console.log('Lighthouse badges generated successfully!');
  } catch (error) {
    console.error('Error generating badges:', error);
    process.exit(1);
  }
}

main();
