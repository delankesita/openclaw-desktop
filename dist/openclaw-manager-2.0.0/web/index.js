"use strict";
/**
 * OpenClaw Manager Web
 * Web interface and REST API server
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const manager_core_1 = require("@openclaw/manager-core");
const manager = new manager_core_1.OpenClawManager();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5050;
// ==================== REST API ====================
function sendJSON(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}
function sendError(res, message, status = 400) {
    sendJSON(res, { error: message }, status);
}
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}
async function handleAPI(req, res) {
    const url = req.url || '/';
    const method = req.method || 'GET';
    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }
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
        }
        catch (err) {
            sendError(res, err.message);
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
            }
            catch (err) {
                sendError(res, err.message);
            }
            return;
        }
        // POST /api/instances/:id/start
        if (action === '/start' && method === 'POST') {
            try {
                await manager.start(id);
                sendJSON(res, { success: true });
            }
            catch (err) {
                sendError(res, err.message);
            }
            return;
        }
        // POST /api/instances/:id/stop
        if (action === '/stop' && method === 'POST') {
            try {
                await manager.stop(id);
                sendJSON(res, { success: true });
            }
            catch (err) {
                sendError(res, err.message);
            }
            return;
        }
        // POST /api/instances/:id/restart
        if (action === '/restart' && method === 'POST') {
            try {
                await manager.restart(id);
                sendJSON(res, { success: true });
            }
            catch (err) {
                sendError(res, err.message);
            }
            return;
        }
        // POST /api/instances/:id/clone
        if (action === '/clone' && method === 'POST') {
            try {
                const body = await readBody(req);
                const { name } = JSON.parse(body);
                const instance = await manager.clone(id, name);
                sendJSON(res, instance, 201);
            }
            catch (err) {
                sendError(res, err.message);
            }
            return;
        }
        // GET /api/instances/:id/health
        if (action === '/health' && method === 'GET') {
            try {
                const health = await manager.healthCheck(id);
                sendJSON(res, health);
            }
            catch (err) {
                sendError(res, err.message);
            }
            return;
        }
        // GET /api/instances/:id/backup
        if (action === '/backup' && method === 'GET') {
            try {
                const includeSecrets = (req.url || '').includes('secrets=true');
                const backup = manager.backup(id, includeSecrets);
                sendJSON(res, backup);
            }
            catch (err) {
                sendError(res, err.message);
            }
            return;
        }
        // POST /api/instances/:id/restore
        if (action === '/restore' && method === 'POST') {
            try {
                const body = await readBody(req);
                manager.restore(id, JSON.parse(body));
                sendJSON(res, { success: true });
            }
            catch (err) {
                sendError(res, err.message);
            }
            return;
        }
        // PUT /api/instances/:id/model
        if (action === '/model' && method === 'PUT') {
            try {
                const body = await readBody(req);
                const { model } = JSON.parse(body);
                manager.setModel(id, model);
                sendJSON(res, { success: true });
            }
            catch (err) {
                sendError(res, err.message);
            }
            return;
        }
        // PUT /api/instances/:id/autostart
        if (action === '/autostart' && method === 'PUT') {
            try {
                const body = await readBody(req);
                const { autoStart } = JSON.parse(body);
                manager.setAutoStart(id, autoStart);
                sendJSON(res, { success: true });
            }
            catch (err) {
                sendError(res, err.message);
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
        }
        catch (err) {
            sendError(res, err.message);
        }
        return;
    }
    sendError(res, 'Not found', 404);
}
// ==================== Web UI ====================
function getUI() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenClaw Manager</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f1a; color: #e0e0e0; }
    .app { display: flex; height: 100vh; }
    .sidebar { width: 280px; background: #1a1a2e; border-right: 1px solid #2a2a4a; padding: 20px; display: flex; flex-direction: column; }
    .sidebar h1 { font-size: 20px; margin-bottom: 20px; color: #e94560; display: flex; align-items: center; gap: 8px; }
    .instance-list { list-style: none; flex: 1; overflow-y: auto; }
    .instance-item { padding: 12px; cursor: pointer; border-radius: 8px; margin-bottom: 4px; transition: background 0.2s; }
    .instance-item:hover { background: #2a2a4a; }
    .instance-item.active { background: #e94560; }
    .instance-name { font-weight: 500; margin-bottom: 4px; }
    .instance-status { font-size: 12px; opacity: 0.7; }
    .main { flex: 1; padding: 30px; overflow-y: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .header h2 { font-size: 28px; }
    .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
    .btn-primary { background: #e94560; color: white; }
    .btn-primary:hover { background: #ff6b8a; }
    .btn-secondary { background: #2a2a4a; color: #e0e0e0; }
    .btn-secondary:hover { background: #3a3a5a; }
    .btn-danger { background: #ff4444; color: white; }
    .btn-danger:hover { background: #ff6666; }
    .btn-group { display: flex; gap: 10px; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .status-running { background: #00c853; color: white; }
    .status-stopped { background: #424242; color: #aaa; }
    .status-error { background: #ff5252; color: white; }
    .status-starting, .status-stopping { background: #ffc107; color: #333; }
    .card { background: #1a1a2e; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #2a2a4a; }
    .card h3 { margin-bottom: 15px; font-size: 16px; color: #888; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 10px; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #e94560; }
    .stat-label { font-size: 12px; color: #888; margin-top: 4px; }
    .placeholder { text-align: center; padding: 100px 40px; color: #666; }
    .placeholder-icon { font-size: 64px; margin-bottom: 20px; }
    .templates-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .template-item { background: #2a2a4a; border-radius: 10px; padding: 15px; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; }
    .template-item:hover { border-color: #e94560; }
    .template-icon { font-size: 24px; margin-bottom: 8px; }
    .template-name { font-weight: 500; margin-bottom: 4px; }
    .template-desc { font-size: 12px; color: #888; }
    .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #1a1a2e; border-radius: 16px; padding: 30px; width: 400px; max-width: 90%; }
    .modal h3 { margin-bottom: 20px; font-size: 20px; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 6px; font-size: 14px; color: #888; }
    .form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #2a2a4a; border-radius: 8px; background: #0f0f1a; color: #e0e0e0; font-size: 14px; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #e94560; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="app">
    <div class="sidebar">
      <h1>🦞 OpenClaw</h1>
      <ul class="instance-list" id="instanceList"></ul>
      <button class="btn btn-primary" style="width: 100%; margin-top: 15px;" onclick="showCreateModal()">+ New Instance</button>
    </div>
    <div class="main" id="mainContent">
      <div class="placeholder">
        <div class="placeholder-icon">🦞</div>
        <p>Select an instance or create a new one</p>
      </div>
    </div>
  </div>

  <div class="modal hidden" id="createModal">
    <div class="modal-content">
      <h3>Create Instance</h3>
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="createName" placeholder="my-shrimp">
      </div>
      <div class="form-group">
        <label>Template</label>
        <select id="createTemplate"></select>
      </div>
      <div class="form-group">
        <label>Model (optional)</label>
        <input type="text" id="createModel" placeholder="default">
      </div>
      <div class="btn-group" style="justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="hideCreateModal()">Cancel</button>
        <button class="btn btn-primary" onclick="createInstance()">Create</button>
      </div>
    </div>
  </div>

  <script>
    let instances = [];
    let selectedId = null;
    let templates = [];

    async function loadTemplates() {
      const res = await fetch('/api/templates');
      templates = await res.json();
      const select = document.getElementById('createTemplate');
      select.innerHTML = templates.map(t => '<option value="' + t.id + '">' + t.icon + ' ' + t.name + '</option>').join('');
    }

    async function loadInstances() {
      const res = await fetch('/api/instances');
      instances = await res.json();
      renderInstanceList();
      if (selectedId) {
        const inst = instances.find(i => i.id === selectedId);
        if (inst) renderInstanceDetail(inst);
      }
    }

    function renderInstanceList() {
      const list = document.getElementById('instanceList');
      list.innerHTML = instances.map(i => {
        const active = i.id === selectedId ? 'active' : '';
        return '<li class="instance-item ' + active + '" onclick="selectInstance(\\'' + i.id + '\\')"><div class="instance-name">' + i.name + '</div><div class="instance-status">' + i.status + ' · port ' + i.port + '</div></li>';
      }).join('');
    }

    function selectInstance(id) {
      selectedId = id;
      renderInstanceList();
      const inst = instances.find(i => i.id === id);
      if (inst) renderInstanceDetail(inst);
    }

    function renderInstanceDetail(inst) {
      const main = document.getElementById('mainContent');
      const running = inst.status === 'running';
      const health = inst.health || {};
      
      main.innerHTML = 
        '<div class="header"><h2>' + inst.name + '</h2><div class="btn-group">' +
          (running ? '<button class="btn btn-secondary" onclick="openDashboard(\\'' + inst.id + '\\')">Open Dashboard</button>' : '') +
          '<button class="btn btn-danger" onclick="deleteInstance(\\'' + inst.id + '\\')">Delete</button></div></div>' +
        '<div class="card"><h3>Status</h3>' +
          '<span class="status status-' + inst.status + '">' + inst.status + '</span>' +
          '<div class="stats">' +
            '<div class="stat"><div class="stat-value">' + inst.port + '</div><div class="stat-label">Port</div></div>' +
            '<div class="stat"><div class="stat-value">' + (health.cpu || 0) + '%</div><div class="stat-label">CPU</div></div>' +
            '<div class="stat"><div class="stat-value">' + Math.round((health.memory || 0) / 1024 / 1024) + 'MB</div><div class="stat-label">Memory</div></div>' +
          '</div></div>' +
        '<div class="card"><h3>Actions</h3><div class="btn-group">' +
          (running 
            ? '<button class="btn btn-secondary" onclick="stopInstance(\\'' + inst.id + '\\')">Stop</button><button class="btn btn-secondary" onclick="restartInstance(\\'' + inst.id + '\\')">Restart</button>'
            : '<button class="btn btn-primary" onclick="startInstance(\\'' + inst.id + '\\')">Start</button>') +
          '<button class="btn btn-secondary" onclick="backupInstance(\\'' + inst.id + '\\')">Backup</button>' +
        '</div></div>';
    }

    function showCreateModal() {
      document.getElementById('createModal').classList.remove('hidden');
      document.getElementById('createName').value = 'shrimp-' + Date.now();
    }

    function hideCreateModal() {
      document.getElementById('createModal').classList.add('hidden');
    }

    async function createInstance() {
      const name = document.getElementById('createName').value;
      const template = document.getElementById('createTemplate').value;
      const model = document.getElementById('createModel').value || undefined;
      await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, template, model })
      });
      hideCreateModal();
      loadInstances();
    }

    async function startInstance(id) {
      await fetch('/api/instances/' + id + '/start', { method: 'POST' });
      loadInstances();
    }

    async function stopInstance(id) {
      await fetch('/api/instances/' + id + '/stop', { method: 'POST' });
      loadInstances();
    }

    async function restartInstance(id) {
      await fetch('/api/instances/' + id + '/restart', { method: 'POST' });
      loadInstances();
    }

    async function deleteInstance(id) {
      if (confirm('Delete this instance?')) {
        await fetch('/api/instances/' + id, { method: 'DELETE' });
        selectedId = null;
        loadInstances();
      }
    }

    async function backupInstance(id) {
      const res = await fetch('/api/instances/' + id + '/backup');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = id + '-backup.json';
      a.click();
    }

    function openDashboard(id) {
      const inst = instances.find(i => i.id === id);
      if (inst) window.open('http://localhost:' + inst.port, '_blank');
    }

    // Initialize
    loadTemplates();
    loadInstances();
    setInterval(loadInstances, 5000);
  </script>
</body>
</html>`;
}
// ==================== Server ====================
const server = http.createServer(async (req, res) => {
    const url = req.url || '/';
    if (url.startsWith('/api/')) {
        await handleAPI(req, res);
        return;
    }
    // Serve UI
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getUI());
});
server.listen(PORT, () => {
    console.log(`OpenClaw Manager Web Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map