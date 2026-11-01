const puppeteer = require('puppeteer-core');

async function testLoginDebug() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1920,1080']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 600));

  // Call API login directly in browser context
  const loginResult = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: 'lead.planner@royalknot.in', password: 'RoyalKnot#2026' })
      });
      const data = await res.json();
      return { status: res.status, data };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('Login API result in browser context:', loginResult);

  // Now reload page so AuthContext's checkAuth runs with the session cookie!
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  const pageState = await page.evaluate(() => {
    return {
      h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean)
    };
  });

  console.log('Page state after authenticated reload:', pageState);
  await browser.close();
}

testLoginDebug().catch(console.error);
