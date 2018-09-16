import UVue from '@uvue/core';
import getContext from './getContext';
import { doRedirect, RedirectError } from '@uvue/core/lib/redirect';

/**
 * Function called when a route is being resolved
 * Call hooks and next() if needed
 */
export default async (context, { to, next } = {}) => {
  const routeContext = getContext(context, to);

  try {
    // Call hooks on route resolve
    await UVue.invokeAsync('routeResolve', routeContext);
  } catch (error) {
    if (error instanceof RedirectError) {
      // Do redirect
      doRedirect(context, error);
      return;
    } else {
      // Call hooks if there is an error
      await UVue.invokeAsync('routeError', error, routeContext);
    }
  }

  // If inside navigation guard
  if (next) next();
};