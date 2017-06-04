'use strict';

const http = require('http');
const https = require('https');
const express = require('express');
const getPort = require('get-port');
const pify = require('pify');
const createCert = require('create-cert');

const createTestServer = opts => createCert(opts && opts.certificate)
	.then(cert => {
		const app = express();
		app.caCert = cert.caKeys.cert;
		Object.defineProperty(app, 'url', {
			get: () => typeof app.port === 'undefined' ? undefined : `http://localhost:${app.port}`
		});
		Object.defineProperty(app, 'sslUrl', {
			get: () => typeof app.sslPort === 'undefined' ? undefined : `https://localhost:${app.sslPort}`
		});

		const server = http.createServer(app);
		const sslServer = https.createServer(cert.keys, app);

		app.listen = () => Promise.all([
			getPort().then(port => {
				app.port = port;
				return pify(server.listen.bind(server))(port);
			}),
			getPort().then(sslPort => {
				app.sslPort = sslPort;
				return pify(sslServer.listen.bind(sslServer))(sslPort);
			})
		]);

		app.close = () => Promise.all([
			pify(server.close.bind(server))().then(() => {
				app.port = undefined;
			}),
			pify(sslServer.close.bind(sslServer))().then(() => {
				app.sslPort = undefined;
			})
		]);

		return app.listen().then(() => app);
	});

module.exports = createTestServer;
