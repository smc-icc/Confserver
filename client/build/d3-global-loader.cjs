'use strict';
// D3 v3 reads this.document in its top-level IIFE. Webpack strict modules
// otherwise invoke it with undefined; bind only this legacy entry explicitly.
module.exports=function adaptD3(source){if(!/\}\(\);\s*$/.test(source))throw Error('Unexpected d3 v3 entry; review the compatibility loader');return source.replace(/\}\(\);(\s*)$/,'}.call(globalThis);$1');};
