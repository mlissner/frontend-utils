var domain = require('domain');
var fs = require('fs');

process.on('uncaughtException', function(err) {
    console.error('Caught exception: ', err);
});

try{
    process.nextTick(function() {
        setTimeout(function() { // simulating some various async stuff
            fs.open('non-existent file', 'r', function(er, fd) {
                if (er) throw er;
            });
        }, 100);
    });
}catch(e){
    console.error(e);
    consol.log('catch nothing!');
}

var d = domain.create();
d.on('error', function(er) {
    console.error('Caught error!', er);
});
d.run(function() {
    process.nextTick(function() {
        setTimeout(function() { // simulating some various async stuff
            fs.open('non-existent file', 'r', function(er, fd) {
                if (er) throw er;
            });
        }, 100);
    });
});