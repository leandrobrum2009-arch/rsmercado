import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

console.log('🔍 Checking imports...');

const files = globSync('src/**/*.{ts,tsx}');
let errors = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  // Match relative imports
  const importRegex = /from ['"](\.?\.?\/[^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const dir = path.dirname(file);
      const fullPath = path.resolve(dir, importPath);
      
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
      let found = false;
      
      for (const ext of extensions) {
        const p = fullPath + ext;
        if (fs.existsSync(p)) {
          if (fs.lstatSync(p).isFile()) {
            found = true;
            break;
          }
          if (fs.lstatSync(p).isDirectory()) {
             if (fs.existsSync(path.join(p, 'index.ts')) || fs.existsSync(path.join(p, 'index.tsx'))) {
               found = true;
               break;
             }
          }
        }
      }

      if (!found) {
        console.error(`❌ Broken import in ${file}: "${importPath}" not found.`);
        errors++;
      }
    }
  }
});

if (errors === 0) {
  console.log('✅ All relative imports resolved correctly.');
  process.exit(0);
} else {
  console.error(`\nFound ${errors} broken imports.`);
  process.exit(1);
}
