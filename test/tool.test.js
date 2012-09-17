var fs      = require('fs');
var should  = require('should');
var exec    = require('child_process').exec;

describe('tool test', function () {

  /*{{{ should_rmdir_works_fine() */
  it('should_rmdir_works_fine', function (done) {
    var root = __dirname + '/run';
    fs.mkdirSync(root + '/dir_test');
    fs.mkdirSync(root + '/dir_test/dir1');
    fs.mkdirSync(root + '/dir_test/dir2');
    fs.writeFileSync(root + '/dir_test/file1');
    fs.writeFileSync(root + '/dir_test/dir1/file2');
    require(__dirname + '/../lib/tool.js').rmdir(root + '/dir_test');
    try {
      fs.statSync(root + '/dir_test');
    } catch(e) {
      done();
    }
  });
  /*}}}*/

  it('should_isMin_works_fine', function (done) {
    var file = __dirname + '/run/tmp.js';
    var content = 
      'var tool = require(__dirname + \'/../../lib/tool.js\');' +
      'setTimeout(function(){tool.isMin(function(error, min){console.log(min);});},1000);' + 
      'setTimeout(function(){},3000);';
    fs.writeFileSync(file, content);

    var command = 'node ' + file;

    var out1;
    var out2;
    exec(command, function (error, stdout, stderr) {
      out1 = stdout;
      if (out2 !== undefined) {
        if ((out1 === 'true\n' && out2 === 'false\n') || (out1 === 'false\n' && out2 === 'true\n')) {
          fs.unlinkSync(file);
          done();
        }
      }
    });

    exec(command, function (error, stdout, stderr) {
      out2 = stdout;
      if (out1 !== undefined) {
        if ((out1 === 'true\n' && out2 === 'false\n') || (out1 === 'false\n' && out2 === 'true\n')) {
          fs.unlinkSync(file);
          done();
        }
      }
    });
  });

});
