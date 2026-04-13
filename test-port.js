const { Context } = require('koishi');

async function main() {
  const ctx = new Context({ port: 12345 });
  console.log('ctx.server before plugin:', ctx.server); // undefined

  try {
    const ServerPlugin = require('@koishijs/plugin-server');
    ctx.plugin(ServerPlugin.default || ServerPlugin);
  } catch (e) {
    console.log('no server plugin', e);
  }

  await ctx.start();
  
  if (ctx.server) {
    console.log('ctx.server.port:', ctx.server.port);
    console.log('ctx.server.selfUrl:', ctx.server.selfUrl);
    console.log('ctx.server.config:', ctx.server.config);
  }
  
  process.exit(0);
}
main();