/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var Emitter  = require('events').EventEmitter;
var Util     = require('util');
var Path     = require('path');
var Url      = require('url');
var Http     = require('http');
var Tool     = require(__dirname + '/tool.js');

var DEFAULT_INTERVAL = 30 * 1000;
var DEFAULT_TIMEOUT  = 10 * 1000;

exports.create = function (conf, store) {

  var options = {
    'prefix'  : '/service',
    'timeout' : 60000,
  }
  
  for (var i in conf) {
    options[i] = conf[i];
  }

  var _me = {};

  _me.subscribe = function (name, filter) {
    return new Subscribe(name, filter, options, store);
  }

  _me.register = function () {
  }

  return _me;
}

/*{{{ Subscribe constructor */
var Subscribe = function (name, filter, options, store) {
  Emitter.call(this);
  this.on('error', function (error) {
  });

  this.name    = name;
  this.filter  = filter;
  this.options = options;
  this.root = Path.normalize(options['prefix'] + '/' + name);

  this.allServices = [];
  this.availables  = [];
  this.doHB = false;
  this.cancel = false;

  this.store = store;

  var _self = this;
  process.nextTick(function(){
    _self.start();
  });
}
Util.inherits(Subscribe, Emitter);
exports.Subscribe = Subscribe;
/*}}}*/

/*{{{ Subscribe.prototype.start()*/
Subscribe.prototype.start = function () {
  var _self = this;

  /*{{{ sync() */
  var sync = function (callback) {
    _self.store.sync(_self.root, function (error) {
      if (error) {
        _self.emit('error', error);
      } else {
        _self.set();
      }
      callback && callback();
    });
  }
  /*}}}*/

  sync(function () {
    _self.store.watch(_self.root, _self.options.timeout, function (error, rev) {
      if (error) {
        return _self.emit('error', error);
      }
      sync();
    });
  });
}
/*}}}*/

/*{{{ Subscribe.prototype.cancel() */
Subscribe.prototype.cancel = function () {
  this.cancel = true;
}
/*}}}*/

/*{{{ Subscribe.prototype.get() */
Subscribe.prototype.get = function () {
  if (this.availables.length === 0) {
    return this.allServices[0];
  }

  if (!this.availables[this.pointer]) {
    this.pointer = 0;
  }
  return this.availables[this.pointer++];
}
/*}}}*/

/*{{{ Subscribe.prototype.set() */
Subscribe.prototype.set = function () {
  var _self = this;
  _self.store.getTree(_self.root, function (error, tree) {
    if (error) {
      _self.emit('error');

    } else {
      var map = {};
      for (var key in tree) {
        try {
          map[key] = JSON.parse(tree[key].data);
        } catch(e) {
          continue;
        }
      }

      process.nextTick(function(){
        var arr = filter(map);
        var newServices = [];
        for (var i = 0;i < arr.length; i++) {
          newServices.push(arr[i]);
        }
        _self.allServices = newServices;
        if (!_self.doHB) {
          _self.availables = Tool.clone(_self.allServices);
        }
        _self.emit('change', Tool.clone(_self.allServices));
      });
    }
  });
}
/*}}}*/

/*{{{ Subscribe.prototype.setHB() */
Subscribe.prototype.setHB = function (func) {
  var _self = this;
  var options; 
  if (typeof(func) === 'object' || !func) {
    options = {};
    for (var i in func) {
      options[i] = func[i];
    }
    func = defaultHttp;
  }

  _self.doHB = true;

  var check = function () {
    if (_self.cancel) {
      return;
    }
    var newAvailables = [];
    var count = _self.allServices.length;
    if (count === 0) {
      setTimeout(check, 1000);
      return;
    }
    _self.allServices.forEach(function (service) {
      func(service, function (error) {
        if (!error) {
          newAvailables.push(service);
        }
        if (--count === 0) {
          _self.availables = newAvailables;
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
  var parts = Url.parse(addr);
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

  var req = Http.request(_options, function (res) {
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

/*{{{ filter() */
function filter(map){
  var arr = [];
  for (var i in map) {
    arr.push(map[i].addr);
  }
  return arr;
}
/*}}}*/

