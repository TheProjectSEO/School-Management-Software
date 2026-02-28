/**
 * Script: fix-auth-fetch-v2.js
 * Fixes misplaced authFetch imports and ensures they are placed correctly.
 *
 * Run: node scripts/fix-auth-fetch-v2.js
 */

const fs = require('fs');
const path = require('path');

const IMPORT_LINE = `import { authFetch } from "@/lib/utils/authFetch";`;
const AUTH_FETCH_IMPORT_REGEX = /^import \{ authFetch \} from "@\/lib\/utils\/authFetch";\r?\n?/gm;

const TARGET_DIRS = [
  'app/(dashboard)',
  'components',
];
const EXTENSIONS = ['.tsx', '.ts'];

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

/**
 * Find the line index (0-based) of the LAST line of the LAST import statement,
 * correctly handling multi-line imports like:
 *   import {
 *     Foo,
 *     Bar,
 *   } from 'baz';
 */
function findLastImportEndLine(lines) {
  let lastImportEnd = -1;
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Skip use-client directive and blank lines before imports
    if (trimmed === "'use client'" || trimmed === '"use client"') {
      i++;
      continue;
    }

    if (trimmed.startsWith('import ')) {
      // Multi-line import: has opening { but no closing }
      if (trimmed.includes('{') && !trimmed.includes('}')) {
        // Find the closing } from '...' line
        let j = i + 1;
        while (j < lines.length) {
          if (/^\s*\}/.test(lines[j]) && lines[j].includes('from')) {
            lastImportEnd = j;
            i = j + 1;
            break;
          }
          j++;
        }
        if (j >= lines.length) {
          // Didn't find the close — treat single line
          lastImportEnd = i;
          i++;
        }
      } else {
        // Single-line import (import x from '...' or import 'side-effect')
        lastImportEnd = i;
        i++;
      }
    } else if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      // Blank lines / comments — might be between imports, keep scanning
      i++;
    } else {
      // Non-import, non-blank — we've left the import section
      break;
    }
  }

  return lastImportEnd;
}

/**
 * Remove ALL existing authFetch import lines from content (including any
 * misplaced ones inside multi-line imports).
 */
function removeAuthFetchImport(content) {
  return content.replace(AUTH_FETCH_IMPORT_REGEX, '');
}

/**
 * Add the authFetch import at the correct location — after the last complete
 * import statement in the file.
 */
function addAuthFetchImport(content) {
  if (content.includes(IMPORT_LINE)) return content; // already present correctly

  const lines = content.split('\n');
  const lastImportEnd = findLastImportEndLine(lines);

  if (lastImportEnd >= 0) {
    lines.splice(lastImportEnd + 1, 0, IMPORT_LINE);
  } else {
    // No imports found — insert after 'use client' if present, else at top
    const useClientIdx = lines.findIndex(l => l.trim() === "'use client'" || l.trim() === '"use client"');
    if (useClientIdx >= 0) {
      lines.splice(useClientIdx + 1, 0, '', IMPORT_LINE);
    } else {
      lines.unshift(IMPORT_LINE);
    }
  }

  return lines.join('\n');
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Only process files that contain authFetch (were already modified by v1)
  // or still have plain fetch('/api/ calls
  const hasAuthFetch = content.includes('authFetch(');
  const hasFetchApi = (
    content.includes("fetch('/api/") ||
    content.includes('fetch("/api/') ||
    content.includes('fetch(`/api/')
  );

  if (!hasAuthFetch && !hasFetchApi) return false;

  // Step 1: Replace any remaining plain fetch('/api/ calls
  let newContent = content
    .replace(/(?<!\w)fetch\('\/api\//g, "authFetch('/api/")
    .replace(/(?<!\w)fetch\("\/api\//g, 'authFetch("/api/')
    .replace(/(?<!\w)fetch\(`\/api\//g, 'authFetch(`/api/');

  // Step 2: Remove ALL existing authFetch imports (including misplaced ones)
  newContent = removeAuthFetchImport(newContent);

  // Step 3: Re-add authFetch import at the correct position
  newContent = addAuthFetchImport(newContent);

  if (newContent === content) return false;

  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

// Main
let totalModified = 0;

for (const dir of TARGET_DIRS) {
  const files = getAllFiles(dir, EXTENSIONS);
  for (const file of files) {
    try {
      if (processFile(file)) {
        totalModified++;
        console.log(`✓ ${file}`);
      }
    } catch (err) {
      console.error(`✗ Error processing ${file}: ${err.message}`);
    }
  }
}

console.log(`\n========================================`);
console.log(`Total files processed: ${totalModified}`);
console.log(`========================================`);
