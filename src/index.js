'use strict';

const http = require('http');
const express = require('express');
const getPort = require('get-port');
const pify = require('pify');

const createTestServer = () => getPort().then(port => {
	const app = express();
	const server = http.createServer(app);

	app.host = 'localhost';
	app.port = port;
	app.url = `http://${app.host}:${app.port}`;
	app.listen = pify(server.listen.bind(server, app.port));
	app.close = pify(server.close.bind(server));

	return app.listen().then(() => app);
});

module.exports = createTestServer;
