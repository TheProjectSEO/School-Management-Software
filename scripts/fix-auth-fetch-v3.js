/**
 * Script: fix-auth-fetch-v3.js
 * Deduplicates authFetch imports — keeps only one (single-quote form preferred).
 * Also fixes any remaining misplaced imports.
 *
 * Run: node scripts/fix-auth-fetch-v3.js
 */

const fs = require('fs');
const path = require('path');

const DOUBLE_QUOTE_IMPORT = `import { authFetch } from "@/lib/utils/authFetch";`;
const SINGLE_QUOTE_IMPORT = `import { authFetch } from '@/lib/utils/authFetch'`;

// Matches both quote styles, with or without semicolon
const AUTH_FETCH_ANY_REGEX = /^import \{ authFetch \} from ['"]@\/lib\/utils\/authFetch['"];?\r?\n/gm;

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

function countOccurrences(content, pattern) {
  return (content.match(pattern) || []).length;
}

function findLastImportEndLine(lines) {
  let lastImportEnd = -1;
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed === "'use client'" || trimmed === '"use client"') {
      i++;
      continue;
    }

    if (trimmed.startsWith('import ')) {
      if (trimmed.includes('{') && !trimmed.includes('}')) {
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
          lastImportEnd = i;
          i++;
        }
      } else {
        lastImportEnd = i;
        i++;
      }
    } else if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      i++;
    } else {
      break;
    }
  }

  return lastImportEnd;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Count existing authFetch imports (any quote style)
  const occurrences = countOccurrences(content, /import \{ authFetch \} from ['"]@\/lib\/utils\/authFetch['"]/g);

  // Also check for remaining plain fetch('/api/ calls
  const hasFetchApi = (
    content.includes("fetch('/api/") ||
    content.includes('fetch("/api/') ||
    content.includes('fetch(`/api/')
  );

  if (occurrences === 0 && !hasFetchApi) return false;

  // Step 1: Replace any remaining plain fetch('/api/ calls
  let newContent = content
    .replace(/(?<!\w)fetch\('\/api\//g, "authFetch('/api/")
    .replace(/(?<!\w)fetch\("\/api\//g, 'authFetch("/api/')
    .replace(/(?<!\w)fetch\(`\/api\//g, 'authFetch(`/api/');

  // Step 2: If there are duplicates (or 0), fix them
  const currentOccurrences = countOccurrences(newContent, /import \{ authFetch \} from ['"]@\/lib\/utils\/authFetch['"]/g);

  if (currentOccurrences > 1) {
    // Remove ALL authFetch imports
    newContent = newContent.replace(AUTH_FETCH_ANY_REGEX, '');

    // Re-add exactly one import at the correct position
    const lines = newContent.split('\n');
    const lastImportEnd = findLastImportEndLine(lines);
    if (lastImportEnd >= 0) {
      lines.splice(lastImportEnd + 1, 0, DOUBLE_QUOTE_IMPORT);
    } else {
      const useClientIdx = lines.findIndex(l => l.trim() === "'use client'" || l.trim() === '"use client"');
      if (useClientIdx >= 0) {
        lines.splice(useClientIdx + 1, 0, '', DOUBLE_QUOTE_IMPORT);
      } else {
        lines.unshift(DOUBLE_QUOTE_IMPORT);
      }
    }
    newContent = lines.join('\n');
  } else if (currentOccurrences === 0) {
    // No import yet — add one
    const lines = newContent.split('\n');
    const lastImportEnd = findLastImportEndLine(lines);
    if (lastImportEnd >= 0) {
      lines.splice(lastImportEnd + 1, 0, DOUBLE_QUOTE_IMPORT);
    } else {
      const useClientIdx = lines.findIndex(l => l.trim() === "'use client'" || l.trim() === '"use client"');
      if (useClientIdx >= 0) {
        lines.splice(useClientIdx + 1, 0, '', DOUBLE_QUOTE_IMPORT);
      } else {
        lines.unshift(DOUBLE_QUOTE_IMPORT);
      }
    }
    newContent = lines.join('\n');
  }
  // else exactly 1 occurrence — leave it

  if (newContent === content) return false;

  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

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
