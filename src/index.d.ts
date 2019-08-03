import {Express} from 'express';
import {Server as HttpServer} from 'http';
import {Server as HttpsServer} from 'https';

declare namespace createTestServer {
	interface Options {
		bodyParser?: false | object;
		certificate?: string | {days?: number, commonName?: string};
	}

	interface Server extends Omit<Express, 'listen' | 'close'> {
		url: string | undefined;
		port: number | undefined;
		sslUrl: string | undefined;
		sslPort: number | undefined;
		caCert: string;
		http: HttpServer;
		https: HttpsServer;

		listen: () => Promise<void>;
		close: () => Promise<void>;
	}
}

declare function createTestServer(options: createTestServer.Options): Promise<createTestServer.Server>;

export = createTestServer;
