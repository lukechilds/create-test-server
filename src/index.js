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
		const app = express();
		app.port = results[0];
		app.sslPort = results[1];
		app.sslCert = results[2];
		app.host = 'localhost';
		app.url = `http://${app.host}:${app.port}`;
		app.sslUrl = `https://${app.host}:${app.sslPort}`;

		const server = http.createServer(app);
		const sslServer = https.createServer({
			key: app.sslCert.keys.clientKey,
			cert: app.sslCert.keys.certificate
		}, app);

		app.listen = () => Promise.all([
			pify(server.listen.bind(server))(app.port),
			pify(sslServer.listen.bind(sslServer))(app.sslPort)
		]);
		app.close = () => Promise.all([
			pify(server.close.bind(server))(),
			pify(sslServer.close.bind(sslServer))()
		]);

		return app.listen().then(() => app);
	});

module.exports = createTestServer;
