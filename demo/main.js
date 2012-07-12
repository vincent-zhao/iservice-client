/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var _me = require(__dirname + '/../').createClient({
  'hosts'   : 'localhost:2181',
    'root'  : '/demo'
});

_me.setEventHandle('error', function (error) {
});

var config = _me.createConfig('group1/app1');

config.setEventHandle('error', function (error) {
  console.log(error);
});

config.setEventHandle('change', function (rev, prev) {
  console.log('config changed: ' + rev);
  config.get('key1', null, function (error, data) {
    console.log('--> key1 : ' + data);
  });
});

console.log('iservice subscribe config on "group1/app1"');

