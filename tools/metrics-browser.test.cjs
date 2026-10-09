const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.argv[2] || 'playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'assets/site-config.json')));
  config.metrics = config.metrics.filter(metric => ['awareness', 'opinion'].includes(metric.field));
  const data = JSON.parse(fs.readFileSync(path.join(root, 'assets/factions.json')));
  config.factionIcon = {symbol: '◆', image: 'assets/missing-icon.png'};
  data.factions[0].symbol = '';
  config.metrics[0].name = 'Attention';
  config.metrics[0].bands.at(-1).label = 'Alert';
  config.metrics.push({field: 'influence', name: 'Influence', min: 0, max: 10, suffix: ' / 10', color: {dark: '#b0d39b', light: '#376448'}, bands: [{max: 10, label: 'Established'}]});
  config.metrics.push({field: 'loyalty', name: 'Loyalty', min: -10, max: 20, baseline: 5, showPlus: true, bands: [{max: 20, label: 'Steady', color: 'var(--accent)'}]});
  data.factions.forEach(faction => { faction.influence = 5; faction.loyalty = -5; });
  const headers = ['id', 'name', 'symbol', 'category', 'blurb', 'contact', 'location', 'censored', ...config.metrics.map(metric => metric.field)];
  const csv = [headers, ...data.factions.map(faction => headers.map(field => faction[field] ?? ''))].map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\n');
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage(); const errors = []; let invalid = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://docs.google.com/**', route => route.fulfill({body: csv, contentType: 'text/csv'}));
    await page.route('http://tracker.test/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
      if (!fs.existsSync(file)) return route.fulfill({status: 404, body: ''});
      let body = fs.readFileSync(file);
      if (pathname.endsWith('site-config.json')) body = JSON.stringify(invalid ? {...config, metrics: [...config.metrics, config.metrics[0]]} : config);
      if (pathname.endsWith('factions.json')) body = JSON.stringify(data);
      return route.fulfill({body, contentType: file.endsWith('.ttf') ? 'font/ttf' : file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : file.endsWith('.json') ? 'application/json' : 'text/html'});
    });
    for (const source of ['sheets', 'json']) {
      config.dataSource = source;
      for (const [width, height] of [[1440, 900], [390, 844], [320, 640]]) {
        await page.setViewportSize({width, height}); await page.goto('http://tracker.test/'); await page.waitForSelector('.faction');
        await page.evaluate(() => document.fonts.ready);
        const fontChecks = await page.evaluate(async () => {
          const checks = {};
          for (const [font, sample] of [['Cinzel', 'Faction'], ['IM Fell English', 'Notes'], ['Noto Sans Khmer', 'កខគ']]) {
            const loaded = await document.fonts.load(`19px "${font}"`, sample);
            checks[font] = loaded.length > 0 && loaded.every(face => face.status === 'loaded');
          }
          return checks;
        });
        assert.deepEqual(fontChecks, {'Cinzel': true, 'IM Fell English': true, 'Noto Sans Khmer': true});
        assert.equal(await page.locator('.faction').first().locator('.meter').count(), 4);
        assert.equal(await page.locator('.faction').first().locator('.sigil').textContent(), '◆');
        const unknown = page.locator('.faction').last();
        assert.match(await unknown.getAttribute('aria-label'), /Unknown faction/);
        assert.ok(!(await unknown.textContent()).includes('Mossbound'));
        assert.equal(await unknown.locator('.sigil').textContent(), data.factions.at(-1).symbol);
        assert.equal(await unknown.locator('.meter').count(), 4);
        assert.match(await page.locator('.faction').first().getAttribute('aria-label'), /Influence: Established, 5 \/ 10/);
        const layout = await page.evaluate(() => {
          const meters = document.querySelectorAll('.faction .meter');
          return {thirdBelow: meters[2].getBoundingClientRect().top > meters[0].getBoundingClientRect().top, fits: document.documentElement.scrollHeight <= innerHeight, noOverflow: document.documentElement.scrollWidth <= innerWidth};
        });
        assert.deepEqual(layout, {thirdBelow: true, fits: true, noOverflow: true}, `${source} ${width}x${height}`);
        await page.locator('.faction').first().click();
        const dossier = width > 760 ? '#details' : '#modal-body';
        assert.equal(await page.locator(dossier + ' .meter').count(), 4);
        assert.equal(await page.locator(dossier + ' .sigil').textContent(), '◆');
        const fill = await page.locator(dossier + ' [data-field=loyalty] .fill').getAttribute('style');
        assert.match(fill, /left: 16\.666/); assert.match(fill, /width: 33\.333/);
        if (width <= 760) await page.click('#close');
      }
    }
    const alternateFonts = await page.evaluate(async () => {
      const results = {};
      for (const [font, sample] of [['Uncial Antiqua', 'Faction'], ['Noto Sans Runic', 'ᚠᚢᚦ']]) {
        const faces = await document.fonts.load(`20px "${font}"`, sample);
        results[font] = faces.length > 0 && faces.every(face => face.status === 'loaded');
      }
      return results;
    });
    assert.deepEqual(alternateFonts, {'Uncial Antiqua': true, 'Noto Sans Runic': true});
    await page.setViewportSize({width: 1440, height: 900});
    await page.locator('.faction').last().click();
    const hiddenIdentity = data.factions.at(-1);
    assert.equal(await page.locator('#details .sigil').textContent(), hiddenIdentity.symbol);
    for (const field of ['name', 'category', 'blurb', 'contact', 'location']) assert.ok(!(await page.locator('#details').innerHTML()).includes(hiddenIdentity[field]));
    const scrambled = page.locator('#details h2 .scrambled');
    const partialChange = await page.evaluate(() => {
      const node = document.querySelector('#details h2 .scrambled');
      const before = node.textContent;
      scramble(node);
      const after = node.textContent;
      return {changed: Array.from(before.replace(/\s/g, '')).filter((character, index) => character !== Array.from(after.replace(/\s/g, ''))[index]).length, spacesStable: before.split('').map((character, index) => character === ' ' ? index : -1).filter(index => index >= 0).every(index => after[index] === ' ')};
    });
    assert.equal(partialChange.changed, 6);
    assert.equal(partialChange.spacesStable, true);
    const firstScramble = await scrambled.textContent();
    await page.waitForFunction(previous => document.querySelector('#details h2 .scrambled').textContent !== previous, firstScramble);
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.waitForTimeout(50);
    const still = await scrambled.textContent();
    await page.waitForTimeout(650);
    assert.equal(await scrambled.textContent(), still);
    await page.locator('#search').fill('Mossbound');
    assert.equal(await page.locator('.faction').count(), 0);
    await page.locator('#search').fill('Unknown faction');
    assert.equal(await page.locator('.faction').count(), 1);
    await page.locator('#search').fill('');
    for (const [mode, expected] of [['dark', 'rgb(176, 211, 155)'], ['light', 'rgb(55, 100, 72)']]) {
      const actual = await page.evaluate(mode => { document.documentElement.dataset.theme = mode; return getComputedStyle(document.querySelector('[data-field=influence] .fill')).backgroundColor; }, mode);
      assert.equal(actual, expected);
    }
    config.appearance = {palette: 'sage', mode: 'light'};
    config.footerLink = {text: 'Custom link', url: 'https://example.com/'};
    config.text.footerLeft = 'Custom link / Campaign';
    config.censorship.characterWidthEm = .7;
    config.censorship.letterSpacingEm = .02;
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await page.waitForSelector('.faction');
    assert.equal(await page.locator('#theme').inputValue(), 'sage');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    assert.equal(await page.locator('footer a').getAttribute('href'), 'https://example.com/');
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--scramble-width')), '0.7em');
    await page.evaluate(() => { localStorage.setItem('factions-palette', 'ocean'); localStorage.setItem('factions-mode', 'dark'); });
    await page.reload(); await page.waitForSelector('.faction');
    assert.equal(await page.locator('#theme').inputValue(), 'ocean');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    invalid = true; await page.click('#refresh'); await page.waitForSelector('#status.error');
    assert.equal(await page.locator('.faction').count(), 6);
    assert.equal(await page.locator('.faction').first().locator('.meter').count(), 4);
    assert.deepEqual(errors, []);
    console.log('JSON/Sheets meters, censorship, search masking, animation/reduced motion, layouts, colors, and failure retention passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
