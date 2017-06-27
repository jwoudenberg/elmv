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
  parsedArgs = parseArgs(args);
  switch (unalias(tool)) {
    case "elm":
      return parsedArgs._[0] || process.cwd();
    case "elm-format":
      return parsedArgs._[0] || process.cwd();
    case "elm-test":
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
  return shell
    .exec(`npm view ${unalias(tool)}@latest version`, { silent: true })
    .trim();
}

function findVersion(root, tool) {
  var elmvJsonPath = path.join(root, "elmv.json");
  var elmvJson = fs.existsSync(elmvJsonPath) ? require(elmvJsonPath) : {};
  var version = elmvJson[unalias(tool)];
  if (!version) {
    version = elmvJson[unalias(tool)] = latest(unalias(tool));
    // Only create an elmv.json if we're in an elm project directory.
    var elmJsonPath = path.join(root, "elm-package.json");
    if (fs.existsSync(elmJsonPath)) {
      fs.writeFileSync(elmvJsonPath, JSON.stringify(elmvJson, null, 2));
    }
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

function run(argv, elmvdir = getElmvdir()) {
  var tool = path.basename(argv[1]);
  var args = argv.slice(2);
  var root = findRoot(activePath(tool, args));
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
