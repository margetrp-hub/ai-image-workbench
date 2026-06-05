import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dictionaries } from '../src/studio/i18n.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirs = ['src'];
const sourceExtensions = new Set(['.js', '.jsx']);

function flattenKeys(value, prefix = '', output = new Set()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) output.add(prefix);
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenKeys(child, nextPrefix, output);
  }

  return output;
}

function walkFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectLiteralTranslatorKeys(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const keys = [];
  const matcher = /\bt\(\s*(['"])([^'"]+)\1/g;
  let match;
  while ((match = matcher.exec(source))) {
    keys.push({
      key: match[2],
      file: path.relative(root, filePath).replaceAll(path.sep, '/')
    });
  }
  return keys;
}

const languageNames = Object.keys(dictionaries);
const flattenedByLanguage = new Map(
  languageNames.map((language) => [language, flattenKeys(dictionaries[language])])
);

const problems = [];
const referenceLanguage = 'zh-CN';
const referenceKeys = flattenedByLanguage.get(referenceLanguage);

if (!referenceKeys) {
  problems.push(`Missing reference language dictionary: ${referenceLanguage}`);
}

for (const language of languageNames) {
  if (language === referenceLanguage) continue;
  const keys = flattenedByLanguage.get(language);
  for (const key of referenceKeys || []) {
    if (!keys.has(key)) {
      problems.push(`${language} is missing key: ${key}`);
    }
  }
  for (const key of keys) {
    if (!referenceKeys?.has(key)) {
      problems.push(`${language} has extra key not present in ${referenceLanguage}: ${key}`);
    }
  }
}

const literalKeys = sourceDirs
  .flatMap((dir) => walkFiles(path.join(root, dir)))
  .flatMap(collectLiteralTranslatorKeys);

for (const { key, file } of literalKeys) {
  for (const language of languageNames) {
    if (!flattenedByLanguage.get(language)?.has(key)) {
      problems.push(`${file} calls t('${key}') but ${language} does not define it`);
    }
  }
}

if (problems.length) {
  console.error(`i18n key check failed with ${problems.length} problem(s):`);
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log(`i18n key check passed: ${languageNames.join(', ')} dictionaries cover ${literalKeys.length} literal t() calls.`);
