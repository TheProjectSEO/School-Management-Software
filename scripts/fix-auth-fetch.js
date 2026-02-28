/**
 * Script: fix-auth-fetch.js
 * Replaces all plain fetch('/api/...) calls with authFetch('/api/...) in
 * dashboard pages and components. Adds the authFetch import to each modified file.
 *
 * Run: node scripts/fix-auth-fetch.js
 */

const fs = require('fs');
const path = require('path');

const IMPORT_LINE = `import { authFetch } from "@/lib/utils/authFetch";`;

const TARGET_DIRS = [
  'app/(dashboard)',
  'components',
];

const EXTENSIONS = ['.tsx', '.ts'];

// Files to skip (server-only, not client components)
const SKIP_FILES = [
  // None currently known, but add here if needed
];

function getAllFiles(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function addImport(content, importLine) {
  if (content.includes(importLine)) return content; // already there
  const lines = content.split('\n');

  // Find last import line index
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) {
      lastImportIdx = i;
    }
  }

  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine);
  } else {
    // No imports found — insert after 'use client' if present, else top
    const useClientIdx = lines.findIndex(l => l.trim() === "'use client'" || l.trim() === '"use client"');
    if (useClientIdx >= 0) {
      lines.splice(useClientIdx + 1, 0, '', importLine);
    } else {
      lines.unshift(importLine);
    }
  }

  return lines.join('\n');
}

function processFile(filePath) {
  // Skip server-only files
  if (SKIP_FILES.some(skip => filePath.includes(skip))) return false;

  let content = fs.readFileSync(filePath, 'utf8');

  // Quick check: does the file have any plain fetch('/api/ calls?
  const hasFetchApi = (
    content.includes("fetch('/api/") ||
    content.includes('fetch("/api/') ||
    content.includes('fetch(`/api/')
  );

  if (!hasFetchApi) return false;

  // Already has authFetch completely (imported and used)
  // We still want to replace any remaining plain fetch('/api/ calls
  const alreadyImported = content.includes("from \"@/lib/utils/authFetch\"") ||
                           content.includes("from '@/lib/utils/authFetch'");

  // Replace: fetch('/api/ → authFetch('/api/
  // Replace: fetch("/api/ → authFetch("/api/
  // Replace: fetch(`/api/ → authFetch(`/api/
  // Use word boundary to avoid double-replacing authFetch calls
  let newContent = content
    .replace(/(?<!\w)fetch\('\/api\//g, "authFetch('/api/")
    .replace(/(?<!\w)fetch\("\/api\//g, 'authFetch("/api/')
    .replace(/(?<!\w)fetch\(`\/api\//g, 'authFetch(`/api/');

  if (newContent === content) return false;

  // Add import if not already present
  if (!alreadyImported) {
    newContent = addImport(newContent, IMPORT_LINE);
  }

  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

// Main
let totalModified = 0;
const modifiedFiles = [];

for (const dir of TARGET_DIRS) {
  const files = getAllFiles(dir, EXTENSIONS);
  for (const file of files) {
    try {
      if (processFile(file)) {
        modifiedFiles.push(file);
        totalModified++;
        console.log(`✓ ${file}`);
      }
    } catch (err) {
      console.error(`✗ Error processing ${file}: ${err.message}`);
    }
  }
}

console.log(`\n========================================`);
console.log(`Total files modified: ${totalModified}`);
console.log(`========================================`);
if (modifiedFiles.length > 0) {
  console.log('\nModified files:');
  modifiedFiles.forEach(f => console.log(`  - ${f}`));
}
