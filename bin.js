#!/usr/bin/env node
var run = require("./index.js").run;

run(process.argv).on("exit", code => process.exit(code));
