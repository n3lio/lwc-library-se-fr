'use strict';

const path = require('node:path');
const fastify = require('fastify');

const app = fastify({ logger: true, trustProxy: true });
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const SITE_DIR = path.join(__dirname, '_site');
const ZIPS_DIR = path.join(__dirname, '_zips');

app.register(require('@fastify/static'), {
  root: SITE_DIR,
  prefix: '/',
  index: ['index.html'],
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=300');
    } else if (/\.(css|js|png|jpg|jpeg|gif|webp|svg|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
});

app.register(require('@fastify/static'), {
  root: ZIPS_DIR,
  prefix: '/zips/',
  decorateReply: false,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.zip')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    }
  },
});

app.get('/healthz', async () => ({ status: 'ok', time: new Date().toISOString() }));

app.setNotFoundHandler((req, reply) => {
  reply.code(404).type('text/html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>404 — SE FR Library</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0a0e2a;color:#e6e9ff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}h1{font-size:6rem;margin:0;background:linear-gradient(135deg,#6c63ff,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}p{opacity:.7;margin:1rem 0 2rem}a{color:#6c63ff;text-decoration:none;font-weight:600}</style>
</head><body><div><h1>404</h1><p>Page introuvable</p><a href="/">← Retour à la librairie</a></div></body></html>`);
});

app.listen({ port: PORT, host: HOST }).then(() => {
  app.log.info(`SE FR Library site listening on ${HOST}:${PORT}`);
}).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
