const url = require('url');
const Koa = require('koa');
const co = require('co');
const supertest = require('supertest');
const {logger, hooks} = require('./lib/testUtils');
const {expect} = require('chai');
const casServerFactory = require('./lib/casServer');
const casClientFactory = require('./lib/casClientFactory');
const handleCookies = require('./lib/handleCookie');

const getLogoutXml = function(sessionId){
  return `${'<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"' +
    'ID="[RANDOM ID]" Version="2.0" IssueInstant="[CURRENT DATE/TIME]">' +
    '<saml:NameID xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">' +
    '@NOT_USED@' +
    '</saml:NameID>' +
    '<samlp:SessionIndex>'}${sessionId}</samlp:SessionIndex>` +
    '</samlp:LogoutRequest>';
};

describe('slo能够正确响应并注销', function(){

  const localhost = 'http://127.0.0.1';
  const casPort = 3004;
  const clientPort = 3002;
  const serverPath = `${localhost}:${casPort}`;
  const clientPath = `${localhost}:${clientPort}`;

  let casClientApp;
  let casClientServer;
  let casServerApp;
  let casServer;
  let serverRequest;
  let request;
  let hookBeforeCasConfig;
  let hookAfterCasConfig;

  beforeEach(function(done){

    casServerApp = new Koa();
    casServerFactory(casServerApp);

    casClientApp = new Koa();
    casClientFactory(casClientApp, {
      servicePrefix: clientPath,
      serverPath,
      logger,
      hooks,
    }, {
      beforeCasConfigHook(app){
        app.use(function * (next){
          if(typeof hookBeforeCasConfig === 'function'){
            return yield hookBeforeCasConfig(this, next);
          }else{
            return yield next;
          }
        });
      },
      afterCasConfigHook(app){
        app.use(function * (next){
          if(typeof hookAfterCasConfig === 'function'){
            return yield hookAfterCasConfig(this, next);
          }else{
            return yield next;
          }
        });
      },
    });

    hookAfterCasConfig = function * (ctx, next){
      if(ctx.path === '/'){
        ctx.body = {
          cas: ctx.session.cas,
          id: ctx.sessionId,
        };
      }else{
        return yield next;
      }
    };

    co(function * (){
      yield new Promise((r, j) => casServer = casServerApp.listen(casPort, err => err ? j(err) : r()));
      console.log(`casServer listen ${casPort}`);
      serverRequest = supertest.agent(casServerApp.listen());

      yield new Promise((r, j) => casClientServer = casClientApp.listen(clientPort, err => err ? j(err) : r()));
      console.log(`casClientServer listen ${clientPort}`);
      request = supertest.agent(casClientApp.listen());
      done();
    });
  });

  afterEach(function(done){
    hookAfterCasConfig = null;
    hookBeforeCasConfig = null;
    co(function * (){
      yield new Promise((r, j) => casServer.close(err => err ? j(err) : r()));
      yield new Promise((r, j) => casClientServer.close(err => err ? j(err) : r()));
      done();
    });
  });

  it('slo能够正确响应并注销登录', function(done){
    co(function * (){
      let res = yield serverRequest.get(`/cas/login?service=${encodeURIComponent(`${clientPath}/cas/validate`)}`).expect(302);
      const redirectLocation = res.header.location;
      const uri = url.parse(redirectLocation, true);
      const ticket = uri.query.ticket;
      expect(ticket).to.not.be.empty;

      res = yield request.get(redirectLocation.replace(clientPath, '')).expect(302);
      const cookies = handleCookies.setCookies(res.header);
      expect(res.header.location).to.equal('/');

      res = yield request.get('/').set('Cookie', handleCookies.getCookies(cookies)).expect(200);
      const body = JSON.parse(res.text);
      expect(body.cas.user).to.not.be.empty;
      expect(body.cas.st).to.not.be.empty;
      expect(body.cas.pgt).to.not.be.empty;
      expect(body.id).to.not.be.empty;

      res = yield request.post('/cas/validate').type('xml').send(getLogoutXml(ticket)).expect(200);
      res = yield request.get('/').set('Cookie', handleCookies.getCookies(cookies)).expect(302);
      expect(res.header.location.indexOf('/cas/login') > -1).to.be["true"];
      done();
    })["catch"](done);
  });


  it('slo发送非法xml, 响应202', function(done){
    co(function * (){
      let res = yield serverRequest.get(`/cas/login?service=${encodeURIComponent(`${clientPath}/cas/validate`)}`).expect(302);
      const redirectLocation = res.header.location;
      const uri = url.parse(redirectLocation, true);
      const ticket = uri.query.ticket;
      expect(ticket).to.not.be.empty;

      res = yield request.get(redirectLocation.replace(clientPath, '')).expect(302);
      const cookies = handleCookies.setCookies(res.header);
      expect(res.header.location).to.equal('/');

      res = yield request.get('/').set('Cookie', handleCookies.getCookies(cookies)).expect(200);
      let body = JSON.parse(res.text);
      expect(body.cas.user).to.not.be.empty;
      expect(body.cas.st).to.not.be.empty;
      expect(body.cas.pgt).to.not.be.empty;
      expect(body.id).to.not.be.empty;

      res = yield request.post('/cas/validate').type('xml').send('some invalid string').expect(202);
      res = yield request.get('/').set('Cookie', handleCookies.getCookies(cookies)).expect(200);
      body = JSON.parse(res.text);
      expect(body.cas.user).to.not.be.empty;
      expect(body.cas.st).to.not.be.empty;
      expect(body.cas.pgt).to.not.be.empty;
      expect(body.id).to.not.be.empty;
      done();
    })["catch"](done);
  });

});
