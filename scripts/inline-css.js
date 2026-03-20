const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'dist', 'styles.css'), 'utf8');

let output = html;

// Remove <script src="https://cdn.tailwindcss.com"></script>
output = output.replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\n?/, '');

// Remove <script>tailwind.config = {...}</script>
output = output.replace(/<script>\s*tailwind\.config\s*=\s*\{[\s\S]*?\}\s*<\/script>\n?/, '');

// Insert built CSS before </head>
const styleTag = `<style>${css}</style>\n`;
output = output.replace('</head>', styleTag + '</head>');

fs.writeFileSync(path.join(__dirname, '..', 'dist', 'index.html'), output, 'utf8');
console.log('Inlined CSS into dist/index.html');
