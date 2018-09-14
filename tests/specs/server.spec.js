const httpMocks = require('node-mocks-http');
const request = require('request-promise-native');
const cheerio = require('cheerio');
const EventEmitter = require('events');
const { mockServer, mockContext } = require('../utils/unit');

let serverMock;
let bodyHtml;
const pluginStates = {
  beforeStart: false,
  routeError: false,
  afterResponse: false,
};

describe('Server and Renderer', () => {
  beforeAll(() => {
    serverMock = mockServer();

    const { plugin } = serverMock;

    plugin.events.on('beforeStart', () => {
      pluginStates.beforeStart = true;
    });

    plugin.events.on('routeError', () => {
      pluginStates.routeError = true;
    });

    plugin.events.on('afterResponse', () => {
      pluginStates.afterResponse = true;
    });
  });

  it('Renderer render body correctly', async () => {
    const { renderer } = serverMock;

    bodyHtml = await renderer.render(mockContext());
    const $ = cheerio.load(bodyHtml);

    expect($('h1').text()).toContain('UVue');
  });

  it('Renderer render SSR page correctly', async () => {
    const { renderer } = serverMock;
    const $ = cheerio.load(await renderer.renderSSRPage(bodyHtml, mockContext()));

    expect($('html').length).toBe(1);
    expect($('head').length).toBe(1);
    expect($('script[data-vue-ssr-data]').length).toBe(1);

    const body = $('body');
    $('body')
      .find('script')
      .remove();

    expect(body.html()).toBe(bodyHtml);
  });

  it('Renderer render SPA page correctly', async () => {
    const { renderer } = serverMock;
    const $ = cheerio.load(await renderer.renderSPAPage());

    expect($('script[data-vue-spa]').length).toBe(1);
  });

  it('Render middleware should work', async () => {
    const { server } = serverMock;

    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/',
    });
    const res = httpMocks.createResponse();

    const { response } = await server.renderMiddleware(req, res);
    const $ = cheerio.load(response.body);

    expect(response.status).toBe(200);

    expect($('html').length).toBe(1);
    expect($('head').length).toBe(1);
    expect($('h1').text()).toContain('UVue');
    expect($('script[data-vue-ssr-data]').length).toBe(1);
  });

  it('Plugin should be installed', async () => {
    const { server, plugin } = serverMock;

    expect(serverMock.plugin.$options.install).toBe(true);
    expect(server.plugins[0]).toBe(plugin);
  });

  it('Plugin hooks should be invoked on route rendering', async () => {
    expect(serverMock.plugin.$options.beforeRender).toBe(true);
    expect(serverMock.plugin.$options.beforeBuild).toBe(true);
    expect(serverMock.plugin.$options.rendered).toBe(true);
  });

  it('Plugin hooks should be invoked after response was sent', async () => {
    expect(pluginStates.afterResponse).toBe(true);
  });

  it('Server should start the adapter', async () => {
    await serverMock.server.start()

    const host = serverMock.server.adapter.getHost()
    const port = serverMock.server.adapter.getPort()
    const isHttps = serverMock.server.adapter.isHttps()

    const uri = `${isHttps ? 'https' : 'http'}://${host}:${port}`
    const { statusCode, body } = await request({
      uri,
      method: 'GET',
      transform: function (body, response) {
        return response;
      }
    });
    const $ = cheerio.load(body);

    expect($('h1').text()).toContain('UVue');
    expect(statusCode).toEqual(200);

    serverMock.server.adapter.getHttpServer().close();
  });

  it('Server should add more plugins', async () => {
    const { server, plugin } = serverMock;

    const pluginsCount = server.plugins.length;
    server.addPlugin(plugin, {});

    expect(server.plugins.length).toEqual(pluginsCount + 1);
  });

});
