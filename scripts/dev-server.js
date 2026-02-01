import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const clean = decoded.split('?')[0].split('#')[0];
  const candidate = path.normalize(path.join(root, clean));
  if (!candidate.startsWith(root)) return null;
  return candidate;
}

async function handleApiJsonPost(req, res, apiRelPath) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 2_000_000) {
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Payload too large' }));
      req.destroy();
    }
  });

  req.on('end', async () => {
    try {
      req.body = body ? JSON.parse(body) : {};
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    try {
      const apiModulePath = path.join(ROOT, ...apiRelPath);
      const apiModuleUrl = pathToFileURL(apiModulePath);
      // Cache-bust pour éviter un module figé pendant le dev
      const { default: handler } = await import(`${apiModuleUrl.href}?t=${Date.now()}`);
      await handler(req, res);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Local API error', details: String(e?.message || e) }));
    }
  });
}

async function handleApiFill(req, res) {
  return handleApiJsonPost(req, res, ['src', 'api', 'fill.js']);
}

async function handleApiProjetDeViePremium(req, res) {
  return handleApiJsonPost(req, res, ['src', 'api', 'projet-de-vie-premium.js']);
}

async function handleApiProjetDeVie(req, res) {
  return handleApiJsonPost(req, res, ['src', 'api', 'projet-de-vie.js']);
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });
  
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  
  stream.on('error', (err) => {
    console.error('Error reading file:', filePath, err);
    res.writeHead(500);
    res.end('Internal Server Error');
  });
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  let urlPath = req.url.split('?')[0]; // Ignorer les paramètres de requête

  // Gestion des routes principales
  if (urlPath === '/' || urlPath === '' || urlPath === '/index.html') {
    const indexPath = path.join(ROOT, 'src/pages/index.html');
    if (fs.existsSync(indexPath)) {
      serveFile(indexPath, res);
      return;
    } else {
      console.error('Index file not found at:', indexPath);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Index file not found');
      return;
    }
  } else if (urlPath === '/form' || urlPath === '/form.html') {
    const formPath = path.join(ROOT, 'src/pages/form.html');
    if (fs.existsSync(formPath)) {
      serveFile(formPath, res);
      return;
    } else {
      console.error('Form file not found at:', formPath);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Form file not found');
      return;
    }
  }

  // Pages additionnelles depuis src/pages
  // - /mentions-legales ou /mentions-legales.html
  // - /charte-ethique ou /charte-ethique.html
  // - etc.
  if (urlPath.endsWith('.html') && urlPath !== '/index.html' && urlPath !== '/form.html') {
    const pageFile = path.basename(urlPath);
    const pagePath = path.join(ROOT, 'src', 'pages', pageFile);
    if (fs.existsSync(pagePath)) {
      serveFile(pagePath, res);
      return;
    }
  } else if (urlPath.match(/^\/[a-z0-9-]+$/i) && urlPath !== '/' && urlPath !== '/form') {
    const pageFile = `${urlPath.slice(1)}.html`;
    const pagePath = path.join(ROOT, 'src', 'pages', pageFile);
    if (fs.existsSync(pagePath)) {
      serveFile(pagePath, res);
      return;
    }
  }

  // Local API routing (simulate Vercel serverless)
  if (urlPath.startsWith('/api/fill')) {
    console.log('→ routing to local api/fill handler');
    handleApiFill(req, res);
    return;
  }

  if (urlPath.startsWith('/api/projet-de-vie-premium')) {
    console.log('→ routing to local api/projet-de-vie-premium handler');
    handleApiProjetDeViePremium(req, res);
    return;
  }

  if (urlPath.startsWith('/api/projet-de-vie')) {
    console.log('→ routing to local api/projet-de-vie handler');
    handleApiProjetDeVie(req, res);
    return;
  }

  // Gestion des chemins des ressources
  let filePath;
  
  // Si le chemin commence par /public/, on le sert depuis le dossier public
  if (urlPath.startsWith('/public/')) {
    filePath = safeJoin(ROOT, urlPath);
  } 
  // Si c'est une ressource JS, CSS ou une page, on la sert depuis src
  else if (urlPath.startsWith('/src/')) {
    filePath = safeJoin(ROOT, urlPath);
  }
  // Pour les chemins de données
  else if (urlPath.startsWith('/data/')) {
    // Essayer d'abord dans public/data
    filePath = safeJoin(ROOT, '/public' + urlPath);
    // Si pas trouvé, essayer directement dans data
    if (!fs.existsSync(filePath)) {
      filePath = safeJoin(ROOT, urlPath);
    }
  }
  // Pour les fichiers CSS, JS, images, etc.
  else if (urlPath.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    // Essayer d'abord dans public
    filePath = safeJoin(ROOT, '/public' + urlPath);
    
    // Si pas trouvé, essayer dans src
    if (!fs.existsSync(filePath)) {
      filePath = safeJoin(ROOT, '/src' + urlPath);
    }
    
    // Pour les fichiers JS, essayer dans src/js
    if ((!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) && urlPath.endsWith('.js')) {
      const jsPath = safeJoin(ROOT, '/src/js' + urlPath);
      if (fs.existsSync(jsPath)) {
        filePath = jsPath;
      }
    }
    
    // Pour les fichiers CSS, essayer dans src/css
    if ((!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) && urlPath.endsWith('.css')) {
      const cssPath = safeJoin(ROOT, '/src/css' + urlPath);
      if (fs.existsSync(cssPath)) {
        filePath = cssPath;
      }
    }
  }
  // Pour les autres chemins
  else {
    // Essayer d'abord dans public
    filePath = safeJoin(ROOT, '/public' + urlPath);
    
    // Si pas trouvé, essayer dans src
    if (!fs.existsSync(filePath)) {
      filePath = safeJoin(ROOT, '/src' + urlPath);
    }
    
    // Si c'est un dossier, essayer d'ajouter index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      if (fs.existsSync(indexPath)) {
        filePath = indexPath;
      }
    }
  }
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Dev server running: http://localhost:${PORT}`);
  console.log(`📁 Serving folder: ${ROOT}`);
  console.log('➡️ Place tes fichiers web ici (index.html, css/, js/, data/, output/...)');
});
