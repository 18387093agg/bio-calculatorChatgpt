import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
const root = resolve(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist/public' : 'public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = createServer((request, response) => {
  const requestPath = request.url?.split('?')[0] ?? '/';
  const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const file = resolve(root, relative);
  // A separator-aware check prevents prefix tricks such as `public-other`.
  if (!(file === root || file.startsWith(`${root}${sep}`)) || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Not found'); return; }
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(file).pipe(response);
});
const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Bio Calculator running at http://localhost:${port}`));
