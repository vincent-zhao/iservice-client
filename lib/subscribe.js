var Util = require('util');
var Path = require('path');
var fs   = require('fs');
var url  = require('url');
var http = require('http');
var Tool = require(__dirname + '/tool.js');
var Events  = require(__dirname + '/events.js');
var EventEmitter = require('events').EventEmitter;

var DEFAULT_TIMEOUT  = 10000;
var DEFAULT_INTERVAL = 60 * 1000;

var WHOAMI  = [require('os').hostname(), process.pid, ];
setInterval(function () {
  WHOAMI[0] = require('os').hostname();
}, 60000);

try {
  exports.version = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf-8').trim()).version;
} catch (e) {
  exports.version = 'unknown';
}

/*{{{ Service constructor */
var Service = function (name, filter, _options, config) {
  this.options = {
    sync_interval : 3 * 60 * 1000,
  };
  for (var i in _options) {
    this.options[i] = _options[i];
  }
  for (var i in config) {
    this.options[i] = config[i];
  }

  this._http = require(__dirname + '/http-client.js').create({
    'prefix'    : '/api',
    'heartbeat' : 60000,
    'pingurl' : '/ping',
    'timeout' : 100,      /**<    timeout for http call (ms)  */
  }); 

  var self = this;
  this.options.host.split(',').forEach(function (item) {
    item = item.split(':');
    self._http.bind(item[0], item[1] || 80);
  });

  this.selfFolder = Tool.normalize(this.options.cache + '/' + this.options.folderPrefix + process.pid + '/service_cache/service/' + name);

  this.name = name;
  this.filter = filter;
  this.allServices = [];
  this.availables = [];
  this.pointer = 0;

  this.doHB = false;
  this.cancel = false;

  process.nextTick(function(){
    self.start();
  });
}
Util.inherits(Service, EventEmitter);
module.exports = Service;
/*}}}*/

/*{{{ Service.prototype.start() */
Service.prototype.start = function () {

  var self = this;

  /*{{{ doCheck() */
  var doCheck = function () {
    if (!self.cancel) {
      self.check(function (err, data) {
        if (err) {
          self.emit('error', err);
          return next();
        }
        parseRes(data, function (err, data) {
          if (err) {
            self.emit('error', err);
            return next();
          }
          self.sync(data, function (err) {
            if (err) {
              self.emit('error', err);
              return next();
            }
            self.set(function (err) {
              if (err) {
                self.emit('error', err);
              }
              return next();
            });
          });
        });
      });
    }
  }
  /*}}}*/

  /*{{{ next() */
  var next = function () {
    setTimeout(doCheck, self.options['sync_interval']);
  }
  /*}}}*/

  doCheck();
}
/*}}}*/

/*{{{ Service.prototype.cancel() */
Service.prototype.cancel = function () {
  this.cancel = true;
}
/*}}}*/

/*{{{ Service.prototype.get() */
Service.prototype.get = function () {
  if (this.availables.length === 0) {
    return this.allServices[0];
  }

  if (!this.availables[this.pointer]) {
    this.pointer = 0;
  }
  return this.availables[this.pointer++];
}
/*}}}*/

/*{{{ Service.prototype.set() */
Service.prototype.set = function (callback) {
  //set with filter
  var self = this;
  
  var cover = function (dir, callback) {
    var folders = fs.readdirSync(dir);
    for (var i = 0; i < folders.length; i++) {
      var path = dir + '/' + folders[i];
      if (fs.statSync(path).isDirectory()) {
        cover(path, callback);
      } else {
        callback(path, JSON.parse(fs.readFileSync(path).toString()));
      }
    }
  }

  var map = {};
  cover(self.selfFolder, function (key, val) {
    if (val.data !== 'new') {
      try {
        map[key] = JSON.parse(val.data);
      } catch(e) {
        return;
      }
    }
  });

  process.nextTick(function(){
    var arr = filter(map);
    var newServices = [];
    for (var i = 0;i < arr.length; i++) {
      newServices.push(arr[i]);
    }
    self.allServices = newServices;
    if (!self.doHB) {
      self.availables = Tool.clone(self.allServices);
    }
    self.emit('update', Tool.clone(self.allServices));
    callback && callback();
  });

}
/*}}}*/

