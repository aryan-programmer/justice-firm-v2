import memoizee from "memoizee";
// @ts-ignore
import memoizeWeakOrig from "memoizee/weak";

export const memoizeWeak: <F extends (...args: any[]) => any>(f: F, options?: memoizee.Options<F>) => F & memoizee.Memoized<F> = memoizeWeakOrig;
