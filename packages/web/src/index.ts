import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { OpenClawManager, InstanceStatus } from '@openclaw/desktop-core';

const manager = new OpenClawManager();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5050;

function sendJSON(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res: http.ServerResponse, message: string, status = 400): void {
  sendJSON(res, { error: message }, status);
}

async function handleAPI(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = req.url || '/';
  const method = req.method || 'GET';

  // GET /api/instances
  if (url === '/api/instances' && method === 'GET') {
    sendJSON(res, manager.getInstances());
    return;
  }

  // POST /api/instances
  if (url === '/api/instances' && method === 'POST') {
    try {
      const body = await readBody(req);
      const options = JSON.parse(body);
      const instance = await manager.create(options);
      sendJSON(res, instance, 201);
    } catch (err) {
      sendError(res, (err as Error).message);
    }
    return;
  }

  // Instance-specific operations
  const instanceMatch = url.match(/^\/api\/instances\/([^/]+)(\/.*)?$/);
  if (instanceMatch) {
    const id = instanceMatch[1];
    const action = instanceMatch[2];

    // GET /api/instances/:id
    if (!action && method === 'GET') {
      const instance = manager.getInstance(id);
      if (!instance) {
        sendError(res, 'Instance not found', 404);
        return;
      }
      sendJSON(res, instance);
      return;
    }

    // DELETE /api/instances/:id
    if (!action && method === 'DELETE') {
      try {
        await manager.delete(id);
        sendJSON(res, { success: true });
      } catch (err) {
        sendError(res, (err as Error).message);
      }
      return;
    }

    // POST /api/instances/:id/start
    if (action === '/start' && method === 'POST') {
      try {
        await manager.start(id);
        sendJSON(res, { success: true });
      } catch (err) {
        sendError(res, (err as Error).message);
      }
      return;
    }

    // POST /api/instances/:id/stop
    if (action === '/stop' && method === 'POST') {
      try {
        await manager.stop(id);
        sendJSON(res, { success: true });
      } catch (err) {
        sendError(res, (err as Error).message);
      }
      return;
    }

    // POST /api/instances/:id/restart
    if (action === '/restart' && method === 'POST') {
      try {
        await manager.restart(id);
        sendJSON(res, { success: true });
      } catch (err) {
        sendError(res, (err as Error).message);
      }
      return;
    }

    // GET /api/instances/:id/health
    if (action === '/health' && method === 'GET') {
      try {
        const health = await manager.healthCheck(id);
        sendJSON(res, health);
      } catch (err) {
        sendError(res, (err as Error).message);
      }
      return;
    }

    // GET /api/instances/:id/backup
    if (action === '/backup' && method === 'GET') {
      try {
        const backup = manager.backup(id);
        sendJSON(res, backup);
      } catch (err) {
        sendError(res, (err as Error).message);
      }
      return;
    }

    // POST /api/instances/:id/restore
    if (action === '/restore' && method === 'POST') {
      try {
        const body = await readBody(req);
        manager.restore(id, JSON.parse(body));
        sendJSON(res, { success: true });
      } catch (err) {
        sendError(res, (err as Error).message);
      }
      return;
    }
  }

  // GET /api/templates
  if (url === '/api/templates' && method === 'GET') {
    sendJSON(res, manager.getTemplates());
    return;
  }

  // GET /api/export
  if (url === '/api/export' && method === 'GET') {
    sendJSON(res, manager.exportAll());
    return;
  }

  // POST /api/import
  if (url === '/api/import' && method === 'POST') {
    try {
      const body = await readBody(req);
      const count = manager.importAll(JSON.parse(body));
      sendJSON(res, { imported: count });
    } catch (err) {
      sendError(res, (err as Error).message);
    }
    return;
  }

  sendError(res, 'Not found', 404);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';

  // API routes
  if (url.startsWith('/api/')) {
    await handleAPI(req, res);
    return;
  }

  // Serve UI
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(getUI());
});

function getUI(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OpenClaw Desktop</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a2e; color: #eee; }
    .app { display: flex; height: 100vh; }
    .sidebar { width: 250px; background: #16213e; border-right: 1px solid #0f3460; padding: 20px; }
    .sidebar h2 { font-size: 18px; margin-bottom: 20px; color: #e94560; }
    .instance-list { list-style: none; }
    .instance-item { padding: 10px; cursor: pointer; border-radius: 8px; margin-bottom: 5px; }
    .instance-item:hover { background: #0f3460; }
    .instance-item.active { background: #e94560; }
    .main { flex: 1; padding: 30px; overflow-y: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .header h1 { font-size: 24px; }
    .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .btn-primary { background: #e94560; color: white; }
    .btn-secondary { background: #0f3460; color: white; }
    .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .status-running { background: #00c853; color: white; }
    .status-stopped { background: #666; color: white; }
    .status-error { background: #ff5252; color: white; }
    .card { background: #16213e; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .card h3 { margin-bottom: 15px; }
    .actions { display: flex; gap: 10px; }
    .placeholder { text-align: center; padding: 60px; color: #666; }
  </style>
</head>
<body>
  <div class="app">
    <div class="sidebar">
      <h2>🦞 OpenClaw</h2>
      <ul class="instance-list" id="instanceList"></ul>
      <button class="btn btn-primary" style="width: 100%; margin-top: 20px;" onclick="createInstance()">+ New Instance</button>
    </div>
    <div class="main" id="mainContent">
      <div class="placeholder"><p>Select an instance or create a new one</p></div>
    </div>
  </div>
  <script>
    let instances = [];
    async function loadInstances() {
      const res = await fetch('/api/instances');
      instances = await res.json();
      renderInstanceList();
    }
    function renderInstanceList() {
      const list = document.getElementById('instanceList');
      list.innerHTML = instances.map(i => '<li class="instance-item" onclick="selectInstance(\\''+i.id+'\\')"><div>'+i.name+'</div><span class="status status-'+i.status+'">'+i.status+'</span></li>').join('');
    }
    async function createInstance() {
      const name = prompt('Instance name:', 'shrimp-' + Date.now());
      if (name) {
        await fetch('/api/instances', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name}) });
        loadInstances();
      }
    }
    async function selectInstance(id) {
      const instance = instances.find(i => i.id === id);
      const main = document.getElementById('mainContent');
      const running = instance.status === 'running';
      main.innerHTML = '<div class="header"><h1>'+instance.name+'</h1></div><div class="card"><h3>Status</h3><p><span class="status status-'+instance.status+'">'+instance.status+'</span></p><p style="margin-top:10px">Port: '+instance.port+'</p></div><div class="card"><h3>Actions</h3><div class="actions">'+(running?'<button class="btn btn-secondary" onclick="stopInstance(\\''+id+'\\')">Stop</button>':'<button class="btn btn-primary" onclick="startInstance(\\''+id+'\\')">Start</button>')+'</div></div>';
    }
    async function startInstance(id) {
      await fetch('/api/instances/'+id+'/start', { method: 'POST' });
      loadInstances();
    }
    async function stopInstance(id) {
      await fetch('/api/instances/'+id+'/stop', { method: 'POST' });
      loadInstances();
    }
    loadInstances();
  </script>
</body>
</html>`;
}

server.listen(PORT, () => {
  console.log(`OpenClaw Desktop Web Server running on http://localhost:${PORT}`);
});
