'use strict';
(function (root) {
  const defaults = [
    { field: 'awareness', name: 'Awareness', min: 0, max: 100, suffix: '%', showPlus: false, color: 'var(--accent)', bands: [
      { max: 0, label: 'Unaware' }, { max: 25, exclusive: true, label: 'Rumors' },
      { max: 50, exclusive: true, label: 'Noticed' }, { max: 75, exclusive: true, label: 'Familiar' },
      { max: 90, exclusive: true, label: 'Watching' }, { max: 100, label: 'Closely watching' }
    ] },
    { field: 'opinion', name: 'Opinion', min: -100, max: 100, baseline: 0, suffix: '', showPlus: true, color: 'var(--muted)', bands: [
      { max: -75, label: 'Hostile', color: 'var(--danger)' }, { max: -25, label: 'Unfriendly', color: 'var(--danger)' },
      { max: 25, exclusive: true, label: 'Neutral', color: 'var(--muted)' },
      { max: 75, exclusive: true, label: 'Friendly', color: 'var(--success)' }, { max: 100, label: 'Allied', color: 'var(--success)' }
    ] }
  ];
  function definitions(config) {
    let metrics = config.metrics;
    if (metrics === undefined) {
      metrics = structuredClone(defaults);
      // Older configs continue to use their customized meter copy.
      metrics.forEach(metric => {
        const text = config.text || {};
        if (typeof text[metric.field] === 'string') metric.name = text[metric.field];
        const labels = text[metric.field + 'Labels'];
        if (Array.isArray(labels) && labels.length === metric.bands.length && labels.every(label => typeof label === 'string')) metric.bands.forEach((band, i) => { band.label = labels[i]; });
      });
    }
    if (!Array.isArray(metrics) || !metrics.length) throw Error('metrics must contain at least one meter definition.');
    const fields = new Set(), reserved = ['id', 'name', 'symbol', 'category', 'blurb', 'contact', 'location', 'censored', 'updatedAt', '__proto__', 'constructor', 'prototype'];
    for (const metric of metrics) {
      if (!metric || typeof metric.field !== 'string' || !/^[a-zA-Z][\w-]*$/.test(metric.field) || reserved.includes(metric.field) || fields.has(metric.field)) throw Error('Each metric needs a unique field that does not replace a faction text field.');
      fields.add(metric.field);
      if (typeof metric.name !== 'string' || !metric.name.trim()) throw Error(`${metric.field}: supply a meter name.`);
      if (!Number.isFinite(metric.min) || !Number.isFinite(metric.max) || metric.min >= metric.max || !Number.isFinite(metric.max - metric.min)) throw Error(`${metric.field}: min must be less than max with a finite range.`);
      if (metric.baseline !== undefined && metric.baseline !== null && (!Number.isFinite(metric.baseline) || metric.baseline <= metric.min || metric.baseline >= metric.max)) throw Error(`${metric.field}: baseline must be inside the meter range.`);
      if (metric.suffix !== undefined && typeof metric.suffix !== 'string') throw Error(`${metric.field}: suffix must be text.`);
      if (metric.showPlus !== undefined && typeof metric.showPlus !== 'boolean') throw Error(`${metric.field}: showPlus must be true or false.`);
      if (!Array.isArray(metric.bands) || !metric.bands.length) throw Error(`${metric.field}: supply at least one band.`);
      let previous = -Infinity;
      for (const band of metric.bands) {
        if (!band || !Number.isFinite(band.max) || band.max < metric.min || band.max > metric.max || band.max <= previous || typeof band.label !== 'string' || (band.exclusive !== undefined && typeof band.exclusive !== 'boolean')) throw Error(`${metric.field}: bands need ascending max values within the range and text labels.`);
        previous = band.max;
      }
      const last = metric.bands.at(-1);
      if (last.max !== metric.max || last.exclusive) throw Error(`${metric.field}: the last band must include the meter's max.`);
    }
    return metrics;
  }
  function band(metric, value) { return metric.bands.find(item => item.exclusive ? value < item.max : value <= item.max); }
  function formatted(metric, value) { return `${metric.showPlus && value > 0 ? '+' : ''}${value}${metric.suffix || ''}`; }
  function validateValues(faction, metrics) {
    for (const metric of metrics) {
      const value = faction[metric.field];
      if (!Number.isFinite(value) || value < metric.min || value > metric.max) throw Error(`${faction.name}: ${metric.field} must be between ${metric.min} and ${metric.max}.`);
    }
  }
  const api = { defaults, definitions, band, formatted, validateValues };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FactionMetrics = api;
})(globalThis);
