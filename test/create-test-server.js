import test from 'ava';
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
