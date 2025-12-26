#!/usr/bin/env node

// Minimal build script to inject environment variables into index.html
// This runs during Vercel's build process

const fs = require('fs');
const path = require('path');

const envVars = {
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || '',
  API_BASE_URL: process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || ''
};

// Warn if required vars are missing
if (!envVars.SUPABASE_URL) {
  console.warn('⚠️  Warning: SUPABASE_URL is not set');
}
if (!envVars.SUPABASE_ANON_KEY) {
  console.warn('⚠️  Warning: SUPABASE_ANON_KEY is not set');
}
if (!envVars.API_BASE_URL) {
  console.warn('⚠️  Warning: API_BASE_URL is not set - video analysis will not work');
}

// Read index.html
const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Inject environment variables as a script tag before other scripts
const configScript = `
    <script>
        // Injected at build time from Vercel environment variables
        window.SUPABASE_URL = ${JSON.stringify(envVars.SUPABASE_URL)};
        window.SUPABASE_ANON_KEY = ${JSON.stringify(envVars.SUPABASE_ANON_KEY)};
        window.API_BASE_URL = ${JSON.stringify(envVars.API_BASE_URL)};
    </script>`;

// Insert before the first script tag
const scriptTagIndex = html.indexOf('<script');
if (scriptTagIndex !== -1) {
  html = html.slice(0, scriptTagIndex) + configScript + '\n    ' + html.slice(scriptTagIndex);
} else {
  // If no script tag found, insert before closing body tag
  html = html.replace('</body>', configScript + '\n</body>');
}

// Write back to index.html
fs.writeFileSync(indexPath, html, 'utf8');

console.log('✓ Environment variables injected into index.html');

