'use strict';

const http = require('http');
const https = require('https');
const express = require('express');
const pify = require('pify');
const createCert = require('create-cert');
const bodyParser = require('body-parser');

const createTestServer = (opts = {}) => createCert(opts.certificate)
	.then(keys => {
		const app = express();
		const server = http.createServer(app);
		const sslServer = https.createServer(keys, app);
		app.caCert = keys.caCert;

		app.set('etag', false);

		if (opts.bodyParser !== false) {
			app.use(bodyParser.json(Object.assign({ limit: '1mb', type: 'application/json' }, opts.bodyParser)));
			app.use(bodyParser.text(Object.assign({ limit: '1mb', type: 'text/plain' }, opts.bodyParser)));
			app.use(bodyParser.urlencoded(Object.assign({ limit: '1mb', type: 'application/x-www-form-urlencoded', extended: true }, opts.bodyParser)));
			app.use(bodyParser.raw(Object.assign({ limit: '1mb', type: 'application/octet-stream' }, opts.bodyParser)));
		}

		const send = fn => (req, res, next) => {
			const cb = typeof fn === 'function' ? fn(req, res, next) : fn;

			new Promise(resolve => resolve(cb)).then(val => {
				if (val) {
					res.send(val);
				}
			});
		};

		const get = app.get.bind(app);
		app.get = function () {
			const [path, ...handlers] = [...arguments];

			for (const handler of handlers) {
				get(path, send(handler));
			}
		};

		app.listen = () => Promise.all([
			pify(server.listen.bind(server))().then(() => {
				app.port = server.address().port;
				app.url = `http://localhost:${app.port}`;
			}),
			pify(sslServer.listen.bind(sslServer))().then(() => {
				app.sslPort = sslServer.address().port;
				app.sslUrl = `https://localhost:${app.sslPort}`;
			})
		]);

		app.close = () => Promise.all([
			pify(server.close.bind(server))().then(() => {
				app.port = undefined;
				app.url = undefined;
			}),
			pify(sslServer.close.bind(sslServer))().then(() => {
				app.sslPort = undefined;
				app.sslUrl = undefined;
			})
		]);

		return app.listen().then(() => app);
	});

module.exports = createTestServer;
