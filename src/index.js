'use strict';

const http = require('http');
const https = require('https');
const express = require('express');
const pify = require('pify');
const createCert = require('create-cert');
const bodyParser = require('body-parser');

const createTestServer = opts => createCert(opts && opts.certificate)
	.then(keys => {
		const app = express();
		const get = app.get.bind(app);
		const server = http.createServer(app);
		const sslServer = https.createServer(keys, app);
		const send = fn => (req, res, next) => {
			const cb = typeof fn === 'function' ? fn(req, res, next) : fn;

			new Promise(resolve => resolve(cb)).then(val => {
				if (val) {
					res.send(val);
				}
			});
		};

		app.set('etag', false);
		app.use(bodyParser.json({ type: 'application/json' }));
		app.use(bodyParser.text({ type: 'text/plain' }));
		app.use(bodyParser.urlencoded({ type: 'application/x-www-form-urlencoded', extended: true }));
		app.use(bodyParser.raw({ type: 'application/octet-stream' }));

		app.caCert = keys.caCert;

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

		app.get = function (...args) {
			const [path, fns] = args;
			for (const fn of fns) {
				get(path, send(fn));
			}
		};

		return app.listen().then(() => app);
	});

module.exports = createTestServer;
