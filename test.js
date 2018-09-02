import test from "ava";
import elmv from "./index.js";
import semver from "semver";
import os from "os";
import path from "path";
import fs from "fs";
import sinon from "sinon";
import shell from "shelljs";
import parseArgs from "minimist";

test("latest", t => {
  var result = elmv.latest("elm");
  t.true(semver.gte(result, "0.18.0"));
});

var activePaths = {
  "elm-format": process.cwd(),
  "elm-format ~/Test.elm": "~/Test.elm",
  "elm-format --output Test2.elm ~/Test.elm": "~/Test.elm",
  "elm-test tests/**/*.elm": process.cwd()
};

Object.keys(activePaths).forEach(cmd =>
  test(`activePath - ${cmd}`, t => {
    var argv = cmd.split(" ");
    var command = argv[0];
    var args = argv.slice(1);
    var parsedArgs = parseArgs(args);
    var result = elmv.activePath(command, parsedArgs);
    t.is(result, activePaths[cmd]);
  })
);

test("findRoot - elm-package.json", t => {
  var root = "/path/to";
  sinon
    .stub(fs, "existsSync")
    .callsFake(file => file === path.join(root, "elm-package.json"));
  var result = elmv.findRoot("/path/to/a/deep/sub/directory");
  t.is(result, root);
});

test("findRoot - elm.json", t => {
  var root = "/path/to";
  sinon
    .stub(fs, "existsSync")
    .callsFake(file => file === path.join(root, "elm.json"));
  var result = elmv.findRoot("/path/to/a/deep/sub/directory");
  t.is(result, root);
});

test("findRoot - fallback when no elm-package.json exists", t => {
  sinon.stub(fs, "existsSync").callsFake(() => false);
  var result = elmv.findRoot("/path/to/a/deep/sub/directory");
  t.is(result, process.cwd());
});

test("findVersion - version stored in elmv.json", t => {
  var root = cleanTestDir();
  var elmvJsonPath = path.join(root, "elmv.json");
  var versions = {
    "elm-format": "0.6.1-alpha"
  };
  fs.writeFileSync(elmvJsonPath, JSON.stringify(versions));
  var result = elmv.findVersion(root, "elm-format");
  t.is(result, versions["elm-format"]);
});

test("findVersion - version not stored in elmv.json and elm-package.json present", t => {
  var root = cleanTestDir();
  var elmvJsonPath = path.join(root, "elmv.json");
  var elmJsonPath = path.join(root, "elm-package.json");
  var versions = {
    "elm-format": "0.1.0-old"
  };
  fs.writeFileSync(elmvJsonPath, JSON.stringify(versions));
  fs.writeFileSync(elmJsonPath, "{}");
  var result = elmv.findVersion(root, "elm-test");
  var newVersions = JSON.parse(
    fs.readFileSync(elmvJsonPath, { encoding: "utf8" })
  );
  t.is(result, elmv.latest("elm-test"));
  t.is(newVersions["elm-test"], elmv.latest("elm-test"));
  t.is(newVersions["elm-format"], versions["elm-format"]);
});

test("findVersion - no elmv.json or elm-package.json present", t => {
  var root = cleanTestDir();
  var elmvJsonPath = path.join(root, "elmv.json");
  var result = elmv.findVersion(root, "elm-test");
  t.is(result, elmv.latest("elm-test"));
  t.false(fs.existsSync(elmvJsonPath));
});

test("findBin - tool is not yet installed", t => {
  var elmvdir = cleanTestDir();
  var bin = elmv.findBin(elmvdir, "elm-repl", "0.18.0");
  var status = shell.exec(`${bin} --help`, { silent: true }).code;
  t.is(status, 0);
});

test("findBin - tool is already installed", t => {
  var elmvdir = cleanTestDir();
  // Trigger installation.
  elmv.findBin(elmvdir, "elm-repl", "0.18.0");
  // Retrigger, this time installation should not happen.
  var spy = sinon.spy(shell, "exec");
  elmv.findBin(elmvdir, "elm-repl", "0.18.0");
  t.false(spy.called);
});

test("switchVersion", t => {
  var root = cleanTestDir();
  var elmvJsonPath = path.join(root, "elmv.json");
  var elmJsonPath = path.join(root, "elm-package.json");
  var versions = {
    elm: "0.18.0"
  };
  fs.writeFileSync(elmvJsonPath, JSON.stringify(versions));
  fs.writeFileSync(elmJsonPath, "{}");
  elmv.switchVersion(root, "elm-reactor", "0.17");
  var newVersions = JSON.parse(
    fs.readFileSync(elmvJsonPath, { encoding: "utf8" })
  );
  t.is(newVersions["elm"], "0.17.1");
});

test("run", t => {
  var testdir = cleanTestDir();
  var elmvdir = cleanTestDir();
  var argv = ["/usr/local/bin/node", "/usr/local/bin/elm", "--help"];
  shell.cd(testdir);
  t.notThrows(() => elmv.run(argv, elmvdir));
});

test.afterEach.always(() => {
  if (fs.existsSync.restore) fs.existsSync.restore();
  if (shell.exec.restore) shell.exec.restore();
});

function cleanTestDir() {
  var prefix = path.join(os.tmpdir(), "test-elmv-");
  return fs.mkdtempSync(prefix);
}
