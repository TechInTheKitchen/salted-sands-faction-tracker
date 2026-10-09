'use strict';
const $ = id => document.getElementById(id);
const desktop = matchMedia('(min-width:761px)');
const themes = ['dusk', 'parchment', 'sage', 'ocean'];
let factions = [], selectedId = null, updatedAt = '', config = null;
let metricDefinitions = FactionMetrics.definitions({});
let appearanceConfigured = false;
const fontOptions = {
  system: 'system-ui, sans-serif',
  georgia: 'Georgia, serif',
  monospace: 'ui-monospace, monospace',
  cinzel: '"Cinzel", Georgia, serif',
  'uncial-antiqua': '"Uncial Antiqua", Georgia, serif',
  'im-fell-english': '"IM Fell English", Georgia, serif',
  'noto-sans-khmer': '"Noto Sans Khmer", sans-serif',
  'noto-sans-runic': '"Noto Sans Runic", sans-serif'
};
const defaultFonts = {headings: 'georgia', notes: 'system', interface: 'system', censored: 'monospace'};
const defaultText = {
  listHeading: 'Known factions', listHelp: 'Select a faction to read the DM’s notes.',
  searchLabel: 'Search factions', searchPlaceholder: 'Find a faction…', empty: 'No factions match your search.',
  sourceBadge: 'LOCAL JSON', sheetsSourceBadge: 'GOOGLE SHEETS', refresh: '↻ Refresh standings', count: '{visible} of {total} factions',
  dossier: 'FACTION DOSSIER', selectedFaction: 'Selected faction', selectFaction: 'Select a faction to open its dossier.',
  factionCategory: 'Faction', noNotes: 'No notes have been added yet.', notesHeading: 'FROM THE DM',
  unknownFaction: 'Unknown faction', censoredText: 'Not yet discovered',
  contact: 'Known contact', location: 'Where to find them',
  meterValue: '{label} · {value}', meterDescription: '{label}, {value}',
  factionAction: '{name}. {meters}. Open notes.',
  paletteLabel: 'Color palette', dusk: 'Dusk', parchment: 'Parchment', sage: 'Sage', ocean: 'Ocean',
  lightMode: 'Switch to light mode', darkMode: 'Switch to dark mode', closeNotes: 'Close faction notes',
  footerLeft: 'TechInTheKitchen / Faction Tracker', footerRight: 'Player reference · Sample campaign',
  loading: 'Loading standings…', lastUpdated: 'Last updated: {date}', lastSynced: 'Last synced: {date}',
  previousData: ' Previously loaded standings are still shown.', loadHelp: ' Use tools/Open Site.cmd to serve the app, then refresh.'
};
function copy(key, values = {}) {
  const value = config?.text?.[key];
  const template = typeof value === 'string' ? value : defaultText[key];
  return template.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}
