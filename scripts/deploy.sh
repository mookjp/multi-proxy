#!/bin/bash

echo -e "$NPM_USERNAME\n$NPM_PASSWORD\nmookjpy@gmail.com" | npm login
npm publish
