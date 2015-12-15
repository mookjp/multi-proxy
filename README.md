multiproxy
==========

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
