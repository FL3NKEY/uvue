import { HandleFunction } from 'connect';
import http from 'http';
import https from 'https';
import http2 from 'http2';

export interface IAdapter {
  // Create framework instance and HTTP server
  createApp(...args: any[]);

  // Add middlewares
  use(middleware: HandleFunction): any;
  use(path: string, middleware: HandleFunction): any;

  // Start/stop server
  start(): Promise<void>;
  stop(): Promise<void>;

  // Main middleware to render pages
  setupRenderer(): void;
  renderMiddleware(req: http.IncomingMessage, res: http.ServerResponse): Promise<any>;

  // Proxy utility
  proxy(path: string, options: any, middleware?: any): void;

  // Getters
  getApp(): any;
  getHttpServer(): http.Server | https.Server | http2.Http2Server;
  getPort(): number;
  getHost(): string;
  isHttps(): boolean;
}
