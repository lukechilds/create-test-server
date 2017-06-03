'use strict';

const http = require('http');
const https = require('https');
const express = require('express');
const getPort = require('get-port');
const pify = require('pify');
const createCert = require('create-cert');

const createTestServer = opts => Promise.all([
	getPort(),
	getPort(),
	createCert(opts && opts.certificate)
])
	.then(results => {
		const port = results[0];
		const sslPort = results[1];
		const cert = results[2];

		const app = express();
		app.caCert = cert.caKeys.cert;
		app.url = `http://localhost:${port}`;
		app.sslUrl = `https://localhost:${sslPort}`;

		const server = http.createServer(app);
		const sslServer = https.createServer(cert.keys, app);

		app.listen = () => Promise.all([
			pify(server.listen.bind(server))(port),
			pify(sslServer.listen.bind(sslServer))(sslPort)
		]);
		app.close = () => Promise.all([
			pify(server.close.bind(server))(),
			pify(sslServer.close.bind(sslServer))()
		]);

		return app.listen().then(() => app);
	});

module.exports = createTestServer;
