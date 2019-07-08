import * as pino from 'pino';
import { RenderCache } from 'vue-server-renderer';
import { IAdapterOptions } from './IAdapterOptions';
import { IPlugin } from './IPlugin';

/**
 * Options to init server
 */
export interface IServerOptions {
  distPath?: string;
  uvueDir?: string;

  // Logger options
  logger?: pino.LoggerOptions;

  // SPA paths with no SSR
  spaPaths?: string[];

  // Webpack configurations (for development mode)
  webpack?: {
    client: any;
    server: any;
  };

  // Configure HTTP server
  adapter?: any;
  adapterArgs?: any[];

  httpOptions?: IAdapterOptions;

  // Renderer options
  renderer?: {
    cache?: RenderCache;
    directives?: {
      [name: string]: any;
    };
    shouldPreload?: (file: string, type: string) => boolean;
    shouldPrefetch?: (file: string, type: string) => boolean;
  };

  // Dev server options
  devServer?: {
    middleware?: any;
    hot?: any;
    proxy?: any;
    proxyMiddleware?: any;
  };

  // Plugins to install
  plugins?: IPlugin[];
}
