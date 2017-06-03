# create-test-server

> Creates a minimal express server for testing

[![Build Status](https://travis-ci.org/lukechilds/create-test-server.svg?branch=master)](https://travis-ci.org/lukechilds/create-test-server)
[![Coverage Status](https://coveralls.io/repos/github/lukechilds/create-test-server/badge.svg?branch=master)](https://coveralls.io/github/lukechilds/create-test-server?branch=master)
[![npm](https://img.shields.io/npm/v/create-test-server.svg)](https://www.npmjs.com/package/create-test-server)

Inspired by the `createServer()` helper function in the [Got tests](https://github.com/sindresorhus/got/blob/1f1b6ffb6da13f483ef7f6bd92dd33f022e7de47/test/helpers/server.js).

A simple interface for creating a preconfigured express instance listening for both HTTP and HTTPS traffic.

A self signed certificate is automatically generated for SSL. An associated CA certificate is also returned for you to validate against.

## Install

```shell
npm install --save-dev create-test-server
```

## Usage

`createTestServer()` has a Promise based API that pairs well with a modern asynchronous test runner such as [AVA](https://github.com/avajs/ava).

You can create a separate server per test:

```js
import test from 'ava';
import got from 'got';
import createTestServer from 'create-test-server';

test(async t => {
  const server = await createTestServer();

  console.log(server.url);
  // http://localhost:5486
  console.log(server.sslUrl);
  // https://localhost:5487

  // This is just an express route
  // You could use any express middleware too
  server.get('/foo', (req, res) => res.send('bar'));

  const response = await got(server.url + '/foo');
  t.is(response.body, 'bar');
});
```

Or share a server across multiple tests:

```js
let server;

test.before(async () => {
  server = await createTestServer();
  server.get('/foo', (req, res) => res.send('bar'));
});

test(async t => {
  const response = await got(server.url + '/foo');
  t.is(response.body, 'bar');
});

test(async t => {
  const response = await got(server.url + '/foo');
  t.is(response.statusCode, 200);
});
```

You can also make properly authenticated SSL requests by validating against the provided CA certificate:

```js
test(async t => {
  const server = await createTestServer({ certificate: 'foobar.com' });
  server.get('/foo', (req, res) => res.send('bar'));

  const response = await got(server.sslUrl + '/foo', {
    strictSSL: true,
    ca: server.caCert,
    headers: { host: 'foobar.com' }
  });
  t.is(response.body, 'bar');
});
```

## License

MIT © Luke Childs
