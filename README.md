# create-test-server

> Creates a minimal express server for testing

[![Build Status](https://travis-ci.org/lukechilds/create-test-server.svg?branch=master)](https://travis-ci.org/lukechilds/create-test-server)
[![Coverage Status](https://coveralls.io/repos/github/lukechilds/create-test-server/badge.svg?branch=master)](https://coveralls.io/github/lukechilds/create-test-server?branch=master)
[![npm](https://img.shields.io/npm/v/create-test-server.svg)](https://www.npmjs.com/package/create-test-server)

Inspired by the `createServer()` helper function in the [Got tests](https://github.com/sindresorhus/got/blob/1f1b6ffb6da13f483ef7f6bd92dd33f022e7de47/test/helpers/server.js).

A simple interface for creating a preconfigured express instance listening for both HTTP and HTTPS traffic.

Ports are chosen at random for HTTP/HTTPS. A self signed certificate is automatically generated, along with an associated CA certificate for you to validate against.

## Install

```shell
npm install --save-dev create-test-server
```

## Usage

```js
const createTestServer = require('create-test-server');

createTestServer().then(server => {
  console.log(server.url);
  // http://localhost:5486
  console.log(server.sslUrl);
  // https://localhost:5487

  // This is just an express route
  // You could use any express middleware too
  server.get('/foo', (req, res) => {
    res.send('bar');
  });

  // server.url + '/foo' and server.sslUrl + '/foo' will respond with 'bar'
});
```

`createTestServer()` has a Promise based API that pairs well with a modern asynchronous test runner such as [AVA](https://github.com/avajs/ava).

You can create a separate server per test:

```js
import test from 'ava';
import got from 'got';
import createTestServer from 'create-test-server';

test(async t => {
  const server = await createTestServer();
  server.get('/foo', (req, res) => res.send('bar'));

  const response = await got(`${server.url}/foo`);
  t.is(response.body, 'bar');

  await server.close();
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
  const response = await got(`${server.url}/foo`);
  t.is(response.body, 'bar');
});

test(async t => {
  const response = await got(`${server.url}/foo`);
  t.is(response.statusCode, 200);
});

test.after(async () => {
	await server.close();
});
```

You can also make properly authenticated SSL requests by setting a common name for the server certificate and validating against the provided CA certificate:

```js
test(async t => {
  const server = await createTestServer({ certificate: 'foobar.com' });
  server.get('/foo', (req, res) => res.send('bar'));

  const response = await got(`${server.sslUrl}/foo`, {
    ca: server.caCert,
    headers: { host: 'foobar.com' }
  });
  t.is(response.body, 'bar');

  await server.close();
});
```

You can still make an SSL connection without messing about with certificates if your client supports unauthorised SSL requests:

```js
test(async t => {
  const server = await createTestServer();
  server.get('/foo', (req, res) => res.send('bar'));

  const response = await got(`${server.sslUrl}/foo`, {
    rejectUnauthorized: false
  });
  t.is(response.body, 'bar');

  await server.close();
});
```

You can also easily stop/restart the server. Notice how a new port is used when we listen again:

```js
const server = await createTestServer();
console.log(server.url);
// 'http://localhost:56711'

await server.close();
console.log(server.url);
// undefined

await server.listen();
console.log(server.url);
// 'http://localhost:56804'
```

## API

### createTestServer([options])

Returns a Promise which resolves to an (already listening) server.

#### options

Type: `object`

##### options.certificate

Type: `string`, `object`<br>
Default: `undefined`

SSL certificate options to be passed to [`createCert()`](https://github.com/lukechilds/create-cert).

### server

express instance resolved from `createTestServer()`

This is just a normal express instance with a few extra properties.

#### server.url

Type: `string`, `undefined`

The url you can reach the HTTP server on.

e.g: `'http://localhost:5486'`

`undefined` while the server is not listening.

#### server.sslUrl

Type: `string`, `undefined`

The url you can reach the HTTPS server on.

e.g: `'https://localhost:5487'`

`undefined` while the server is not listening.

#### server.caCert

Type: `string`

The CA certificate to validate the server certificate against.˜

#### server.listen()

Type: `function`

Returns a Promise that resolves when both the HTTP and HTTPS servers are listening.

Once the servers are listening, `server.url` and `server.sslUrl` will be updated.

Please note, this function doesn't take a port argument, it uses a new randomised port each time. Also, you don't need to manually call this after creating a server, it will start listening automatically.

#### server.close()

Type: `function`

Returns a Promise that resolves when both the HTTP and HTTPS servers have stopped listening.

Once the servers have stopped listening, `server.url` and `server.sslUrl` will be set to `undefined`.

## Related

- [`create-cert`](https://github.com/lukechilds/create-cert) - Super simple self signed certificates

## License

MIT © Luke Childs
