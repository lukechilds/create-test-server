'use strict';

const http = require('http');
const https = require('https');
const express = require('express');
const pify = require('pify');
const createCert = require('create-cert');

const createTestServer = opts => createCert(opts && opts.certificate)
	.then(keys => {
		const app = express();
		const server = http.createServer(app);
		const sslServer = https.createServer(keys, app);

		app.set('etag', false);

		app.caCert = keys.caCert;

		app.listen = () => Promise.all([
			pify(server.listen.bind(server))().then(() => {
				app.url = `http://localhost:${server.address().port}`;
			}),
			pify(sslServer.listen.bind(sslServer))().then(() => {
				app.sslUrl = `https://localhost:${sslServer.address().port}`;
			})
		]);

		app.close = () => Promise.all([
			pify(server.close.bind(server))().then(() => {
				app.url = undefined;
			}),
			pify(sslServer.close.bind(sslServer))().then(() => {
				app.sslUrl = undefined;
			})
		]);

		return app.listen().then(() => app);
	});

module.exports = createTestServer;
