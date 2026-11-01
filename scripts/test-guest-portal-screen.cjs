const puppeteer = require('puppeteer-core');

async function testGuestPortalScreen() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1920,1080']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Login via API in page context
  await page.evaluate(async () => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: 'lead.planner@royalknot.in', password: 'RoyalKnot#2026' })
    });
  });

  // Reload to dashboard
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // Click "✦ Guest Concierge Portal"
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Guest Concierge Portal'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const portalContent = await page.evaluate(() => {
    return {
      title: document.title,
      h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText),
      h2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText),
      h3: Array.from(document.querySelectorAll('h3')).map(h => h.innerText),
      inputs: Array.from(document.querySelectorAll('input')).map(i => i.placeholder || i.type)
    };
  });
  console.log('Portal Content Rendered:', portalContent);

  const screenshotPath = 'C:\\Users\\bhupa\\.gemini\\antigravity\\brain\\f3260598-34fd-4bbb-bc4f-67c21c60f0ed\\verified_guest_portal_screen.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
}

testGuestPortalScreen().catch(console.error);
