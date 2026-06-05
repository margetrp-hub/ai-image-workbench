import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const publicFiles = [
  'public/cases.json',
  'public/inspirations.json',
  'public/inspiration-sources.json',
  'public/style-library.json'
];
const suspiciousPatterns = [
  /\uFFFD/,
  /锟/,
  /閳[^\n]*/,
  /閹[^\n]*/,
  /鏉[^\n]*/,
  /鐎[^\n]*/,
  /娑[^\n]*/,
  /涔[^\n]*/,
  /\?{4,}/
];

export function checkPublicData(options = {}) {
  const baseDir = options.baseDir || root;
  const prefix = Object.hasOwn(options, 'prefix') ? options.prefix : 'public';
  const failures = [];

  function dataPath(file) {
    return file.startsWith('public/') ? path.join(prefix, file.slice('public/'.length)).replace(/\\/g, '/') : file;
  }

  function readJson(file) {
    const archiveFile = dataPath(file);
    const absolute = path.join(baseDir, archiveFile);
    let body = '';
    try {
      body = fs.readFileSync(absolute, 'utf8');
    } catch (error) {
      failures.push(`${archiveFile}: cannot read file (${error.message})`);
      return null;
    }

    body.split(/\r?\n/).forEach((line, index) => {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(line)) {
          failures.push(`${archiveFile}:${index + 1}: suspicious encoding artifact: ${line.slice(0, 160)}`);
          break;
        }
      }
    });

    try {
      return JSON.parse(body);
    } catch (error) {
      failures.push(`${archiveFile}: invalid JSON (${error.message})`);
      return null;
    }
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function requireArray(file, data, key) {
    const archiveFile = dataPath(file);
    if (!Array.isArray(data?.[key])) {
      failures.push(`${archiveFile}: ${key} must be an array.`);
      return [];
    }
    return data[key];
  }

  function requireLocalized(file, value, pathLabel) {
    const archiveFile = dataPath(file);
    if (!isPlainObject(value) || typeof value.en !== 'string' || typeof value.zh !== 'string') {
      failures.push(`${archiveFile}: ${pathLabel} must include { en, zh } strings.`);
    }
  }

  function requireNoBundledImage(file, item, pathLabel) {
    const archiveFile = dataPath(file);
    for (const key of ['image', 'thumbnail', 'cover']) {
      const value = String(item?.[key] || '').trim();
      if (!value) continue;
      if (!/^https?:\/\//i.test(value) && !value.startsWith('/studio-api/')) {
        failures.push(`${archiveFile}: ${pathLabel}.${key} should stay empty, remote, or protected API-backed in the open starter data.`);
      }
    }
  }

  const casesData = readJson('public/cases.json');
  const inspirationsData = readJson('public/inspirations.json');
  const inspirationSourcesData = readJson('public/inspiration-sources.json');
  const styleLibrary = readJson('public/style-library.json');

  for (const file of publicFiles) {
    const archiveFile = dataPath(file);
    const absolute = path.join(baseDir, archiveFile);
    if (!fs.existsSync(absolute)) failures.push(`${archiveFile}: missing required public data file.`);
  }

  if (casesData) {
    if (casesData.license?.spdx !== 'CC-BY-4.0') {
      failures.push(`${dataPath('public/cases.json')}: license.spdx must be CC-BY-4.0 for community prompt templates.`);
    }
    if (!String(casesData.license?.notice || '').includes('CC BY 4.0')) {
      failures.push(`${dataPath('public/cases.json')}: license.notice must mention CC BY 4.0.`);
    }

    const cases = requireArray('public/cases.json', casesData, 'cases');
    const categories = requireArray('public/cases.json', casesData, 'categories');
    const styles = requireArray('public/cases.json', casesData, 'styles');
    const scenes = requireArray('public/cases.json', casesData, 'scenes');

    if (cases.length > 50) {
      failures.push(`${dataPath('public/cases.json')}: starter cases should remain lightweight; move large private libraries behind /studio-api/library.`);
    }
    cases.forEach((item, index) => {
      const label = `cases[${index}]`;
      if (!item.id) failures.push(`${dataPath('public/cases.json')}: ${label}.id is required.`);
      if (!item.title) failures.push(`${dataPath('public/cases.json')}: ${label}.title is required.`);
      if (!item.prompt) failures.push(`${dataPath('public/cases.json')}: ${label}.prompt is required.`);
      if (!categories.includes(item.category)) failures.push(`${dataPath('public/cases.json')}: ${label}.category must exist in categories.`);
      for (const style of item.styles || []) if (!styles.includes(style)) failures.push(`${dataPath('public/cases.json')}: ${label}.styles contains unknown style ${style}.`);
      for (const scene of item.scenes || []) if (!scenes.includes(scene)) failures.push(`${dataPath('public/cases.json')}: ${label}.scenes contains unknown scene ${scene}.`);
      requireNoBundledImage('public/cases.json', item, label);
    });
  }

  if (inspirationsData) {
    requireArray('public/inspirations.json', inspirationsData, 'sources');
    requireArray('public/inspirations.json', inspirationsData, 'sourceCounts');
    requireArray('public/inspirations.json', inspirationsData, 'categories');
    const cases = requireArray('public/inspirations.json', inspirationsData, 'cases');
    requireArray('public/inspirations.json', inspirationsData, 'errors');
    if (cases.length > 100) {
      failures.push(`${dataPath('public/inspirations.json')}: starter inspiration data should remain lightweight; use protected library data for large collections.`);
    }
    cases.forEach((item, index) => requireNoBundledImage('public/inspirations.json', item, `cases[${index}]`));
  }

  if (inspirationSourcesData) {
    requireArray('public/inspiration-sources.json', inspirationSourcesData, 'sources').forEach((item, index) => {
      if (!item.id) failures.push(`${dataPath('public/inspiration-sources.json')}: sources[${index}].id is required.`);
      if (!item.sourceName) failures.push(`${dataPath('public/inspiration-sources.json')}: sources[${index}].sourceName is required.`);
      if (!item.sourceUrl) failures.push(`${dataPath('public/inspiration-sources.json')}: sources[${index}].sourceUrl is required.`);
      if (!item.license) failures.push(`${dataPath('public/inspiration-sources.json')}: sources[${index}].license is required.`);
    });
  }

  if (styleLibrary) {
    if (styleLibrary.templateDocument !== 'docs/templates.md') {
      failures.push(`${dataPath('public/style-library.json')}: templateDocument must point to docs/templates.md.`);
    }

    const categories = requireArray('public/style-library.json', styleLibrary, 'categories');
    requireArray('public/style-library.json', styleLibrary, 'styles');
    requireArray('public/style-library.json', styleLibrary, 'scenes');
    const templates = requireArray('public/style-library.json', styleLibrary, 'templates');
    const categoryValues = new Set(categories.map((item) => item.value));

    if (templates.length > 80) {
      failures.push(`${dataPath('public/style-library.json')}: starter template library should remain lightweight.`);
    }

    categories.forEach((item, index) => {
      requireLocalized('public/style-library.json', item.title, `categories[${index}].title`);
      requireLocalized('public/style-library.json', item.description, `categories[${index}].description`);
      requireNoBundledImage('public/style-library.json', item, `categories[${index}]`);
    });

    templates.forEach((item, index) => {
      const label = `templates[${index}]`;
      if (!item.id) failures.push(`${dataPath('public/style-library.json')}: ${label}.id is required.`);
      if (!categoryValues.has(item.category)) failures.push(`${dataPath('public/style-library.json')}: ${label}.category must exist in categories.`);
      requireLocalized('public/style-library.json', item.title, `${label}.title`);
      requireLocalized('public/style-library.json', item.description, `${label}.description`);
      requireLocalized('public/style-library.json', item.useWhen, `${label}.useWhen`);
      if (!Array.isArray(item.guidance?.en) || !Array.isArray(item.guidance?.zh)) {
        failures.push(`${dataPath('public/style-library.json')}: ${label}.guidance must include en/zh arrays.`);
      }
      if (!Array.isArray(item.pitfalls?.en) || !Array.isArray(item.pitfalls?.zh)) {
        failures.push(`${dataPath('public/style-library.json')}: ${label}.pitfalls must include en/zh arrays.`);
      }
      requireNoBundledImage('public/style-library.json', item, label);
    });
  }

  return failures;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  const failures = checkPublicData();
  if (failures.length) {
    console.error(`Public data check failed:\n${failures.map((item) => `- ${item}`).join('\n')}`);
    process.exit(1);
  }
  console.log('Public data check passed.');
}
