#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const GA_CODE = `<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','//www.google-analytics.com/analytics.js','ga');ga('create','__ID__','auto');ga('send','pageview');</script>`;

function getGoogleAnalyticsId() {
  if (process.env.NODE_ENV !== 'production') return undefined;
  require('dotenv').config();
  return process.env.GOOGLE_ANALYTICS_ID;
}

function main() {
  const htmlPath = path.resolve(__dirname, '..', 'html');
  const publicPath = path.resolve(__dirname, '..', 'public');

  const srcIndexHtmlPath = path.join(htmlPath, 'index.html');
  const destIndexHtmlPath = path.join(publicPath, 'index.html');

  const gaId = getGoogleAnalyticsId();
  if (gaId) {
    const content = fs.readFileSync(srcIndexHtmlPath, { encoding: 'utf-8' });
    const replaced = content.replace('</body>', GA_CODE.replace('__ID__', gaId) + '\n</body>');
    fs.writeFileSync(destIndexHtmlPath, replaced);
  } else {
    fs.copyFileSync(srcIndexHtmlPath, destIndexHtmlPath);
  }
}

main();
