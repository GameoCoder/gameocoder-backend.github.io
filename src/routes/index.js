const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
// const eventRoutes = require('./eventRoutes');

router.use('/', authRoutes);

module.exports = router;

//This code sets up the main router for the application, combining authentication and event-related routes.

/*
Bug fix:
For this error:
throw new TypeError('Router.use() requires a middleware function but got a ' + gettype(fn))
      ^

TypeError: Router.use() requires a middleware function but got a Object
    at router.use (/home/victus/Documents/GitHub/gameocoder-backend.github.io/node_modules/express/lib/router/index.js:469:13)
    at Object.<anonymous> (/home/victus/Documents/GitHub/gameocoder-backend.github.io/src/routes/index.js:6:8)
    at Module._compile (node:internal/modules/cjs/loader:1738:14)
    at Object..js (node:internal/modules/cjs/loader:1871:10)
    at Module.load (node:internal/modules/cjs/loader:1470:32)
    at Module._load (node:internal/modules/cjs/loader:1290:12)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:238:24)
    at Module.require (node:internal/modules/cjs/loader:1493:12)
    at require (node:internal/modules/helpers:152:16)


 */