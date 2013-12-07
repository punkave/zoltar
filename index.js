var fs = require('fs');
var glob = require('glob');
var _ = require('lodash');
var exec = require('child_process').exec;
var url = require('url');
var basename = require('path').basename;
var async = require('async');

var home = process.env.HOME;
var sitesPath = home + '/Sites';

var sites = {};
var nextPort = 3000;

refresh();

fs.watch(sitesPath, { persistent: true }, function(event, filename) {
  refresh();
});

var http = require('http');
var httpProxy = require('http-proxy');

var proxy = httpProxy.createProxyServer({});

var server = require('http').createServer(function(req, res) {
  var parsed = url.parse(req.url);
  var site = parsed.hostname;
  if (!sites[site]) {
    // Not one of ours - pass through
    return proxy.web(req, res, { target: req.url });
  }
  console.log(site + ' is one of ours');
  return async.series({
    spinup: function(callback) {
      if (sites[site].port) {
        return callback(null);
      }
      sites[site].port = nextPort++;
      // http://stackoverflow.com/questions/7171725/open-new-terminal-tab-from-command-line-mac-os-x
      myexec(
        'osascript -e \'tell app "Terminal"\n' +
          'do script "(export PORT=' + sites[site].port + ' && ' +
            'cd ' + sitesPath + '/' + site + ' && ' +
            'node app.js)"\n' +
        'end tell\'', function() {
        // We really can't tell when the app itself dies this way.
        // TODO: our own frontend to multiplex stdout/stderr from all the sites
        // which would allow us to retain process control, replacing terminal
      });
      // Wait, in a crude fashion, for the app be ready for connections
      // TODO: make test requests instead
      setTimeout(callback, 3000);
    },
    proxy: function(callback) {
      console.log('proxying');
      var target = 'http://localhost:' + sites[site].port + parsed.path;
      console.log(target);
      return proxy.web(req, res, { target: target });
    }
  }, function(err) {
    if (err) {
      res.statusCode = 500;
      return res.send('Oh dear, node-dev-proxy is having some trouble.');
    }
  });
});

console.log("Set your HTTP proxy server setting to http://localhost:5050");
server.listen(5050);

function refresh()
{
  var ports = _.pick(sites, 'port');
  sites = {};
  var siteNames = glob.sync(sitesPath + '/*');
  siteNames = _.map(siteNames, function(siteName) {
    return basename(siteName).toLowerCase();
  });
  siteNames = _.filter(siteNames, function(siteName) {
    return siteName.match(/^[\w\-]+$/);
  });
  _.each(siteNames, function(siteName) {
    sites[siteName] = {};
  });
  _.each(ports, function(site, port) {
    if (sites[site]) {
      sites[site].port = port;
    }
  });
}

function myexec(cmd, fn) {
  console.log(cmd);
  return exec(cmd, fn);
}
