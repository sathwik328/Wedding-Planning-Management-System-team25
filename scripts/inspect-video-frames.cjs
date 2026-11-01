const puppeteer = require('puppeteer-core');
const path = require('path');

async function inspectFrames() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1920,1080']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto('http://localhost:3000/demo-showcase.html', { waitUntil: 'networkidle2' });

  // Get duration
  const duration = await page.evaluate(async () => {
    const video = document.getElementById('demoVideo');
    if (!video.duration) {
      await new Promise(r => video.onloadedmetadata = r);
    }
    return video.duration;
  });
  console.log('Video duration in seconds:', duration);

  const testTimes = [15, 35, 55, 70, 75, 85, 95];
  for (const t of testTimes) {
    if (t < duration) {
      await page.evaluate((time) => {
        const v = document.getElementById('demoVideo');
        v.pause();
        v.currentTime = time;
      }, t);
      await new Promise(r => setTimeout(r, 600));

      const outPath = path.join('C:\\Users\\bhupa\\.gemini\\antigravity\\brain\\f3260598-34fd-4bbb-bc4f-67c21c60f0ed', `frame_at_${t}s.png`);
      await page.screenshot({ path: outPath });
      console.log(`Saved screenshot at ${t}s to ${outPath}`);
    }
  }

  await browser.close();
}

inspectFrames().catch(console.error);
