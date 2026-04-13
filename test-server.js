const { Context } = require('koishi');
const ServerPlugin = require('@koishijs/plugin-server');

async function main() {
  const ctx = new Context({ port: 12345 });
  ctx.plugin(ServerPlugin);
  
  ctx.on('ready', () => {
    if (ctx.server && typeof ctx.server.get === 'function') {
      ctx.server.get('/test/:id', (koaCtx) => {
        koaCtx.body = 'hello ' + koaCtx.params.id;
      });
    } else {
      console.error('ctx.server.get is not a function');
    }
  });

  await ctx.start();
  console.log('port:', ctx.server?.port, 'selfUrl:', ctx.server?.selfUrl, 'config.selfUrl:', ctx.server?.config?.selfUrl);
  
  try {
    const res = await fetch(`http://127.0.0.1:12345/test/world`);
    console.log('response:', await res.text());
  } catch(e) {
    console.error(e.message);
  }
  
  process.exit(0);
}
main();