#!/usr/bin/env node

var meow = require('meow');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var updateDependents = require('update-dependents').default;
var pkgJSONInfoDict = require('pkg-json-info-dict').pkgJSONInfoDict;
var pkgDependents = require('pkg-dependents');

const cli = meow(`
    Usage:
        $ update-dependents <package-name> [options]

    update-dependents is used to update the referenced version of the given
    <package-name> in all dependents of <package-name>.
    e.g. if we're updating dependents of pkg a and b uses a as a dependency,
    then a's use in b's package.json will get its version bumped to whatever
    version a has in it's package.json (together with the default prefix of '~').
    The prefix can be changed with the -p (--prefix) flag.

    Options:
        -h, --help                    Print usage information.
        -v, --version                 Show version info and exit.
        -n, --new-version <version>   The new version of package. If this is not given and the package
                  exists in the given paths, it is read and its version in package.json is used.
        -a, --add <path>              Add path in which to search for dependents.
                 (defaults to current working directory if no -a is given)
        -p, --prefix                  Sets the prefix to use (default '~').
        -d, --dry-run                 Prints out what would be updated but does not
                  actually update
`, {
  alias: {
    v: 'version',
    n: 'new-version',
    h: 'help',
    a: 'add',
    p: 'prefix',
    d: 'dry-run'
  }
});


var pkgName = cli.input[0];
if (pkgName === undefined) {
  console.log('You need to specify which package to work with');
  process.exit(-1);
}

var paths = undefined;
if (Array.isArray(cli.flags.add)) {
  paths = cli.flags.add;
} else if (cli.flags.add !== undefined){
  paths = [cli.flags.add];
} else {
  paths = [process.cwd()];
}

var versionPrefix = cli.flags.prefix || '~';
var newVersion = cli.flags.n;

var isDryRun = cli.flags.dryRun || false;
if (isDryRun) console.log(chalk.red('This is a dry run…'));

pkgJSONInfoDict(paths, (err, result) => {
  if (Object.keys(result).length === 0) {
    console.log(`Not able to find info on package ${pkgName} in the paths: ${paths}`);
    process.exit(-1);
  }
  var dependents = pkgDependents.dependentsOf(pkgName, result);
  // console.log(dependents);
  // if new version is not given in cli opts, read it from file
  if (!newVersion) {
    var pkgJSON = JSON.parse(fs.readFileSync(result.absPath).toString());
    newVersion = pkgJSON.version;
    if (!newVersion) {
      console.log('Not able to find a new version to update to');
      process.exit(-1);
    }
  }
  var dependentsUpdated = updateDependents(pkgName, newVersion, dependents, { versionPrefix });

  Object.keys(dependentsUpdated.dependencyDependents).forEach(key => {
    var originalPkgJSONInfo = dependents.dependencyDependents[key];
    var updatedPkgJSONInfo = dependentsUpdated.dependencyDependents[key];

    if (originalPkgJSONInfo && originalPkgJSONInfo.pkgJSON.dependencies[pkgName] !== updatedPkgJSONInfo.pkgJSON.dependencies[pkgName]) {
      if (isDryRun) {
        console.log(`would update ${originalPkgJSONInfo.pkgJSON.name}.${chalk.blue('dependencies')}.${pkgName} from ${originalPkgJSONInfo.pkgJSON.dependencies[pkgName]} to ${updatedPkgJSONInfo.pkgJSON.dependencies[pkgName]}`);
      } else {
        fs.writeFileSync(path.join(updatedPkgJSONInfo.absPath, 'package.json'), JSON.stringify(updatedPkgJSONInfo.pkgJSON, null, 2));
        console.log(`updated ${updatedPkgJSONInfo.pkgJSON.name}.${chalk.blue('dependencies')}.${pkgName} from ${originalPkgJSONInfo.pkgJSON.dependencies[pkgName]} to ${updatedPkgJSONInfo.pkgJSON.dependencies[pkgName]}`);
      }
    }
  });

  Object.keys(dependentsUpdated.peerDependencyDependents).forEach(key => {
    var originalPkgJSONInfo = dependents.peerDependencyDependents[key];
    var updatedPkgJSONInfo = dependentsUpdated.peerDependencyDependents[key];

    if (originalPkgJSONInfo && originalPkgJSONInfo.pkgJSON.peerDependencies[pkgName] !== updatedPkgJSONInfo.pkgJSON.peerDependencies[pkgName]) {
      if (isDryRun) {
        console.log(`would update ${originalPkgJSONInfo.pkgJSON.name}.${chalk.green('peerDependencies')}.${pkgName} from ${originalPkgJSONInfo.pkgJSON.peerDependencies[pkgName]} to ${updatedPkgJSONInfo.pkgJSON.peerDependencies[pkgName]}`);
      } else {
        fs.writeFileSync(path.join(updatedPkgJSONInfo.absPath, 'package.json'), JSON.stringify(updatedPkgJSONInfo.pkgJSON, null, 2));
        console.log(`updated ${updatedPkgJSONInfo.pkgJSON.name}.${chalk.green('peerDependencies')}.${pkgName} from ${originalPkgJSONInfo.pkgJSON.peerDependencies[pkgName]} to ${updatedPkgJSONInfo.pkgJSON.peerDependencies[pkgName]}`);
      }
    }
  });

  Object.keys(dependentsUpdated.devDependencyDependents).forEach(key => {
    var originalPkgJSONInfo = dependents.devDependencyDependents[key];
    var updatedPkgJSONInfo = dependentsUpdated.devDependencyDependents[key];

    if (originalPkgJSONInfo && originalPkgJSONInfo.pkgJSON.devDependencies[pkgName] !== updatedPkgJSONInfo.pkgJSON.devDependencies[pkgName]) {
      if (isDryRun) {
        console.log(`would update ${originalPkgJSONInfo.pkgJSON.name}.${chalk.red('devDependencies')}.${pkgName} from ${originalPkgJSONInfo.pkgJSON.devDependencies[pkgName]} to ${updatedPkgJSONInfo.pkgJSON.devDependencies[pkgName]}`);
      } else {
        fs.writeFile(path.join(updatedPkgJSONInfo.absPath, 'package.json'), JSON.stringify(updatedPkgJSONInfo.pkgJSON, null, 2));
        console.log(`updated ${updatedPkgJSONInfo.pkgJSON.name}.${chalk.red('devDependencies')}.${pkgName} from ${originalPkgJSONInfo.pkgJSON.devDependencies[pkgName]} to ${updatedPkgJSONInfo.pkgJSON.devDependencies[pkgName]}`);
      }
    }
  });
});
