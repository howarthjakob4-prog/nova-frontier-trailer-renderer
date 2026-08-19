import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.NOVA_ENGINE_API_KEY || '';
const jobs = new Map();

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization, x-api-key',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  });
  res.end(payload);
}

function authorized(req) {
  if (!API_KEY) return true;
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  return req.headers['x-api-key'] === API_KEY || bearer === API_KEY;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('Request body must be valid JSON.'); }
}

function createJob(type, input) {
  const id = crypto.randomUUID();
  const job = {
    id,
    type,
    input,
    status: 'queued',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logs: [`Queued ${type} job.`]
  };
  jobs.set(id, job);
  return job;
}

function simulateEngineWork(job) {
  setTimeout(() => {
    job.status = 'running';
    job.updatedAt = new Date().toISOString();
    job.logs.push(`Started ${job.type}.`);
  }, 150);
  setTimeout(() => {
    job.status = 'completed';
    job.updatedAt = new Date().toISOString();
    job.logs.push(`Completed ${job.type} prototype request.`);
    job.result = {
      message: 'Prototype connector completed the request. Replace simulateEngineWork() with the real engine bridge when the desktop engine service is ready.'
    };
  }, 800);
}

const allowedCommands = new Set([
  'import_model',
  'build_scene',
  'render_trailer',
  'run_sim',
  'get_logs'
]);

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (!authorized(req)) return json(res, 401, { error: 'Unauthorized' });

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, {
      ok: true,
      service: 'nova-frontier-engine-connector',
      version: '0.1.0',
      allowedCommands: [...allowedCommands]
    });
  }

  const jobMatch = url.pathname.match(/^\/jobs\/([0-9a-f-]+)$/i);
  if (req.method === 'GET' && jobMatch) {
    const job = jobs.get(jobMatch[1]);
    if (!job) return json(res, 404, { error: 'Job not found' });
    return json(res, 200, job);
  }

  if (req.method === 'POST' && url.pathname === '/command') {
    try {
      const body = await readBody(req);
      const command = String(body.command || '');
      if (!allowedCommands.has(command)) {
        return json(res, 400, {
          error: 'Unsupported command',
          allowedCommands: [...allowedCommands]
        });
      }

      const job = createJob(command, body.input || {});
      simulateEngineWork(job);
      return json(res, 202, {
        jobId: job.id,
        status: job.status,
        statusUrl: `/jobs/${job.id}`
      });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  return json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Nova Frontier engine connector listening on http://localhost:${PORT}`);
});
