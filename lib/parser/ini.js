/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var cleanquote = function (val) {
  if (/^-?(\d|\.)+$/.test(val)) {
    return val - 0;
  }

  var _me   = [];

  val = val.replace(/^("|')+/, '').replace(/("|')+$/, '');
  for (var i = 0; i < val.length; i++) {
    var the = val.slice(i, i + 1);
    if ('\\' == the) {
      i++;
      _me.push(val.slice(i, i + 1));
    } else {
      _me.push(the);
    }
  }

  return _me.join('');
};

exports.parse = function (fdata) {
  var data  = {};
  var sect  = null;

  fdata.split('\n').forEach(function(line) {
    line = line.trim();
    if (!line.length || ';' == line.slice(0, 1)) {
      return;
    }

    var match = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (match) {
      sect  = match[1];
      data[sect] = {};
    } else {
      var match = line.match(/^\s*([^=\s]+)\s*=\s*(.*)\s*$/);
      if (!match) {
        return;
      }

      var key = match[1];
      var tmp = cleanquote(match[2]);
      if (sect) {
        data[sect][key] = tmp;
      } else {
        data[key] = tmp;
      }
    }
  });

  return data;
};