function applyConfig() {
  if (!appearanceConfigured) {
    $('theme').value = preference('factions-palette', config.appearance?.palette ?? 'dusk');
    if (!themes.includes($('theme').value)) $('theme').value = config.appearance?.palette ?? 'dusk';
    document.documentElement.dataset.theme = preference('factions-mode', config.appearance?.mode ?? 'dark') === 'light' ? 'light' : 'dark';
    appearanceConfigured = true;
  }
  document.documentElement.style.setProperty('--scramble-width', `${config.censorship?.characterWidthEm ?? .85}em`);
  document.documentElement.style.setProperty('--scramble-spacing', `${config.censorship?.letterSpacingEm ?? 0}em`);
  for (const [role, fallback] of Object.entries(defaultFonts)) {
    document.documentElement.style.setProperty(`--font-${role}`, fontOptions[config.fonts?.[role] ?? fallback]);
  }
  for (const [id, key] of [['site-title', 'title'], ['campaign', 'campaign'], ['subtitle', 'subtitle'], ['site-eyebrow', 'eyebrow']]) {
    if (typeof config[key] === 'string') $(id).textContent = config[key];
  }
  document.title = config.title || 'Faction Tracker';
  for (const [selector, key] of [
    ['#list-heading', 'listHeading'], ['.section-head p', 'listHelp'], ['label[for=search]', 'searchLabel'],
    ['#empty', 'empty'], ['.source-badge', 'sourceBadge'], ['#refresh', 'refresh'],
    ['.dialog-head .eyebrow', 'dossier'], ['label[for=theme]', 'paletteLabel'],
    ['footer span:last-child', 'footerRight']
  ]) document.querySelector(selector).textContent = copy(key);
  document.querySelector('.source-badge').textContent = copy(config.dataSource === 'sheets' ? 'sheetsSourceBadge' : 'sourceBadge');
  const footerLeft = document.querySelector('footer span:first-child');
  const footerText = copy('footerLeft'), brandName = config.footerLink?.text ?? 'TechInTheKitchen';
  const footerUrl = config.footerLink?.url ?? 'https://The-Kitchen.dev';
  const brandPosition = brandName && footerUrl ? footerText.indexOf(brandName) : -1;
  footerLeft.replaceChildren();
  if (brandPosition >= 0) {
    const link = element('a', brandName);
    link.href = footerUrl;
    footerLeft.append(footerText.slice(0, brandPosition), link, footerText.slice(brandPosition + brandName.length));
  } else footerLeft.textContent = footerText;
  $('search').placeholder = copy('searchPlaceholder');
  document.querySelector('.reading-column').setAttribute('aria-label', copy('selectedFaction'));
  $('close').setAttribute('aria-label', copy('closeNotes'));
  for (const theme of themes) document.querySelector(`option[value=${theme}]`).textContent = copy(theme);
  const target = $('header-icon'), icon = config.headerIcon;
  target.textContent = typeof icon?.symbol === 'string' ? icon.symbol : '✦';
  if (typeof icon?.image === 'string' && icon.image.trim()) {
    const image = new Image(); image.alt = '';
    image.onload = () => { if (config.headerIcon === icon) { target.replaceChildren(image); updateFavicon(); } };
    image.src = icon.image.trim();
  }
  applyAppearance();
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let scrambleTimer;
function scramble(node) {
  const characters = [...new Set(Array.from(config?.censorship?.characters || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?#%'))];
  const length = Number(node.dataset.scrambleLength);
  let current = Array.from(node.textContent.replace(/\s/g, ''));
  if (current.length !== length) current = Array.from({length}, () => characters[Math.floor(Math.random() * characters.length)]);
  else {
    const indices = Array.from({length}, (_, index) => index);
    const count = Math.max(1, Math.ceil(length * (config?.censorship?.changeFraction ?? 1 / 3)));
    for (let i = 0; i < count; i++) {
      const selected = i + Math.floor(Math.random() * (length - i));
      [indices[i], indices[selected]] = [indices[selected], indices[i]];
      const index = indices[i], alternatives = characters.filter(character => character !== current[index]);
      current[index] = alternatives[Math.floor(Math.random() * alternatives.length)];
    }
  }
  node.replaceChildren();
  current.forEach(character => {
    node.append(element('span', character, 'scramble-character'));
  });
}
function censoredElement(tag, className, length = 16, label = copy('censoredText')) {
  const node = element(tag, undefined, className);
  node.classList.add('censored');
  node.setAttribute('aria-label', label);
  const visual = element('span', undefined, 'scrambled');
  visual.setAttribute('aria-hidden', 'true'); visual.dataset.scrambleLength = String(length);
  scramble(visual); node.append(visual);
  // A stable text alternative avoids announcing the animation to screen readers.
  node.append(element('span', label, 'sr-only'));
  return node;
}
function restartScrambling() {
  clearInterval(scrambleTimer);
  if (reducedMotion.matches) return;
  scrambleTimer = setInterval(() => {
    if (document.hidden) return;
    for (const node of document.querySelectorAll('[data-scramble-length]')) {
      if (node.getClientRects().length && (!node.closest('dialog') || node.closest('dialog').open)) scramble(node);
    }
  }, config?.censorship?.intervalMs ?? 240);
}
reducedMotion.addEventListener('change', restartScrambling);
function preference(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
function store(key, value) { try { localStorage.setItem(key, value); } catch {} }
function updateFavicon() {
  const appearance = getComputedStyle(document.documentElement);
  document.querySelector('meta[name=theme-color]').content = appearance.getPropertyValue('--bg').trim();
  const target = $('header-icon'), image = target.querySelector('img');
  if (image) { $('favicon').href = image.src; return; }
  const color = appearance.getPropertyValue('--accent').trim() || '#e1bf7a';
  const symbol = target.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  $('favicon').href = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="50" text-anchor="middle" font-family="system-ui, sans-serif" font-size="48" fill="${color}">${symbol}</text></svg>`);
}
$('palette').addEventListener('load', updateFavicon);
function applyAppearance() {
  const palettePath = `assets/themes/${$('theme').value}.css`;
  if ($('palette').getAttribute('href') !== palettePath) $('palette').href = palettePath;
  const mode = document.documentElement.dataset.theme;
  $('mode').textContent = mode === 'dark' ? '☀' : '☾';
  $('mode').setAttribute('aria-label', copy(mode === 'dark' ? 'lightMode' : 'darkMode'));
  updateFavicon();
}
const savedTheme = preference('factions-palette', 'dusk');
$('theme').value = themes.includes(savedTheme) ? savedTheme : 'dusk';
document.documentElement.dataset.theme = preference('factions-mode', 'dark') === 'light' ? 'light' : 'dark';
applyAppearance();
$('theme').onchange = () => { store('factions-palette', $('theme').value); applyAppearance(); };
$('mode').onclick = () => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; store('factions-mode', document.documentElement.dataset.theme); applyAppearance(); };
function meter(metric, value, expanded) {
  const name = metric.name;
  const band = FactionMetrics.band(metric, value), label = band.label;
  const position = (value - metric.min) / (metric.max - metric.min) * 100;
  const centered = metric.baseline !== undefined && metric.baseline !== null;
  const origin = centered ? (metric.baseline - metric.min) / (metric.max - metric.min) * 100 : 0;
  const wrap = element('div', undefined, 'meter');
  wrap.dataset.field = metric.field;
  const color = band.color ?? metric.color ?? 'var(--accent)';
  wrap.style.setProperty('--meter-dark', typeof color === 'string' ? color : color.dark);
  wrap.style.setProperty('--meter-light', typeof color === 'string' ? color : color.light);
  const heading = element('div', undefined, 'meter-label');
  const formattedValue = FactionMetrics.formatted(metric, value);
  heading.append(element('span', name), element('strong', copy('meterValue', {label, value: formattedValue})));
  const track = element('div', undefined, 'track');
  track.setAttribute('role', 'meter');
  track.setAttribute('aria-label', name);
  track.setAttribute('aria-valuemin', String(metric.min));
  track.setAttribute('aria-valuemax', String(metric.max));
  track.setAttribute('aria-valuenow', String(value));
  track.setAttribute('aria-valuetext', copy('meterDescription', {label, value: formattedValue}));
  const fill = element('span', undefined, 'fill');
  fill.style.left = `${Math.min(origin, position)}%`;
  fill.style.width = `${Math.abs(position - origin)}%`;
  if (centered) { const midpoint = element('span', undefined, 'midpoint'); midpoint.style.left = `${origin}%`; track.append(midpoint); }
  const thumb = element('span', undefined, 'thumb'); thumb.style.left = `${position}%`;
  track.append(fill, thumb); wrap.append(heading, track);
  if (expanded) {
    const endpoints = element('div', undefined, 'endpoints');
    const endpointsText = [metric.bands[0].label, metric.bands.at(-1).label];
    endpoints.append(element('span', endpointsText[0]), element('span', endpointsText.at(-1)));
    wrap.append(endpoints);
  }
  return wrap;
}
function meters(faction, expanded = false) {
  const group = element('div', undefined, 'meter-group');
  for (const definition of metricDefinitions) group.append(meter(definition, faction[definition.field], expanded));
  return group;
}
function factionIcon(tag, faction, expanded = false) {
  const fallback = config?.factionIcon;
  const symbol = faction.symbol || (typeof fallback?.symbol === 'string' ? fallback.symbol : '✦');
  const icon = element(tag, symbol, expanded ? 'sigil dossier-sigil' : 'sigil');
  icon.setAttribute('aria-hidden', 'true');
  if (!faction.symbol && typeof fallback?.image === 'string' && fallback.image.trim()) {
    const image = new Image(); image.alt = '';
    image.onload = () => icon.replaceChildren(image);
    image.src = fallback.image.trim();
  }
  return icon;
}
function dossier(target, faction, modal = false) {
  target.replaceChildren(); target.className = 'dossier';
  if (!faction) { target.append(element('p', copy('selectFaction'), 'blurb')); return; }
  const title = faction.censored ? censoredElement('h2', undefined, 16, copy('unknownFaction')) : element('h2', faction.name); if (modal) title.id = 'modal-title';
  const sigil = factionIcon('div', faction, true);
  if (!modal) target.append(element('p', copy('dossier'), 'eyebrow'));
  target.append(sigil, title, faction.censored ? censoredElement('p', 'category', 12) : element('p', faction.category || copy('factionCategory'), 'category'), meters(faction, true), element('h3', copy('notesHeading')), faction.censored ? censoredElement('p', 'blurb', 40) : element('p', faction.blurb || copy('noNotes'), 'blurb'));
  const facts = element('dl', undefined, 'facts');
  for (const [label, value] of [[copy('contact'), faction.contact], [copy('location'), faction.location]]) {
    if (value || faction.censored) { const row = element('div'); row.append(element('dt', label), faction.censored ? censoredElement('dd', undefined, 16) : element('dd', value)); facts.append(row); }
  }
  if (facts.children.length) target.append(facts);
}
function renderList() {
  const query = $('search').value.trim().toLocaleLowerCase();
  const visible = factions.filter(f => (f.censored ? `${copy('unknownFaction')} ${copy('censoredText')}` : `${f.name} ${f.category || ''}`).toLocaleLowerCase().includes(query));
  $('faction-list').replaceChildren(); $('empty').hidden = visible.length > 0;
  $('count').textContent = copy('count', {visible: visible.length, total: factions.length});
  for (const faction of visible) {
    const button = element('button', undefined, 'faction'); button.type = 'button';
    button.setAttribute('aria-pressed', String(faction.id === selectedId));
    const descriptions = metricDefinitions.map(metric => `${metric.name}: ${FactionMetrics.band(metric, faction[metric.field]).label}, ${FactionMetrics.formatted(metric, faction[metric.field])}`);
    button.setAttribute('aria-label', copy('factionAction', {name: faction.censored ? copy('unknownFaction') : faction.name, meters: descriptions.join('. ')}));
    const heading = element('span', undefined, 'faction-heading');
    const sigil = factionIcon('span', faction);
    const names = element('span');
    names.append(faction.censored ? censoredElement('span', 'faction-name', 16, copy('unknownFaction')) : element('span', faction.name, 'faction-name'), faction.censored ? censoredElement('span', 'category', 12) : element('span', faction.category || copy('factionCategory'), 'category'));
    const arrow = element('span', '↗', 'arrow'); arrow.setAttribute('aria-hidden', 'true');
    heading.append(sigil, names, arrow); button.append(heading, meters(faction));
    button.onclick = () => {
      selectedId = faction.id;
      for (const item of $('faction-list').children) item.setAttribute('aria-pressed', String(item === button));
      dossier($('details'), faction);
      if (!desktop.matches) { dossier($('modal-body'), faction, true); $('modal').showModal(); }
    };
    $('faction-list').append(button);
  }
}
$('search').oninput = renderList;
$('close').onclick = () => $('modal').close();
$('modal').addEventListener('click', event => { if (event.target === $('modal')) { const r = $('modal').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('modal').close(); } });
desktop.addEventListener('change', () => { if (desktop.matches) $('modal').close(); });
function validate(data, metrics) {
  if (!data || !Array.isArray(data.factions)) throw Error('Faction data must contain a factions array.');
  const ids = new Set();
  for (const faction of data.factions) {
    if (!faction || typeof faction.id !== 'string' || !faction.id.trim() || ids.has(faction.id) || typeof faction.name !== 'string' || !faction.name.trim()) throw Error('Each faction needs a unique ID and a name.');
    ids.add(faction.id);
    if (faction.censored !== undefined && typeof faction.censored !== 'boolean') throw Error('A faction’s censored flag must be true or false.');
    FactionMetrics.validateValues(faction, metrics);
    for (const field of ['symbol', 'category', 'blurb', 'contact', 'location']) if (faction[field] !== undefined && typeof faction[field] !== 'string') throw Error(`${faction.name}: ${field} must be text.`);
  }
  if (data.updatedAt !== undefined && typeof data.updatedAt !== 'string') throw Error('updatedAt must be text.');
  return data;
}
async function loadJSON(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw Error(`Could not load ${url} (HTTP ${response.status}).`);
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw Error(`Loading ${url} timed out. Try refreshing again.`);
    throw error;
  } finally { clearTimeout(timeout); }
}
function validateConfig(nextConfig) {
  if (!nextConfig || typeof nextConfig !== 'object' || Array.isArray(nextConfig)) throw Error('Site configuration must be a JSON object.');
  for (const key of ['title', 'campaign', 'subtitle', 'eyebrow']) {
    if (nextConfig[key] !== undefined && typeof nextConfig[key] !== 'string') throw Error(`${key} must be text in the site config.`);
  }
  if (nextConfig.text !== undefined && (!nextConfig.text || typeof nextConfig.text !== 'object' || Array.isArray(nextConfig.text))) throw Error('The text configuration must be an object.');
  for (const key of Object.keys(defaultText)) {
    if (nextConfig.text?.[key] !== undefined && typeof nextConfig.text[key] !== 'string') throw Error(`text.${key} must be text.`);
  }
  for (const key of ['headerIcon', 'factionIcon']) {
    const icon = nextConfig[key];
    if (icon === undefined) continue;
    if (!icon || typeof icon !== 'object' || Array.isArray(icon) || ['symbol', 'image'].some(field => icon[field] !== undefined && typeof icon[field] !== 'string')) throw Error(`${key} needs text symbol and image settings.`);
  }
  const appearance = nextConfig.appearance;
  if (appearance !== undefined && (!appearance || typeof appearance !== 'object' || Array.isArray(appearance) || (appearance.palette !== undefined && !themes.includes(appearance.palette)) || (appearance.mode !== undefined && !['dark', 'light'].includes(appearance.mode)))) throw Error('appearance needs a supported palette and dark or light mode.');
  const footerLink = nextConfig.footerLink;
  if (footerLink !== undefined) {
    if (!footerLink || typeof footerLink !== 'object' || Array.isArray(footerLink) || typeof footerLink.text !== 'string' || typeof footerLink.url !== 'string') throw Error('footerLink needs text and url strings.');
    if (footerLink.url) {
      let url;
      try { url = new URL(footerLink.url); } catch { throw Error('footerLink.url must be a full HTTP or HTTPS URL.'); }
      if (!['http:', 'https:'].includes(url.protocol)) throw Error('footerLink.url must use HTTP or HTTPS.');
    }
  }
  if (nextConfig.fonts !== undefined) {
    if (!nextConfig.fonts || typeof nextConfig.fonts !== 'object' || Array.isArray(nextConfig.fonts)) throw Error('fonts must be a settings object.');
    for (const [role, choice] of Object.entries(nextConfig.fonts)) {
      if (!Object.hasOwn(defaultFonts, role) || typeof choice !== 'string' || !Object.hasOwn(fontOptions, choice)) throw Error(`Invalid font setting: ${role}. Use a documented font option.`);
    }
  }
  const censorship = nextConfig.censorship;
  if (censorship !== undefined) {
    if (!censorship || typeof censorship !== 'object' || Array.isArray(censorship)) throw Error('censorship must be a settings object.');
    if (censorship.characters !== undefined && (typeof censorship.characters !== 'string' || new Set(Array.from(censorship.characters)).size < 2 || /\s/.test(censorship.characters))) throw Error('censorship.characters needs at least two distinct characters without whitespace.');
    if (censorship.intervalMs !== undefined && (!Number.isFinite(censorship.intervalMs) || censorship.intervalMs < 200 || censorship.intervalMs > 10000)) throw Error('censorship.intervalMs must be between 200 and 10000 milliseconds.');
    if (censorship.changeFraction !== undefined && (!Number.isFinite(censorship.changeFraction) || censorship.changeFraction <= 0 || censorship.changeFraction > 1)) throw Error('censorship.changeFraction must be greater than 0 and at most 1.');
    for (const [key, min, max] of [['characterWidthEm', .5, 2], ['letterSpacingEm', 0, .5]]) {
      if (censorship[key] !== undefined && (!Number.isFinite(censorship[key]) || censorship[key] < min || censorship[key] > max)) throw Error(`censorship.${key} must be between ${min} and ${max}.`);
    }
  }
}
async function refresh() {
  $('refresh').disabled = true; $('status').hidden = true; $('status').classList.remove('error'); $('status').textContent = copy('loading');
  try {
    const nextConfig = await loadJSON('assets/site-config.json');
    validateConfig(nextConfig);
    const nextMetrics = FactionMetrics.definitions(nextConfig);
    for (const metric of nextMetrics) {
      for (const color of [metric.color, ...metric.bands.map(band => band.color)]) {
        if (color === undefined) continue;
        const colors = typeof color === 'string' ? [color] : color && typeof color === 'object' ? [color.dark, color.light] : [];
        if (!colors.length || colors.some(value => typeof value !== 'string' || !value.trim() || !CSS.supports('color', value))) throw Error(`${metric.field}: color must be a CSS color or an object with dark and light colors.`);
      }
    }
    let loaded;
    if (nextConfig.dataSource === 'sheets') loaded = await FactionSheets.load(nextConfig.googleSheets, nextMetrics);
    else if (nextConfig.dataSource === 'json') {
      if (typeof nextConfig.dataUrl !== 'string' || !nextConfig.dataUrl.trim()) throw Error('The site configuration needs a dataUrl.');
      loaded = await loadJSON(nextConfig.dataUrl);
    } else throw Error('dataSource must be json or sheets.');
    const data = validate(loaded, nextMetrics);
    config = nextConfig; metricDefinitions = nextMetrics; factions = data.factions; updatedAt = data.updatedAt || '';
    applyConfig();
    restartScrambling();
    if (!factions.some(f => f.id === selectedId)) selectedId = factions[0]?.id || null;
    renderList(); const selected = factions.find(f => f.id === selectedId); dossier($('details'), selected);
    if ($('modal').open) { if (selected) dossier($('modal-body'), selected, true); else $('modal').close(); }
    $('last-updated').textContent = updatedAt ? copy('lastUpdated', {date: updatedAt}) : config.dataSource === 'sheets' ? copy('lastSynced', {date: new Date().toLocaleString()}) : '';
    $('status').textContent = '';
  } catch (error) {
    $('status').hidden = false;
    $('status').textContent = error.message + copy(factions.length ? 'previousData' : 'loadHelp');
    $('status').classList.add('error');
  } finally { $('refresh').disabled = false; }
}
$('refresh').onclick = refresh;
refresh();
