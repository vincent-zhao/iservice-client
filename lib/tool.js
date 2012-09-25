var fs   = require('fs');
var Path = require('path');
var Util = require('util');
var exec = require('child_process').exec;
var Events  = require(__dirname + '/events.js');

/*{{{ clone() */
function clone(obj){
  var _type = typeof(obj);
  if ('object' == _type && null !== obj) {
    var _me = Array.isArray(obj) ? [] : {};
    for (var i in obj) {
      _me[i] = clone(obj[i]);
    }
    return _me;
  }

  return obj;
}
exports.clone = clone;
/*}}}*/

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
    try {
      fs.readdirSync(dir).forEach(function (file) {
        try {
          var m = dir + '/' + file;
          if (fs.statSync(m).isDirectory()) {
            rm(m) || fs.rmdirSync(m);
          } else {
            fs.unlinkSync(m);
          }   
        } catch(e) {
          return;
        }   
      }); 
    } catch(e) {
      return;
    }   
  })(path);

  try {
    fs.rmdirSync(path);
  } catch(e) {
    return;
  }
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

/*{{{ dump() */
function dump(dir, prefix, copy, callback){
  getPids(function (err, pids) {
    if (err) {
      callback && callback(err);
      return;
    }
    var arr = getSorted(pids);
    if (!arr || arr.length === 0) {
      callback && callback(new Error('no old config'));
      return;
    }
    var chosen = arr.pop();
    if (copy) {
      exec('cp -r ' + dir + '/' + chosen.path + ' ' + dir + '/' + prefix + process.pid, function (error, stdout, stderr) {
        if (err) {
          callback && callback(err);
          return;
        }
        deleteFolders(arr, function (err) {
          callback && callback(err);
        });
      });
    } else {
      deleteFolders(arr, function (err) {
        callback && callback(err);
      });
    }
  });

  /*{{{ deleteFolders() */
  function deleteFolders(arr, callback){
    var arr2 = [];
    for (var i = 0; i < arr.length; i++) {
      arr2.push(dir + '/' + arr[i].path);
    }
    if (arr2.length > 0) {
      arr2.forEach(function (one) {
        rmdir(one);
      });
    }
    callback && callback();
  }
  /*}}}*/

  /*{{{ getSorted() */
  function getSorted(pids){
    var folders = fs.readdirSync(dir);
    var arr = [];
    for (var idx = 0; idx < folders.length; idx++) {
      if (folders[idx].indexOf(prefix) !== 0) {
        continue;
      }
      try {
        if ((fs.statSync(dir + '/' + folders[idx]).isDirectory()) && (!contain(pids, folders[idx].substr(prefix.length)))) {
          arr.push({
            path : folders[idx],
            ctime : fs.statSync(dir + '/' + folders[idx]).ctime.valueOf()
          });
        }
      } catch(e) {
        continue;
      }
    }

    var sorted = arr.sort(function (a, b) {
      if (a.ctime > b.ctime) {
        return 1;
      } else if (a.ctime === b.ctime) {
        if (a.path > b.path) {
          return 1;
        } else {
          return -1;
        }
      } else {
        return -1;
      }
    });

    return sorted;
  }
  /*}}}*/

}
exports.dump = dump;
/*}}}*/

/*{{{ getPids() */
function getPids(callback){
  var pid = process.pid;
  var command = 'ps aux | grep %d | awk \'{if ($2 == %d) {print $0}}\' | ' + 
          'awk \'{val = ""; idx = 0; while (idx <= NF) {if (idx > 10) {val = val" "$idx;} idx++;} print(val"|"NF)}\'';
  exec(Util.format(command, pid, pid), function (error, stdout, stderr) {
    if (error) {
      callback(error);
      return
    }
    var parts = stdout.split('\n').shift().substr(1).split('|');
    command = 'ps aux | grep \'%s\' | grep -v grep | awk \'{if (NF == %d) {print $2}}\'';
    var c = Util.format(command, parts[0], parseInt(parts[1], 10));
    exec(c, function (error, stdout, stderr) {
      if (error) {
        callback(error);
        return;
      }
      var arr = stdout.split('\n');
      var res = [];
      for (var i = 0; i < arr.length; i++) {
        arr[i] && res.push(arr[i]);
      }
      callback(null, res);
    });
  });
}
exports.getPids = getPids;
/*}}}*/

/*{{{ contain() */
function contain(arr, one){
  if (!Array.isArray(arr)) {
    return false;
  }
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] === one) {
      return true;
    }
  }
  return false;
}
exports.contain = contain;
/*}}}*/