/*{{{ Service.prototype.check() */
Service.prototype.check = function (callback) {
  var cfg = {
    'User-Agent'  : 'iservice-client@' + exports.version,
    'x-app-token' : this.options.token,
    'x-app-uuid'  : WHOAMI.join('-') + '-' + parseInt(100000 * Math.random(), 10),
  };
  
  var url = Util.format('/%s/%s', 'tree',
      encodeURIComponent(Tool.clean(Tool.normalize(this.options.root + '/service/' + this.name))));
   
  this._http.get(url, function (error, data) {
    callback(error, data);
  });
}
/*}}}*/

/*{{{ Service.prototype.sync() */
Service.prototype.sync = function (services, callback) {
  var self = this;
  
  var evt = Events.create(function (error) {
    if (!error) {
      Tool.rmdir(self.selfFolder)
      fs.renameSync(self.selfFolder + '_tmp', self.selfFolder);
      fs.renameSync(self.selfFolder + '.zk_tmp', self.selfFolder + '.zk');
    }
    callback(error);
  });

  Tool.rmdir(self.selfFolder + '_tmp');
  services = services || {};

  if (Object.keys(services).length === 0) {
    evt.wait('empty', function(){
      evt.emit('empty', Tool.iError('NoService', 'no service'));
    });
  }

  for (var key in services) {
    (function () {
      var idx = key;
      evt.wait(idx, function () {
        var relative = idx.substr(('/service/' + self.name).length);
        var _fn = '';
        if (Tool.normalize('/' + relative) !== '/') {
          _fn = Tool.normalize(self.selfFolder + '_tmp/' + relative + '.zk');
        } else {
          _fn = Tool.normalize(self.selfFolder + '.zk_tmp');
        }
        Tool.mkdir(Path.dirname(_fn));
        fs.writeFile(_fn, JSON.stringify(services[idx]), 'utf-8', function (error) {
          evt.emit(idx, error);
        });
      });
    })();
  }
}
/*}}}*/

/*{{{ Service.prototype.setHB() */
Service.prototype.setHB = function (func) {
  var self = this;
  var options; 
  if (typeof(func) === 'object' || !func) {
    options = {};
    for (var i in func) {
      options[i] = func[i];
    }
    func = defaultHttp;
  }

  self.doHB = true;

  var check = function () {
    if (self.cancel) {
      return;
    }
    var newAvailables = [];
    var count = self.allServices.length;
    if (count === 0) {
      setTimeout(check, 1000);
      return;
    }
    self.allServices.forEach(function (service) {
      func(service, function (error) {
        if (!error) {
          newAvailables.push(service);
        }
        if (--count === 0) {
          self.availables = newAvailables;
          setTimeout(check, (options && options.interval) ? options.interval : DEFAULT_INTERVAL);
        }
      }, options);
    });
  }
  check();
}
/*}}}*/

/*{{{ defaultHttp() */
function defaultHttp(addr, callback, options){
  addr = 'http://' + addr;
  var parts = url.parse(addr);
  var _options = {
    host : parts.hostname,
    port : parts.port,
    path : (options && options.path) ? options.path : '/status.taobao',
    method : (options && options.method) ? options.method : 'GET'
  }

  var id;
  function onceCb(err) {
    if(id){
      clearTimeout(id);
      id = null;
      callback(err);
    }
  }

  var req = http.request(_options, function (res) {
    res.on('data', function (chunk) {});

    res.on('end', function () {
      if (res.statusCode < 300 && res.statusCode >= 200) {
        onceCb();
      } else {
        onceCb(new Error('SERVICE_UNAVAILABLE'));
      } 
    }); 

    res.on('error', function (err) {
      onceCb(err);  
    });
  });

  id = setTimeout(function(){
    req.abort();
  }, (options && options.timeout) ?  options.timeout : DEFAULT_TIMEOUT);

  req.end((options && options.body) ? options.body : '');

  req.on('error', function (err) {
    onceCb(new Error('SERVICE_UNAVAILABLE'));
  });

}
/*}}}*/

/* {{{ parseRes() */
function parseRes(data, callback) {
  try { 
    data = JSON.parse(data.toString());
  } catch (e) {
    return callback('FormatError', Tool.iError(e));
  }

  if (!data) {
    return callback('FormatError', 'empty data');
  }

  if (data.error) {
    return callback('RemoteError', data.error);
  }

  callback(null, data.data);
};
/* }}} */

/*{{{ filter() */
function filter(map){
  var arr = [];
  for (var i in map) {
    arr.push(map[i].addr);
  }
  return arr;
}
/*}}}*/

