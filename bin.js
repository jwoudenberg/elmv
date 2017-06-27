#!/usr/bin/env node
var run = require("./index.js").run;

var child = run(process.argv);
if (child) {
  child.on("exit", code => process.exit(code));
}
