import NodeCache from 'node-cache';

export const myCache = new NodeCache({
    stdTTL: 86400,
    checkperiod: 2000
});