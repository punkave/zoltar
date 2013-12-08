var fs = require('fs');
var glob = require('glob');
var _ = require('lodash');
var exec = require('child_process').exec;
var url = require('url');
var basename = require('path').basename;
var async = require('async');
var monitor = require('express')();
var nunjucks = require('nunjucks');

nunjucks.configure('views', { autoescape: true });

var home = process.env.HOME;
var sitesPath = home + '/Sites';

var sites = {};
var nextPort = 3100;
var count = 0;

refresh();

fs.watch(sitesPath, { persistent: true }, function(event, filename) {
  refresh();
});

var http = require('http');
var httpProxy = require('http-proxy');

var proxy = httpProxy.createProxyServer({ agent: http.globalAgent });

var server = require('http').createServer(dispatcher);

var io = require('socket.io').listen(server);

nunjucks.configure('views', {
    autoescape: false,
    express: monitor
});

monitor.get('/', function(req, res) {
  return res.render('monitor.html');
});

console.log("Proxy ready. Be sure to install proxy.pac via\n" +
  "System Preferences -> Network -> Advanced ->\n" +
  "Proxies -> Automatic Configuration\n\n");
server.listen(5050);

function dispatcher(req, res) {
  var parsed = url.parse(req.url);
  var site = parsed.hostname;
  var matches = site.match(/^(.*)?\.dev$/);
  if (matches) {
    site = matches[1];
  }

  if (site === 'monitor') {
    return monitor(req, res);
  }

  if (!sites[site]) {
    // Not one of ours
    return res.send('Hmm, there is no such dev site right now. TODO: list dev sites available here. HINT: never set this up as your proxy server for ALL sites. Use the provided proxy.pac file via System Preferences -> Network -> Advanced -> Proxies -> AUtomatic Configuration.');
  }

  // Talk to the appropriate server app, start one if needed
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
      var target = 'http://localhost:' + sites[site].port + parsed.path;
      var superEnd = res.end;
      res.end = function(data, encoding) {
        return superEnd.call(res, data, encoding);
      };
      return proxy.web(req, res, { target: target });
    }
  }, function(err) {
    if (err) {
      res.statusCode = 500;
      return res.send('Oh dear, node-dev-proxy is having some trouble.');
    }
  });
}

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
