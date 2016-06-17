#!/usr/bin/env node

var meow = require('meow');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');

const cli = meow(`
    Usage:
        $ update-dependents [options] <package-name>

    update-dependents is used to update the referenced version of the given
    <package-name> in all dependents of <package-name>.
    e.g. if we're updating dependents of pkg a and b uses a as a dependency,
    then a's use in b's package.json will get its version bumped to whatever
    version a has in it's package.json (together with the default prefix of '~').
    The prefix can be changed with the -p (--prefix) flag.

    Options:
        -h, --help            print usage information
        -v, --version         show version info and exit
        -a, --add <path>      add path in which to search for dependents
                 (defaults to current working directory if no -a is given)
        -p, --prefix          sets the prefix to use (default '~')
        -d, --dry-run         prints out what would be updated but does not
                  actually update
`, {
  alias: {
    v: 'version',
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

var isDryRun = cli.flags.dryRun || false;
if (isDryRun) console.log(chalk.red('This is a dry run…'));

require('update-dependents')(pkgName, {
  paths,
  versionPrefix
}, (err, result) => {
  if (err) {
    console.log(err.message);
    process.exit(-1);
  }
  var originalRes = result.original[pkgName];
  var updatedRes = result.updated[pkgName];

// TODO: refactor:
  updatedRes.dependents.dependencyDependents.forEach(dependent => {
    var originalDependent = originalRes.dependents.dependencyDependents.find((dep => dep.pkgJSON.name === dependent.pkgJSON.name));
    if (originalDependent && originalDependent.pkgJSON.dependencies[pkgName] !== dependent.pkgJSON.dependencies[pkgName]) {
      if (isDryRun){
        console.log(`would update ${dependent.pkgJSON.name}.${chalk.blue('dependencies')}.${pkgName} from ${originalDependent.pkgJSON.dependencies[pkgName]} to ${dependent.pkgJSON.dependencies[pkgName]}`);
      } else {
        fs.writeFile(path.join(dependent.absPath, 'package.json'), JSON.stringify(dependent.pkgJSON, null, 2), (err) => {
          console.log(`updated ${dependent.pkgJSON.name}.${chalk.blue('dependencies')}.${pkgName} from ${originalDependent.pkgJSON.dependencies[pkgName]} to ${dependent.pkgJSON.dependencies[pkgName]}`);
        });
      }
    }
  });
  updatedRes.dependents.peerDependencyDependents.forEach(peerDependent => {
    var originalDependent = originalRes.dependents.peerDependencyDependents.find((dep => dep.pkgJSON.name === dependent.pkgJSON.name));
    if (originalDependent && originalDependent.pkgJSON.peerDependencies[pkgName] !== dependent.pkgJSON.peerDependencies[pkgName]) {
      if (isDryRun){
        console.log(`would update ${dependent.pkgJSON.name}.${chalk.green('peerDependencies')}.${pkgName} from ${originalDependent.pkgJSON.peerDependencies[pkgName]} to ${dependent.pkgJSON.peerDependencies[pkgName]}`);
      } else {
        fs.writeFile(path.join(dependent.absPath, 'package.json'), JSON.stringify(dependent.pkgJSON, null, 2), (err) => {
          console.log(`updated ${dependent.pkgJSON.name}.${chalk.green('peerDependencies')}.${pkgName} from ${originalDependent.pkgJSON.peerDependencies[pkgName]} to ${dependent.pkgJSON.peerDependencies[pkgName]}`);
        });
      }
    }
  });
  updatedRes.dependents.devDependencyDependents.forEach(devDependent => {
    var originalDependent = originalRes.dependents.devDependencyDependents.find((dep => dep.pkgJSON.name === dependent.pkgJSON.name));
    if (originalDependent && originalDependent.pkgJSON.devDependencies[pkgName] !== dependent.pkgJSON.devDependencies[pkgName]) {
      if (isDryRun){
        console.log(`would update ${dependent.pkgJSON.name}.${chalk.red('devDependencies')}.${pkgName} from ${originalDependent.pkgJSON.devDependencies[pkgName]} to ${dependent.pkgJSON.devDependencies[pkgName]}`);
      } else {
        fs.writeFile(path.join(dependent.absPath, 'package.json'), JSON.stringify(dependent.pkgJSON, null, 2), (err) => {
          console.log(`updated ${dependent.pkgJSON.name}.${chalk.red('devDependencies')}.${pkgName} from ${originalDependent.pkgJSON.devDependencies[pkgName]} to ${dependent.pkgJSON.devDependencies[pkgName]}`);
        });
      }
    }
  });
});
