/**
 * For testing usage, separate the global config of the app
 */
// const session = require('koa-session-minimal');
const session = require('koa2-session-store');
const convert = require('koa-convert');
const bodyParser = require('koa-bodyparser');
const cookie = require('koa-cookie');
const Router = require('koa-router');
const json = require('koa-json');
const CasClient = require('../../index');
const _ = require('lodash');
const SetSessionStore = require('./SetSessionStore.js');

/*
 *
 * @param app
 * @param {Object} casOptions (Optional)
 * @param {Function} hookBeforeCasConfig (Optional)
 * @param {Function} hookAfterCasConfig (Optional)
 * @returns {*}
 */
module.exports = function(app, casOptions, {
  beforeCasConfigHook,
  afterCasConfigHook,
} = {}){

  app.keys = ['cas', 'test'];
  app.use(convert.back(cookie["default"]('here is some secret')));

  app.use(session({
    key: 'SESSIONID', // default "koa:sess"
    name: 'SESSIONID', // default "koa:sess"
    store: new SetSessionStore.MemoryStore(),
  }));

  app.use(SetSessionStore());
  app.use(bodyParser());
  app.use(convert.back(json()));

  const demoParams = {
    appId: '900007430',
    pid: '1',
    type: 8,
    appKey: 'BXEKfudgcgVDBb8k',
  };
  console.log('casClientFactory: typeof beforeCasConfigHook = ', typeof beforeCasConfigHook === 'function');
  if(typeof beforeCasConfigHook === 'function'){beforeCasConfigHook(app);}

  const defaultOptions = {
    ignore: [
      /\/ignore/,
    ],
    match: [],
    servicePrefix: 'http://10.17.86.87:8080',
    serverPath: 'http://cas.sdet.wsd.com',
    paths: {
      validate: '/cas/validate',
      serviceValidate: '/cas/serviceValidate',
      proxy: '/cas/proxy',
      login: '/cas/login', // or login(ctx) => {}
      logout: '/cas/logout',
      proxyCallback: '/cas/proxyCallback',
      restletIntegration: '/buglycas/v1/tickets',
    },
    redirect: false,
    gateway: false,
    renew: false,
    slo: true,
    cache: {
      enable: true,
      ttl: 5 * 60 * 1000,
      filter: [
        // /betaserverpre\.et\.wsd\.com/
      ],
    },
    fromAjax: {
      header: 'x-client-ajax',
      status: 418,
    },
    logger(ctx, type) { // eslint-disable-line
      return function(){};
    },
    restletIntegration: {
      demo1: {
        trigger(ctx) { // eslint-disable-line
          // console.log('Checking restletIntegration rules');
          return false;
        },
        params: {
          username: `${demoParams.appId}_${demoParams.pid}`,
          from: 'http://10.17.86.87:8080/cas/validate',
          type: demoParams.type,
          password: JSON.stringify({
            appId: `${demoParams.appId}_${demoParams.pid}`,
            appKey: demoParams.appKey,
          }),
        },
      },
    },
  };

  if(casOptions){
    _.merge(defaultOptions, casOptions);
  }
  // CAS config
  // =============================================================================
  const casClient = new CasClient(defaultOptions);

  app.use(SetSessionStore.setSessionId());

  app.use(casClient.core());

  // console.log('defaultOptions', defaultOptions);

  // if (defaultOptions.slo) {
  //   app.use(casClient.slo());
  // }

  if(typeof afterCasConfigHook === 'function'){afterCasConfigHook(app);}

  // if (typeof hookAfterCasConfig === 'function') {
  //   console.log('hookAfterCasConfig', hookAfterCasConfig);
  //   hookAfterCasConfig(app);
  // }

  const router = new Router();
  router.get('/logout', async(ctx, next) => {
    await casClient.logout(ctx);
  });
  router.get('/', async(ctx, next) => {
    console.log('GET / DONE');
    ctx.body = 'ok';
  });
  app
    .use(router.routes())
    .use(router.allowedMethods());

  app.on('error', (err, ctx) => {
    console.log(err);
    console.error('server error', err, ctx);
  });

  return app;
};
