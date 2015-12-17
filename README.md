multiproxy
==========

[![npm version](https://badge.fury.io/js/multi-proxy.svg)](https://badge.fury.io/js/multi-proxy) [![Build Status](https://travis-ci.org/mookjp/multi-proxy.svg)](https://travis-ci.org/mookjp/multi-proxy) [![Coverage Status](https://coveralls.io/repos/mookjp/multi-proxy/badge.svg?branch=master&service=github)](https://coveralls.io/github/mookjp/multi-proxy?branch=master)

```
        👉💻 👉
💻 👉👉        👉👉💻
        👉💻 👉
```

## Run examples

```
npm install --global babel-cli

# Run proxy server with origin servers
babel-node --presets es2015,stage-2 -- example/app.js

# Send request to proxy server
curl -v -XGET localhost:9999/index/hoge/fuga
```
