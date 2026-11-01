const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function testSequence() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1920,1080']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR LOG:', msg.text());
  });
  page.on('pageerror', err => console.log('UNCAUGHT PAGE EXCEPTION:', err.message));

  console.log('1. Navigating to root...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Login
  await page.evaluate(async () => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: 'lead.planner@royalknot.in', password: 'RoyalKnot#2026' })
    });
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  console.log('2. Opening Guest Portal...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Guest Concierge Portal'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('3. Closing Guest Portal properly via state / back button...');
  await page.evaluate(() => {
    if (window.__closeGuestPortal) {
      window.__closeGuestPortal();
    } else {
      const backBtn = document.getElementById('btn-back-to-planner');
      if (backBtn) backBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  const check1 = await page.evaluate(() => ({
    bodyLength: document.body.innerHTML.length,
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.slice(0, 30))
  }));
  console.log('Post-close check:', check1);

  console.log('4. Navigating to Wedding Projects tab via __setCurrentTab("wed")...');
  await page.evaluate(() => {
    if (window.__setCurrentTab) {
      window.__setCurrentTab('wed');
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  const check2 = await page.evaluate(() => ({
    bodyLength: document.body.innerHTML.length,
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.slice(0, 30)),
    buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim().slice(0, 20)).filter(Boolean)
  }));
  console.log('Wedding tab check:', check2);

  console.log('5. Navigating to CRM Enquiries tab via __setCurrentTab("enq")...');
  await page.evaluate(() => {
    if (window.__setCurrentTab) {
      window.__setCurrentTab('enq');
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  const check3 = await page.evaluate(() => ({
    bodyLength: document.body.innerHTML.length,
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.slice(0, 30))
  }));
  console.log('CRM tab check:', check3);

  console.log('6. Navigating to Demo Data Explorer via __setCurrentTab("explorer")...');
  await page.evaluate(() => {
    if (window.__setCurrentTab) {
      window.__setCurrentTab('explorer');
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  const check4 = await page.evaluate(() => ({
    bodyLength: document.body.innerHTML.length,
    tables: document.querySelectorAll('table').length,
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.slice(0, 30))
  }));
  console.log('Explorer tab check:', check4);

  await page.screenshot({ path: 'C:\\Users\\bhupa\\.gemini\\antigravity\\brain\\f3260598-34fd-4bbb-bc4f-67c21c60f0ed\\verify_sequence_final.png' });
  console.log('Screenshot saved!');
  await browser.close();
}

testSequence().catch(console.error);
