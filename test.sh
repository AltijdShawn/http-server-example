#!/usr/bin/env bash

current_date=$(date +"%Y-%m-%d_%H-%M-%S")

_DIR=./test_resp/$current_date
_BASE=localhost:3000

mkdir -p $_DIR $_DIR/unit $_DIR/assets

curl -v $_BASE      > $_DIR/_BASE.html
curl -v $_BASE/a    > $_DIR/_BASE-a.html
curl -v $_BASE/b    > $_DIR/_BASE-b.html
curl -v $_BASE/c    > $_DIR/_BASE-c.html
curl -v $_BASE/_    > $_DIR/_BASE-_.html
curl -v $_BASE/_/a  > $_DIR/_BASE-_-a.html
curl -v $_BASE/_/b  > $_DIR/_BASE-_-b.html
curl -v $_BASE/_/c  > $_DIR/_BASE-_-c.html
curl -v $_BASE/0    > $_DIR/_BASE-0.html

curl -v -X GET $_BASE/test/uwu > $_DIR/unit/test_uwu_GET.html
curl -v -X POST $_BASE/test/uwu > $_DIR/unit/test_uwu_POST.html

curl -v $_BASE/base.css         > $_DIR/assets/base.css
curl -v $_BASE/assets/base.css  > $_DIR/assets/assets-base.css
curl -v $_BASE/setup.js         > $_DIR/assets/setup.js
curl -v $_BASE/assets/setup.js  > $_DIR/assets/assets-setup.js

curl -v $_BASE/core/reloadRoutes > $_DIR/_._BASE-core-reloadRoutes.json
