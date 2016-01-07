multi-proxy
==========

[![npm version](https://badge.fury.io/js/multi-proxy.svg)](https://badge.fury.io/js/multi-proxy) [![Build Status](https://travis-ci.org/mookjp/multi-proxy.svg)](https://travis-ci.org/mookjp/multi-proxy) [![Coverage Status](https://coveralls.io/repos/mookjp/multi-proxy/badge.svg?branch=master&service=github)](https://coveralls.io/github/mookjp/multi-proxy?branch=master)

multi-proxy is a simple proxy to send requests to multiple destinations and
reduces responses to a single response.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Contents

- [Getting started](#getting-started)
- [How it works](#how-it-works)
  - [master mode](#master-mode)
  - [replica mode](#replica-mode)
- [Logger](#logger)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Getting started

Install this via npm then use as a middleware of [senchalabs/connect](https://github.com/senchalabs/connect).

```
npm install --save multi-proxy
```

See fully example inside `/example` directory of this repository.

## How it works

multi-proxy can be used as a connect middleware. You can initialize it with:

* Patterns to forward a request
* Destination servers

For example, this code sets up multi-proxy to 3 destinations including `master` server. 
If a request matches the one in patterns, the request is sent to all
destinations and responses from them will be reduced to the one from `master` server.

```
# Initialise proxy with patterns and destinations
var multiProxy = require('multi-proxy');
var serversWithMaster = {
  master: `http://localhost:3000`,
  replica: [
    `http://localhost:3001`,
    `http://localhost:3002`
  ]
};
var patterns = [
  { method: 'GET', path: /^\/my\.index\/my\.type/ },
  { method: 'GET', path: /^\/another\.index\/another\.type/ },
  { method: 'GET', path: /^\/nothing/ }
];
var proxy = new ProxyServer(serversWithMaster, patterns);

# Set up your connect app
var connect = require('connect');
var app = connect();
app.use(multiProxy(servers, patterns));

var http = require('http');
http.createServer(app).listen(8000);
```

### master mode

Here is the figure how it works by master mode and code example as it was introduced.

NOTICE: You can see fully example inside `/example` directory of this repository.

```
                      ┌──────────────────┐
                      │                  │
                      │      Client      │
                      │                  │
                      └────────▲──┬──────┘
                                  │
                               │  │  1. POST /something/nice
                                  │
                      ┌────────┴──▼──────┐
                      │                  │
                      │   multi-proxy    │
                      │                  │
                      └────────▲──┬──────┘
                                  │
 3. By master mode,            │  │  pattern: {
    only response from master     │    method: "POST",
    will be returned           │  │    path: /^\/something/.+/
                                  │  }
                               │  ▼
                                Λ
                               ╱ ╲   2. Only matched request
                              ▕   ▏     is forwarded to destinations
                               ╲ ╱
                              ▲ V
         ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
        │ ┌─────────────────────┼─────────────────────┐
          │                     │                     │
┌───────┴─▼────────┐  ┌─────────▼────────┐  ┌─────────▼────────┐
│                  │  │                  │  │                  │
│      master      │  │    replica_a     │  │    replica_b     │
│                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

```
# Initialise proxy with patterns and destinations
var multiProxy = require('multi-proxy');
var serversWithMaster = {
  master: `http://localhost:3000`,
  replica: [
    `http://localhost:3001`,
    `http://localhost:3002`
  ]
};
var patterns = [
  { method: 'GET', path: /^\/my\.index\/my\.type/ },
  { method: 'GET', path: /^\/another\.index\/another\.type/ },
  { method: 'GET', path: /^\/nothing/ }
];
var proxy = new ProxyServer(serversWithMaster, patterns);

# Set up your connect app
var connect = require('connect');
var app = connect();
app.use(multiProxy(servers, patterns));

var http = require('http');
http.createServer(app).listen(8000);
```

### replica mode

In replica mode, multi-proxy doesn't have `master` server as a destination.

It has only some replicas as destinations and if every status code from replicas is the same,
it returns a reduced single response from replicas. The response is the one which has been got at first.
Requests are sent to all replicas but the response to client is the one.

If every status code is not the same, it returns 500 response to the client.

```
                          ┌──────────────────┐
                          │                  │
                          │      Client      │
                          │                  │
                          └────────▲──┬──────┘
                                      │
                                   │  │  1. POST /something/nice
                                      │
                          ┌────────┴──▼──────┐
                          │                  │
                          │   multi-proxy    │
                          │                  │
                          └────────▲──┬──────┘
                                      │
3. Only if all status code         │  │  pattern: {
   from responses are the same,       │    method: "POST",
   return a response from replicas │  │    path: /^\/something/.+/
                                      │  }
                                   │  ▼
                                    Λ
                                   ╱ ╲   2. Only matched request
                                  ▕   ▏     is forwarded to destinations
                                   ╲ ╱
                                    V ▲
                                    │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
              ┌─────────────────────┼─────────────────────┐ │
              │                     │                     │
    ┌─────────▼────────┐  ┌─────────▼────────┐  ┌─────────▼─┴──────┐
    │                  │  │                  │  │                  │
    │    replica_a     │  │    replica_b     │  │    replica_c     │
    │                  │  │                  │  │                  │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
```

```
# Initialise proxy with patterns and destinations
var multiProxy = require('multi-proxy');
var serversWithoutMaster = {
  replica: [
    `http://localhost:3001`,
    `http://localhost:3002`
  ]
};
var patterns = [
  { method: 'GET', path: /^\/my\.index\/my\.type/ },
  { method: 'GET', path: /^\/another\.index\/another\.type/ },
  { method: 'GET', path: /^\/nothing/ }
];

# Set up your connect app
var connect = require('connect');
var app = connect();
app.use(multiProxy(servers, patterns));

var http = require('http');
http.createServer(app).listen(8000);
```

## Logger

You can configure your own logging config. See below:

```
var LOGTYPE = require('multi-proxy').LOGTYPE;

// level should be the one of levels of https://github.com/nomiddlename/log4js-node
var loggerConfig = {
  type: LOGTYPE.DATEFILE,
  level: log4js.levels.DEBUG
};
app.use(multiProxy(servers, patterns, loggerConfig));
```

The logger is based on [log4js-node](https://github.com/nomiddlename/log4js-node)
