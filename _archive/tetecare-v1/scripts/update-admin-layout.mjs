import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const pagesDir = 'client/src/pages';
const files = readdirSync(pagesDir).filter(f => f.startsWith('Admin') && f.endsWith('.tsx'));

let updatedCount = 0;

files.forEach(file => {
  const filePath = join(pagesDir, file);
  let content = readFileSync(filePath, 'utf8');

  const originalContent = content;

  // Replace import statement
  content = content.replace(
    /import\s+.*DashboardLayout.*\s+from\s+["']@\/components\/DashboardLayout["'];?/g,
    'import AdminLayout from "@/components/AdminLayout";'
  );

  // Replace component usage
  content = content.replace(/<DashboardLayout>/g, '<AdminLayout>');
  content = content.replace(/<\/DashboardLayout>/g, '</AdminLayout>');

  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${file}`);
    updatedCount++;
  }
});

console.log(`\nTotal files updated: ${updatedCount}`);
