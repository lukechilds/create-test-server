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
