import querystring from 'querystring';
import test from 'ava';
import got from 'got';
import createTestServer from '../';

test('createTestServer is a function', t => {
	t.is(typeof createTestServer, 'function');
});

test('createTestServer returns a Promise', t => {
	t.true(createTestServer() instanceof Promise);
});

test('server instance exposes useful properties', async t => {
	const server = await createTestServer();

	t.true(typeof server.port === 'number');
	t.true(typeof server.sslPort === 'number');
	t.true(typeof server.url === 'string');
	t.true(typeof server.sslUrl === 'string');
	t.true(typeof server.caCert === 'string');
	t.true(typeof server.listen === 'function');
	t.true(typeof server.close === 'function');
});

test('express endpoint', async t => {
	const server = await createTestServer();

	server.get('/foo', (req, res) => {
		res.send('bar');
	});

	const { body } = await got(server.url + '/foo');
	t.is(body, 'bar');
});

test('server can be stopped and restarted', async t => {
	const server = await createTestServer();

	server.get('/foo', (req, res) => {
		res.send('bar');
	});

	t.plan(3);

	const { body } = await got(server.url + '/foo');
	t.is(body, 'bar');

	const closedUrl = server.url;
	await server.close();

	await got(closedUrl + '/foo', { timeout: 100 }).catch(err => {
		t.is(err.code, 'ETIMEDOUT');
	});

	await server.listen();

	const { body: bodyRestarted } = await got(server.url + '/foo');
	t.is(bodyRestarted, 'bar');
});

test('server uses a new port on each listen', async t => {
	const server = await createTestServer();
	const origPort = server.port;
	await server.close();
	await server.listen();

	t.not(origPort, server.port);
});

test('server listens for SSL traffic', async t => {
	const server = await createTestServer();

	server.get('/foo', (req, res) => {
		res.send('bar');
	});

	const { body } = await got(server.sslUrl + '/foo', { rejectUnauthorized: false });
	t.is(body, 'bar');
});

test('server automatically parses JSON request body', async t => {
	const server = await createTestServer();
	const object = { foo: 'bar' };

	server.post('/echo', (req, res) => {
		t.deepEqual(req.body, object);
		res.end();
	});

	await got.post(server.url + '/echo', {
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(object)
	});
});

test('server automatically parses text request body', async t => {
	const server = await createTestServer();
	const text = 'foo';

	server.post('/echo', (req, res) => {
		t.deepEqual(req.body, text);
		res.end();
	});

	await got.post(server.url + '/echo', {
		headers: { 'content-type': 'text/plain' },
		body: text
	});
});

test('server automatically parses URL-encoded form request body', async t => {
	const server = await createTestServer();
	const object = { foo: 'bar' };

	server.post('/echo', (req, res) => {
		t.deepEqual(req.body, object);
		res.end();
	});

	await got.post(server.url + '/echo', {
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: querystring.stringify(object)
	});
});

test('server automatically parses binary request body', async t => {
	const server = await createTestServer();
	const buffer = Buffer.from('foo');

	server.post('/echo', (req, res) => {
		t.deepEqual(req.body, buffer);
		res.end();
	});

	await got.post(server.url + '/echo', {
		headers: { 'content-type': 'application/octet-stream' },
		body: buffer
	});
});

test('opts.certificate is passed through to createCert()', async t => {
	const server = await createTestServer({ certificate: 'foo.bar' });

	server.get('/foo', (req, res) => {
		res.send('bar');
	});

	const { body } = await got(server.sslUrl + '/foo', {
		ca: server.caCert,
		headers: { host: 'foo.bar' }
	});
	t.is(body, 'bar');
});

test('opts.bodyParser is passed through to bodyParser', async t => {
	const smallServer = await createTestServer({ bodyParser: { limit: '100kb' } });
	const bigServer = await createTestServer({ bodyParser: { limit: '200kb' } });
	const buf = Buffer.alloc(150 * 1024);

	// Custom error handler so we don't dump the stack trace in the test output
	smallServer.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
		res.status(500).end();
	});

	t.plan(3);

	smallServer.post('/', (req, res) => {
		t.fail();
		res.end();
	});

	bigServer.post('/', (req, res) => {
		t.true(req.body.length === buf.length);
		res.end();
	});

	await t.throws(got.post(smallServer.url, {
		headers: { 'content-type': 'application/octet-stream' },
		body: buf
	}));

	await t.notThrows(got.post(bigServer.url, {
		headers: { 'content-type': 'application/octet-stream' },
		body: buf
	}));
});

test('support returning body directly', async t => {
	const server = await createTestServer();

	server.get('/foo', () => 'bar');
	server.get('/bar', () => ({ foo: 'bar' }));
	server.get('/async', () => Promise.resolve('bar'));

	const bodyString = (await got(server.url + '/foo')).body;
	const bodyJson = (await got(server.url + '/bar', { json: true })).body;
	const bodyAsync = (await got(server.url + '/async')).body;
	t.deepEqual(bodyString, 'bar');
	t.deepEqual(bodyJson, { foo: 'bar' });
	t.deepEqual(bodyAsync, 'bar');
});

test('support returning body directly without wrapping in function', async t => {
	const server = await createTestServer();

	server.get('/foo', 'bar');
	server.get('/bar', ({ foo: 'bar' }));
	server.get('/async', Promise.resolve('bar'));

	const bodyString = (await got(server.url + '/foo')).body;
	const bodyJson = (await got(server.url + '/bar', { json: true })).body;
	const bodyAsync = (await got(server.url + '/async')).body;
	t.deepEqual(bodyString, 'bar');
	t.deepEqual(bodyJson, { foo: 'bar' });
	t.deepEqual(bodyAsync, 'bar');
});

test('accepts multiple callbacks in `.get()`', async t => {
	const server = await createTestServer();

	server.get('/foo', (req, res, next) => {
		res.set('foo', 'bar');
		next();
	}, (req, res) => res.get('foo'));

	const { body } = await got(server.url + '/foo');
	t.is(body, 'bar');
});
