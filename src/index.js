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
		const server = http.createServer(app);
		const sslServer = https.createServer(cert.keys, app);

		app.caCert = cert.caKeys.cert;

		app.listen = () => Promise.all([
			getPort().then(port => pify(server.listen.bind(server))(port).then(() => {
				app.url = `http://localhost:${port}`;
			})),
			getPort().then(sslPort => pify(sslServer.listen.bind(sslServer))(sslPort).then(() => {
				app.sslUrl = `https://localhost:${sslPort}`;
			}))
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
