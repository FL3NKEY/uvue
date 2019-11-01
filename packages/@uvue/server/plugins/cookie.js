import { KoaAdapter } from '@uvue/server';
import merge from 'lodash/merge';

export default {
  install(server, options = {}) {
    const { secret, options: opts } = merge(
      {},
      {
        secret: '',
        options: {},
      },
      options,
    );

    if (!secret) {
      console.warn('No secret defined for your cookies!');
    }

    const adapter = server.getAdapter();
    if (adapter instanceof KoaAdapter) {
      server.getApp().keys = [secret];
    } else {
      server.use(require('cookie-parser')(secret, opts));
    }
  },
};
