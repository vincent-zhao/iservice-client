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

});
