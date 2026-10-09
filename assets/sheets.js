'use strict';
(function (root) {
  function parseCSV(text) {
    const rows = []; let row = [], field = '', quoted = false, closed = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { quoted = false; closed = true; }
        } else field += ch;
      } else if (ch === ',' || ch === '\n' || ch === '\r') {
        row.push(field); field = ''; closed = false;
        if (ch !== ',') { rows.push(row); row = []; if (ch === '\r' && text[i + 1] === '\n') i++; }
      } else if (ch === '"' && !field && !closed) quoted = true;
      else {
        if (closed || ch === '"') throw Error('Invalid CSV quoting in Google Sheets data.');
        field += ch;
      }
    }
    if (quoted) throw Error('Unclosed quote in Google Sheets data.');
    if (field || row.length || closed) { row.push(field); rows.push(row); }
    return rows;
  }
  function convert(text, metrics = [{field: 'awareness'}, {field: 'opinion'}]) {
    const rows = parseCSV(text);
    const headers = (rows.shift() || []).map(value => value.trim());
    const numericFields = metrics.map(metric => metric.field);
    for (const key of ['id', 'name', ...numericFields]) {
      if (headers.filter(header => header === key).length !== 1) throw Error(`Google Sheets needs exactly one ${key} column in its first row.`);
    }
    if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) throw Error('Google Sheets contains duplicate column headers.');
    const fields = ['id', 'name', 'symbol', 'category', 'blurb', 'contact', 'location', ...numericFields];
    let updatedAt = '';
    const factions = [];
    rows.forEach((row, index) => {
      if (row.every(value => !value.trim())) return;
      const faction = {};
      const censoredColumn = headers.indexOf('censored');
      const censoredValue = censoredColumn < 0 ? '' : (row[censoredColumn] || '').trim().toLowerCase();
      if (!['', 'true', 'false'].includes(censoredValue)) throw Error(`Google Sheets row ${index + 2}: censored must be TRUE, FALSE, or blank.`);
      faction.censored = censoredValue === 'true';
      for (const key of fields) {
        const column = headers.indexOf(key), value = column < 0 ? '' : row[column] || '';
        if (numericFields.includes(key)) {
          if (!value.trim() || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) throw Error(`Google Sheets row ${index + 2}: ${key} must be a plain number.`);
          faction[key] = Number(value);
        } else faction[key] = key === 'blurb' ? value : value.trim();
      }
      const dateColumn = headers.indexOf('updatedAt');
      if (!updatedAt && dateColumn >= 0) updatedAt = (row[dateColumn] || '').trim();
      factions.push(faction);
    });
    return { factions, updatedAt };
  }
  function url(settings) {
    if (!settings || typeof settings.spreadsheetId !== 'string' || !/^[\w-]+$/.test(settings.spreadsheetId)) throw Error('Google Sheets configuration needs a spreadsheetId.');
    const result = new URL(`https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}/gviz/tq`);
    result.searchParams.set('tqx', 'out:csv');
    if (typeof settings.sheet === 'string' && settings.sheet.trim()) result.searchParams.set('sheet', settings.sheet.trim());
    else if (settings.gid !== undefined && settings.gid !== '') {
      if (!/^\d+$/.test(String(settings.gid))) throw Error('Google Sheets gid must be a numeric tab ID.');
      result.searchParams.set('gid', String(settings.gid));
    }
    return result.href;
  }
  async function load(settings, metrics) {
    const endpoint = url(settings), controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint, { credentials: 'omit', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw Error(`Google Sheets returned HTTP ${response.status}.`);
      const text = await response.text();
      if (/^\s*</.test(text)) throw Error('Google Sheets returned a sign-in page instead of faction data.');
      return convert(text, metrics);
    } catch (error) {
      throw Error(`${error.name === 'AbortError' ? 'Google Sheets request timed out.' : error.message} Check that the sheet allows public viewer access and the selected tab has the faction headers.`);
    } finally { clearTimeout(timeout); }
  }
  const api = { parseCSV, convert, url, load };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FactionSheets = api;
})(globalThis);
