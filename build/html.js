#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const GA_CODE = `<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','//www.google-analytics.com/analytics.js','ga');ga('create','__ID__','auto');ga('send','pageview');</script>`;

function getVersion() {
  const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
  const content = fs.readFileSync(packageJsonPath, { encoding: 'utf-8' });
  const packageInfo = JSON.parse(content);
  return packageInfo.version;
}

function setVersion(html) {
  const version = getVersion();
  if (!version) return html;
  const replaced = html.replace('__VERSION__', 'v' + version);
  return replaced;
}

function getGoogleAnalyticsId() {
  if (process.env.NODE_ENV !== 'production') return undefined;
  require('dotenv').config();
  return process.env.GOOGLE_ANALYTICS_ID;
}

function setGoogleAnalyticsId(html) {
  const gaId = getGoogleAnalyticsId();
  if (!gaId) return html;
  const replaced = html.replace('</body>', GA_CODE.replace('__ID__', gaId) + '\n</body>');
  return replaced;
}

function main() {
  const htmlPath = path.resolve(__dirname, '..', 'html');
  const publicPath = path.resolve(__dirname, '..', 'public');

  const srcIndexHtmlPath = path.join(htmlPath, 'index.html');
  const destIndexHtmlPath = path.join(publicPath, 'index.html');

  let html = fs.readFileSync(srcIndexHtmlPath, { encoding: 'utf-8' });
  html = setVersion(html);
  html = setGoogleAnalyticsId(html);
  fs.writeFileSync(destIndexHtmlPath, html);
}

main();
