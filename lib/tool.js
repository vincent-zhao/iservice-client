var fs   = require('fs');
var Path = require('path');
var Util = require('util');
var exec = require('child_process').exec;

/*{{{ clean() */
function clean(str, mode){
  var m = str.length;
  var i = 0;
  var j = m - 1;

  mode = mode || 3;
  if (mode & 1) {
    for (i = 0; i < m; i++) {
      var c = str.charCodeAt(i);
      if (c > 32 && c != 47) {
        break;
      }
    }
  }

  if (mode & 2) {
    for (j = m - 1; j > i; j--) {
      var c = str.charCodeAt(j);
      if (c > 32 && c != 47) {
        break;
      }
    }
  }

  return str.slice(i, j + 1);
}
exports.clean = clean;
/*}}}*/

/*{{{ mkdir() */
function mkdir(path, mode){
  if (!Path.existsSync(path)) {
    var p = Path.dirname(path);
    if (p && p !== path) {
      mkdir(p);
    }
    fs.mkdirSync(path, mode || 493/**<  0755    */);
  }
}
exports.mkdir = mkdir;
/*}}}*/

/*{{{ rmdir() */
function rmdir(path){
  try {
    if (!fs.statSync(path).isDirectory()) {
      return true;
    }
  } catch (e) {
    return;
  }

  (function rm(dir) {
    fs.readdirSync(dir).forEach(function (file) {
      var m = dir + '/' + file;
      if (fs.statSync(m).isDirectory()) {
        rm(m) || fs.rmdirSync(m);
      } else {
        fs.unlinkSync(m);
      }
    });
  })(path);

  fs.rmdirSync(path);
};
exports.rmdir = rmdir;
/*}}}*/

/*{{{ normalize() */
function normalize(key) {
  return key.replace(/\/{2,}/g, '/');
};
exports.normalize = normalize;
/*}}}*/

/*{{{ iError() */
function iError(name, error) {
  if (!(error instanceof Error)) {
    error = new Error(error);
  }
  error.name = name || 'Unknown';
  return error;
}
exports.iError = iError;
/*}}}*/

