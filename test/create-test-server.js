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
	t.is(server.url, `http://${server.host}:${server.port}`);
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
