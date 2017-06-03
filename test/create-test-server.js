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

	t.is(server.host, 'localhost');
	t.true(typeof server.port === 'number');
	t.true(typeof server.sslPort === 'number');
	t.is(server.url, `http://${server.host}:${server.port}`);
	t.is(server.sslUrl, `https://${server.host}:${server.sslPort}`);
	t.true(typeof server.sslCert === 'object');
	t.true(typeof server.listen === 'function');
	t.true(typeof server.close === 'function');
});

test('express endpoint', async t => {
	const server = await createTestServer();

	server.get('/foo', (req, res) => {
		res.send('bar');
	});

	const response = await got(server.url + '/foo');
	t.is(response.body, 'bar');
});

test('server can be stopped and restarted', async t => {
	const server = await createTestServer();

	t.plan(3);

	await got(server.url + '/foo').catch(err => {
		t.is(err.statusCode, 404);
	});

	await server.close();

	await got(server.url + '/foo', { timeout: 100 }).catch(err => {
		t.is(err.code, 'ETIMEDOUT');
	});

	await server.listen();

	await got(server.url + '/foo').catch(err => {
		t.is(err.statusCode, 404);
	});
});
