var cp = require("child_process");
var path = require("path");
var os = require("os");
var fs = require("fs");
var shell = require("shelljs");
var parseArgs = require("minimist");
var mkdirp = require("mkdirp");

function findRoot(startPath) {
  var dir = path.resolve(startPath);
  while (dir !== path.dirname(dir)) {
    var elmJsonPath = path.join(dir, "elm-package.json");
    if (fs.existsSync(elmJsonPath)) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function activePath(tool, args) {
  switch (unalias(tool)) {
    case "elm":
      return args._[0] || process.cwd();
    case "elm-format":
      return args._[0] || process.cwd();
    case "elm-test":
      return process.cwd();
    case "elm-verify-examples":
      return process.cwd();
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

function unalias(tool) {
  var aliases = {
    "elm-make": "elm",
    "elm-package": "elm",
    "elm-reactor": "elm",
    "elm-repl": "elm"
  };
  return aliases[tool] || tool;
}

function latest(tool) {
  var cmd = `npm view ${unalias(tool)}@latest version --json`;
  var res = shell.exec(cmd, { silent: true });
  return JSON.parse(res);
}

function findVersion(root, tool) {
  var elmvJsonPath = path.join(root, "elmv.json");
  var elmvJson = fs.existsSync(elmvJsonPath) ? require(elmvJsonPath) : {};
  var version = elmvJson[unalias(tool)];
  if (!version) {
    version = elmvJson[unalias(tool)] = latest(unalias(tool));
    saveElmvJson(root, elmvJson);
  }
  return version;
}

function findBin(elmvdir, tool, version) {
  var basedir = path.join(elmvdir, `${unalias(tool)}-${version}`);
  var binpath = path.join(basedir, "node_modules", ".bin", tool);
  if (!fs.existsSync(binpath)) {
    console.log(`Installing ${unalias(tool)} version ${version}...`);
    mkdirp.sync(basedir);
    var cwd = process.cwd();
    shell.cd(basedir);
    shell.exec(`npm install ${unalias(tool)}@${version}`);
    shell.cd(cwd);
    console.log("Installation complete!");
  }
  return binpath;
}

function getElmvdir() {
  return path.join(os.homedir(), ".elmv");
}

function switchVersion(root, tool, dirtyVersion) {
  var cmd = `npm view ${unalias(tool)}@${dirtyVersion} version --json`;
  var res = shell.exec(cmd, { silent: true });
  if (res.trim() === "") {
    return console.log(`Could not find version ${dirtyVersion} of ${tool}.`);
  }
  var versions = JSON.parse(res);
  var version = versions instanceof Array
    ? versions[versions.length - 1]
    : versions;
  var elmvJsonPath = path.join(root, "elmv.json");
  var elmvJson = fs.existsSync(elmvJsonPath) ? require(elmvJsonPath) : {};
  elmvJson[unalias(tool)] = version;
  saveElmvJson(root, elmvJson);
  console.log(`Now using ${unalias(tool)} version ${version}`);
}

function saveElmvJson(root, elmvJson) {
  // Only create an elmv.json if we're in an elm project directory.
  var elmJsonPath = path.join(root, "elm-package.json");
  var elmvJsonPath = path.join(root, "elmv.json");
  if (fs.existsSync(elmJsonPath)) {
    fs.writeFileSync(elmvJsonPath, JSON.stringify(elmvJson, null, 2));
  }
}

function run(argv, elmvdir = getElmvdir()) {
  var tool = path.basename(argv[1]);
  var args = argv.slice(2);
  var parsedArgs = parseArgs(args);
  var root = findRoot(activePath(tool, parsedArgs));
  if (parsedArgs.use) {
    return switchVersion(root, tool, parsedArgs.use);
  }
  var version = findVersion(root, tool);
  var bin = findBin(elmvdir, tool, version);
  var child = cp.spawn(bin, args, {
    stdio: [process.stdin, process.stdout, process.stderr]
  });
  return child;
}

exports.run = run;
// More exports here for tests.
exports.latest = latest;
exports.activePath = activePath;
exports.findRoot = findRoot;
exports.findVersion = findVersion;
exports.findBin = findBin;
exports.switchVersion = switchVersion;
