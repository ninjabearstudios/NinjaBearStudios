// Run with Node.js and Playwright installed (no application build step).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const files = ['index', 'music', 'dev', 'streams', 'anime', 'lore', 'about', '404'];
const widths = [320, 390, 600, 768, 850, 900, 901, 1024, 1200, 1201, 1440, 1600, 1920];
const screenshotWidths = [320, 390, 768, 1024, 1440, 1920];
const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.xml':'application/xml', '.txt':'text/plain'};
const server = http.createServer((req, res) => {
  let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/preview\//, '/');
  if (name.endsWith('/')) name += 'index.html';
  const target = path.resolve(root, '.' + name);
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); res.end('Not found'); return; }
  res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
  res.end(fs.readFileSync(target));
});
let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };
async function loadedImages(page) {
  await page.locator('img[loading="lazy"]').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
}
async function layout(page, label) {
  const state = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    outside: [...document.querySelectorAll('h1,h2,h3,.btn,.main-nav,.social-slot')].filter(el => {
      const r = el.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1);
    }).map(el => el.textContent),
    broken: [...document.images].filter(image => !image.naturalWidth).map(image => image.src)
  }));
  ok(!state.overflow && !state.outside.length, `${label}: overflow ${JSON.stringify(state)}`);
  ok(!state.broken.length, `${label}: broken images`);
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true});
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  // The 404 base intentionally targets the public domain, including at nested missing URLs.
  // Intercept it for local verification; no public-domain availability is implied.
  await page.route('https://ninjabearstudios.com/**', async route => {
    const url = new URL(route.request().url());
    const response = await page.request.get(origin + url.pathname);
    await route.fulfill({response});
  });
  try {
    fs.mkdirSync(path.join(__dirname, 'screenshots'), {recursive:true});
    const descriptions = new Set();
    const checkedLinks = new Set();
    for (const file of files) {
      console.log(`Checking ${file}…`);
      for (const width of widths) {
        await page.setViewportSize({width, height:1000});
        await page.goto(`${origin}/${file}.html`);
        await loadedImages(page);
        await layout(page, `${file} ${width}`);
        if (screenshotWidths.includes(width)) await page.screenshot({path:path.join(__dirname, `screenshots/after-${file}-${width}.png`), fullPage:true});
      }
      const meta = await page.evaluate(() => ({
        description: document.querySelector('meta[name="description"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        og: document.querySelector('meta[property="og:image"]')?.content,
        h1: document.querySelectorAll('h1').length,
        current: document.querySelector('nav [aria-current="page"]')?.getAttribute('href'),
        ids: [...document.querySelectorAll('[id]')].map(el => el.id),
        text: document.body.innerText,
        links: [...document.querySelectorAll('[href], [src]')].map(el => el.getAttribute('href') || el.getAttribute('src'))
      }));
      ok(meta.h1 === 1 && meta.description && !descriptions.has(meta.description), `${file}: heading and unique description`);
      descriptions.add(meta.description);
      ok(meta.canonical.startsWith('https://ninjabearstudios.com/') && meta.og.endsWith('/assets/site-banner.png'), `${file}: metadata`);
      ok(meta.ids.length === new Set(meta.ids).size, `${file}: duplicate IDs`);
      ok(file === '404' || meta.current === `${file}.html`, `${file}: active nav`);
      ok(!/strong starting point|Use this area|pseudo-portfolio|Elden Chaos|Next Watchlist/.test(meta.text), `${file}: unverified/template content`);
      for (const raw of meta.links) {
        ok(raw !== '#' && !raw.startsWith('javascript:'), `${file}: placeholder link`);
        if (/^(https?:|mailto:)/.test(raw)) continue;
        const url = new URL(raw, `${origin}/${file}.html`);
        if (checkedLinks.has(url.href)) continue;
        checkedLinks.add(url.href);
        ok((await page.request.get(url.href)).ok(), `${file}: local target ${raw}`);
        const relative = decodeURIComponent(url.pathname.slice(1));
        let cursor = root;
        for (const part of relative.split('/')) { ok(fs.readdirSync(cursor).includes(part), `filename case: ${relative}`); cursor = path.join(cursor, part); }
        if (url.hash) {
          const target = fs.readFileSync(cursor, 'utf8');
          ok(target.includes(`id="${url.hash.slice(1)}"`), `fragment ${raw}`);
        }
      }
      // Same HTML under a project prefix: links/assets must retain /preview/.
      if (file !== '404') {
        await page.goto(`${origin}/preview/${file}.html`); await loadedImages(page);
        const local = await page.locator('.brand').getAttribute('href');
        await page.locator('.brand').click();
        ok(page.url() === `${origin}/preview/${local}`, `${file}: project-relative navigation`);
      }
    }
    // Every internal visible homepage action, plus the seven navigation destinations.
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(origin);
    const actions = await page.locator('a[href]').evaluateAll(links => links.map(link => link.getAttribute('href')));
    for (const href of [...new Set(actions)]) {
      await page.goto(origin);
      if (href === '#main') await page.keyboard.press('Tab');
      await page.locator(`a[href="${href}"]`).first().click();
      ok(page.url() === new URL(href, origin + '/').href, `action navigates: ${href}`);
    }
    // Menu: keyboard activation, focus, Escape, outside click, selection and breakpoint reset.
    await page.setViewportSize({width:390,height:844}); await page.goto(origin);
    await page.keyboard.press('Tab');
    ok(await page.locator('.skip-link').evaluate(el => el === document.activeElement), 'skip link first');
    await page.keyboard.press('Enter');
    ok(await page.locator('#main').evaluate(el => el === document.activeElement), 'skip link targets main');
    const toggle = page.locator('.nav-toggle');
    await toggle.focus(); await page.keyboard.press('Enter');
    ok(await toggle.getAttribute('aria-expanded') === 'true', 'keyboard opens menu');
    await page.keyboard.press('Tab');
    ok(await page.locator('#main-nav a').first().evaluate(el => el === document.activeElement), 'Tab enters menu');
    await page.keyboard.press('Escape');
    ok(await toggle.getAttribute('aria-expanded') === 'false' && await toggle.evaluate(el => el === document.activeElement), 'Escape restores focus');
    await toggle.click(); await page.locator('.hero h1').click({force:true});
    // Click a visible area outside the expanded panel.
    await page.mouse.click(380, 800);
    ok(await toggle.getAttribute('aria-expanded') === 'false', 'outside click closes');
    await toggle.click(); await page.locator('nav a[href="music.html"]').click();
    ok(page.url().endsWith('/music.html') && await toggle.getAttribute('aria-expanded') === 'false', 'link selection closes');
    await toggle.click(); await page.setViewportSize({width:1024,height:1000});
    await page.waitForFunction(() => document.querySelector('.nav-toggle').getAttribute('aria-expanded') === 'false');
    ok(await toggle.getAttribute('aria-expanded') === 'false' && await page.locator('#main-nav').isVisible(), 'desktop resets state');
    await page.setViewportSize({width:390,height:844});
    ok(!await page.locator('#main-nav').isVisible(), 'return to mobile is closed');
    await toggle.click(); await page.locator('.interior-hero .btn').focus();
    ok(await toggle.getAttribute('aria-expanded') === 'false', 'focus leaving closes menu');
    // Real Chromium 200% page zoom, using an isolated test profile (never the user's).
    const profile = fs.mkdtempSync(path.join(__dirname, '.zoom-'));
    fs.mkdirSync(path.join(profile, 'Default'));
    const zoomLevel = Math.log(2) / Math.log(1.2);
    fs.writeFileSync(path.join(profile,'Default/Preferences'), JSON.stringify({
      partition: {default_zoom_level:{x:zoomLevel}, per_host_zoom_levels:{x:{'127.0.0.1':zoomLevel}}}
    }));
    const zoomBrowser = await chromium.launchPersistentContext(profile, {channel:process.env.BROWSER_CHANNEL || 'chrome', headless:true, viewport:null, args:['--window-size=1440,1000']});
    try {
      const zoomPage = await zoomBrowser.newPage();
      const zoomSession = await zoomBrowser.newCDPSession(zoomPage);
      for (const file of files.slice(0,7)) {
        await zoomPage.goto(`${origin}/${file}.html`); await loadedImages(zoomPage);
        ok(await zoomPage.evaluate(() => devicePixelRatio === 2 && innerWidth < 750), '200% browser zoom active');
        await layout(zoomPage, `${file} 200% browser zoom`);
        // Capture the real browser surface; Playwright's default clipping uses unzoomed dimensions.
        const capture = await zoomSession.send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
        fs.writeFileSync(path.join(__dirname,`screenshots/zoom-${file}.png`), Buffer.from(capture.data,'base64'));
      }
    } finally {
      await zoomBrowser.close();
      if (path.resolve(profile).startsWith(path.resolve(__dirname) + path.sep + '.zoom-')) fs.rmSync(profile, {recursive:true,force:true});
    }
    await page.setViewportSize({width:320,height:900}); await page.goto(`${origin}/dev.html`);
    await page.locator('h1').evaluate(el => { el.textContent = 'A deliberately long development portfolio heading with an UnbrokenProjectTitleThatMustWrapWithoutOverflow'; });
    await loadedImages(page); await layout(page, 'long title');
    await page.emulateMedia({reducedMotion:'reduce'});
    ok(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto'), 'reduced motion');
    // Empty configuration remains honest and noninteractive.
    await page.goto(`${origin}/about.html`);
    ok(await page.locator('.socials a').count() === 0 && !await page.locator('[data-contact]').isVisible(), 'empty config');
    // Test-only URLs never enter shipped configuration and are never visited.
    await page.route('**/assets/config.js', route => route.fulfill({contentType:'text/javascript', body:`window.NINJABEAR_CONFIG={socials:{youtube:'https://example.test/channel',discord:'https://example.test/community'},contactUrl:'mailto:studio@example.test',media:{trailerUrl:'https://example.test/trailer',musicUrl:'https://example.test/music',highlightUrl:'https://example.test/highlight'}};`}));
    await page.goto(`${origin}/about.html`);
    ok(await page.locator('[data-channel-links] a').count() === 2 && await page.locator('.social-slot').count() === 0 && await page.locator('[data-contact]').getAttribute('href') === 'mailto:studio@example.test', 'configured contact/socials');
    ok(!await page.locator('[data-empty-contact]').isVisible() && !await page.locator('[data-empty-channels]').isVisible(), 'configured empty states removed');
    await page.goto(origin);
    ok(await page.locator('[data-community]').getAttribute('href') === 'https://example.test/community' && await page.locator('[data-trailer]').getAttribute('href') === 'https://example.test/trailer', 'configured CTAs');
    for (const [file, key] of [['streams','highlightUrl']]) {
      await page.goto(`${origin}/${file}.html`);
      ok(await page.locator(`[data-media="${key}"]`).isVisible(), `${key} enabled`);
    }
    await page.unroute('**/assets/config.js');
    await page.route('**/assets/config.js', route => route.fulfill({contentType:'text/javascript',body:'window.NINJABEAR_CONFIG={socials:{youtube:"javascript:alert(1)"},contactUrl:"not a URL",media:{trailerUrl:"http://example.test"}};'}));
    await page.goto(origin);
    ok(await page.locator('.socials a').count() === 0 && await page.locator('[data-trailer]').getAttribute('href') === 'streams.html', 'invalid config rejected');
    const noJS = await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});
    const staticPage = await noJS.newPage();
    for (const file of files.slice(0,7)) {
      await staticPage.goto(`${origin}/${file}.html`);
      ok(await staticPage.locator('#main-nav').isVisible() && await staticPage.locator('#main-nav a').count() === 7, `${file}: no-JS navigation`);
      ok(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${file}: no-JS layout`);
      await staticPage.locator('nav a[href="dev.html"]').click();
      ok(staticPage.url().endsWith('/dev.html'), `${file}: no-JS link works`);
    }
    await staticPage.goto(`${origin}/music.html`);
    const approvedMusic = JSON.parse(fs.readFileSync(path.join(__dirname, 'music-content.json'), 'utf8'));
    ok(await staticPage.locator('.track-list > li').count() === 62, '62 album tracks');
    ok(await staticPage.locator('details.lyrics').count() === 62, '62 approved lyrics');
    const actualMusic = await staticPage.locator('.track-list > li').evaluateAll(items => items.map(item => ({id:item.id, lyrics:item.querySelector('.lyric-text')?.textContent ?? null})));
    ok(JSON.stringify(actualMusic) === JSON.stringify(approvedMusic.map(({id,lyrics}) => ({id,lyrics}))), 'exact approved lyrics and screenshot track order');
    ok(await staticPage.locator('#say-it-twice ul.track-list').count() === 1, 'undecided album order unnumbered');
    const firstLyric = staticPage.locator('details.lyrics').first();
    await firstLyric.locator('summary').focus();
    await staticPage.keyboard.press('Enter');
    ok(await firstLyric.getAttribute('open') !== null, 'keyboard opens lyrics without JavaScript');
    await loadedImages(staticPage);
    await layout(staticPage, '320px expanded lyrics without JavaScript');
    await staticPage.screenshot({path:path.join(__dirname,'screenshots/music-expanded-mobile.png'),fullPage:true});
    await staticPage.keyboard.press('Space');
    ok(await firstLyric.getAttribute('open') === null, 'keyboard closes lyrics without JavaScript');
    await noJS.close();
    const css = fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
    for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) ok(fs.existsSync(path.resolve(root,'assets',match[1])), `CSS asset ${match[1]}`);
    ok(!css.includes('overflow-x: hidden'), 'no overflow concealment');
    const workflow = fs.readFileSync(path.join(root,'.github/workflows/static.yml'),'utf8');
    ok(workflow.includes("path: '_site'") && workflow.includes('cp ./*.html sitemap.xml robots.txt _site/') && workflow.includes('cp -R assets _site/assets'), 'deployment stages public files only');
    ok(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').match(/<loc>/g).length === 7, 'sitemap seven pages');
    ok(fs.readFileSync(path.join(root,'robots.txt'),'utf8').includes('https://ninjabearstudios.com/sitemap.xml'), 'robots sitemap');
    ok(errors.length === 0, `browser errors: ${errors.join('; ')}`);
    const report = `${checks} checks passed. Eight pages, 13 widths, root/project paths, links, assets, menus, focus, no-JS, configuration, reduced motion, long titles and 200% browser zoom. No browser errors.\n`;
    fs.writeFileSync(path.join(__dirname,'results.txt'), report); console.log(report);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
