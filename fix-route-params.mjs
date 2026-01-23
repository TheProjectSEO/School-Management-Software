#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

console.log('🔧 Fixing Next.js 16 async params in route handlers...\n');

// Find all route files with dynamic params
const files = glob.sync('apps/teacher/app/api/**/[*]/route.ts');

console.log(`Found ${files.length} route files to update:\n`);

let fixed = 0;
let skipped = 0;
let errors = 0;

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf-8');
    let modified = false;

    // Pattern 1: Fix interface RouteParams with params object
    const interfacePattern = /interface\s+(\w+)\s*\{[\s\S]*?params:\s*\{/g;
    if (interfacePattern.test(content)) {
      content = content.replace(
        /(interface\s+\w+\s*\{[\s\S]*?)params:\s*\{/g,
        '$1params: Promise<{'
      );
      modified = true;
    }

    // Pattern 2: Fix context params extraction
    const extractPattern = /const\s*\{\s*(\w+(?:,\s*\w+)*)\s*\}\s*=\s*params(?!\.)(?!\s*\()/g;
    if (extractPattern.test(content)) {
      content = content.replace(
        /const\s*\{\s*(\w+(?:,\s*\w+)*)\s*\}\s*=\s*params(?!\.)(?!\s*\()/g,
        'const { $1 } = await params'
      );
      modified = true;
    }

    // Pattern 3: Fix direct params.id usage (without destructuring)
    const directPattern = /(?<!await\s+)params\.(\w+)/g;
    if (directPattern.test(content)) {
      content = content.replace(
        /(?<!await\s+)params\.(\w+)/g,
        '(await params).$1'
      );
      modified = true;
    }

    if (modified) {
      writeFileSync(file, content, 'utf-8');
      console.log(`✅ Fixed: ${file}`);
      fixed++;
    } else {
      console.log(`⏭️  Skipped (no changes needed): ${file}`);
      skipped++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
    errors++;
  }
}

console.log('\n' + '='.repeat(50));
console.log(`📊 Summary:`);
console.log(`   ✅ Fixed: ${fixed}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`   ❌ Errors: ${errors}`);
console.log('='.repeat(50));

if (fixed > 0) {
  console.log('\n✨ All route handlers updated for Next.js 16!');
  console.log('💡 Run "npm run build" to verify the changes.');
} else {
  console.log('\nℹ️  No files needed updating.');
}
