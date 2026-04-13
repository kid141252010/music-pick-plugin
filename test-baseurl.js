const { Context } = require('koishi');

async function main() {
  const ctx = new Context({ port: 12345 });
  const ServerPlugin = require('@koishijs/plugin-server').default || require('@koishijs/plugin-server');
  ctx.plugin(ServerPlugin);
  await ctx.start();
  
  const koishiPort = ctx.server?.port || ctx.server?.config?.port || ctx.root?.config?.port || process.env.PORT || 5140;
  const koishiHost = ctx.server?.host || ctx.server?.config?.host || ctx.root?.config?.host || '127.0.0.1';
  const resolvedHost = koishiHost === '0.0.0.0' ? '127.0.0.1' : koishiHost;
  
  // Also check ctx.server.selfUrl handling if it exists but points to undefined
  let selfUrl = ctx.server?.config?.selfUrl || ctx.server?.selfUrl;
  if (selfUrl && selfUrl.includes('undefined')) {
      selfUrl = null; // invalid!
  }
  
  const baseUrl = selfUrl || `http://${resolvedHost}:${koishiPort}`;
  
  console.log('baseUrl:', baseUrl);
  process.exit(0);
}
main();