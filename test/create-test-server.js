import test from 'ava';
import createTestServer from '../';

test('createTestServer is a function', t => {
	t.is(typeof createTestServer, 'function');
});
