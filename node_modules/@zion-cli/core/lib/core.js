#!/usr/bin/env node
/* eslint-disable import/no-dynamic-require, global-require */
const importLocal = require("import-local");

if (importLocal(__filename)) {
  require("npmlog").info("cli", "现在使用zion-cli本地版本");
} else {
  require(".")(process.argv.slice(2));
}

