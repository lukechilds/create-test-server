'use strict';

const http = require('http');
const https = require('https');
const express = require('express');
const pify = require('pify');
const createCert = require('create-cert');
const bodyParser = require('body-parser');

const createServer = (keys, opts) => {
	const server = express();
	server.http = http.createServer(server);

	if (keys) {
		server.https = https.createServer(keys, server);
		server.caCert = keys.caCert;
	}

	server.set('etag', false);

	if (opts.bodyParser !== false) {
		server.use(bodyParser.json(Object.assign({ limit: '1mb', type: 'application/json' }, opts.bodyParser)));
		server.use(bodyParser.text(Object.assign({ limit: '1mb', type: 'text/plain' }, opts.bodyParser)));
		server.use(bodyParser.urlencoded(Object.assign({ limit: '1mb', type: 'application/x-www-form-urlencoded', extended: true }, opts.bodyParser)));
		server.use(bodyParser.raw(Object.assign({ limit: '1mb', type: 'application/octet-stream' }, opts.bodyParser)));
	}

	const send = fn => (req, res, next) => {
		const cb = typeof fn === 'function' ? fn(req, res, next) : fn;

		Promise.resolve(cb).then(val => {
			if (val) {
				res.send(val);
			}
		});
	};

	const get = server.get.bind(server);
	server.get = function () {
		const [path, ...handlers] = [...arguments];

		for (const handler of handlers) {
			get(path, send(handler));
		}
	};

	server.listen = () => {
		const promises = [
			pify(server.http.listen.bind(server.http))().then(() => {
				server.port = server.http.address().port;
				server.url = `http://localhost:${server.port}`;
			})
		];
		if (server.https) {
			promises.push(
				pify(server.https.listen.bind(server.https))().then(() => {
					server.sslPort = server.https.address().port;
					server.sslUrl = `https://localhost:${server.sslPort}`;
				})
			);
		}
		return Promise.all(promises);
	};

	server.close = () => {
		const promises = [
			pify(server.http.close.bind(server.http))().then(() => {
				server.port = undefined;
				server.url = undefined;
			})
		];
		if (server.https) {
			promises.push(
				pify(server.https.close.bind(server.https))().then(() => {
					server.sslPort = undefined;
					server.sslUrl = undefined;
				})
			);
		}
		return Promise.all(promises);
	};

	return server.listen().then(() => server);
};

module.exports = (opts = {}) => {
	if (opts.certificate === false) {
		return createServer(null, opts);
	}

	return createCert(opts.certificate).then(keys => createServer(keys, opts));
};
