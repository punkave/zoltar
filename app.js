var fs = require('fs');

var config = fs.existsSync(__dirname + '/config.js') ? require('./config.js') : {};

var proxyPort = config.proxyPort || 5050;

var nextPort = config.firstAppPort || 4000;

var sitesPath = config.sitesPath || '~/node-sites';

sitesPath = sitesPath.replace(/~/g, process.env.HOME);

var nextMessage = 1;

// Uniquely identify this instance of the server
var instance = Math.floor(Math.random() * 1000000000);

var fs = require('fs');
var glob = require('glob');
var _ = require('lodash');
var spawn = require('child_process').spawn;
var url = require('url');
var basename = require('path').basename;
var async = require('async');
var nunjucks = require('nunjucks');
var extend = require('extend');
var express = require('express');
var net = require('net');

nunjucks.configure('views', { autoescape: true });

var sites = {};

var monitor = express();
monitor.use(express.static(__dirname + '/public'));
monitor.use(express.bodyParser());

refresh();

fs.watch(sitesPath, { persistent: true }, function(event, filename) {
  refresh();
});

var http = require('http');
var httpProxy = require('http-proxy');

var proxy = httpProxy.createProxyServer({ agent: http.globalAgent });

var server = require('http').createServer(dispatcher);

nunjucks.configure('views', {
    autoescape: false,
    express: monitor
});

monitor.get('/', function(req, res) {
  return res.render('monitor.html', { instance: instance });
});

monitor.post('/update', function(req, res) {
  var response = {
    status: 'ok',
    sites: {},
    instance: instance,
    last: nextMessage - 1
  };
  _.each(sites, function(site, name) {
    response.sites[name] = {
      name: name,
      running: !!site.child,
      ran: !!site.output.length,
      output: outputSince(site, req.body.since || 0)
    };
  });
  return res.send(response);
});

function outputSince(site, since) {
  return _.filter(site.output, function(message) {
    return (message.id > since);
  });
}

// Seems superfluous, we can just link to a site and let it autostart
// monitor.post('/launch', function(req, res) {
//   var site = sites[req.body.name];
//   if (!site.child) {
//     return launch(site, function(err) {
//       if (err) {
//         return res.send({ status: err });
//       } else {
//         return res.send({ status: 'ok' });
//       }
//     });
//   } else {
//     // Already running
//     return res.send({ status: 'ok' });
//   }
// });

monitor.post('/restart', function(req, res) {
  var site = sites[req.body.name];
  return async.series({
    kill: function(callback) {
      return kill(site, callback);
    },
    launch: function(callback) {
      send(site.name, 'system', "\n\n* * * RESTART * * *\n\n");
      return launch(site, callback);
    }
  }, function(err) {
    if (err) {
      return res.send({ status: err });
    } else {
      return res.send({ status: 'ok' });
    }
  });
});

monitor.post('/kill', function(req, res) {
  var site = sites[req.body.name];
  return kill(site, function() {
    return res.send({ status: 'ok' });
  });
});

function kill(site, callback) {
  if (!site.child) {
    return callback(null);
  }
  if (site.child) {
    site.child.on('close', function() {
      return callback(null);
    });
    site.child.kill();
  }
}

console.log("\n\nProxy ready. Be sure to install proxy.pac via:\n" +
  "System Preferences -> Network -> Advanced ->\n" +
  "Proxies -> Automatic Configuration\n" +
  "(Other operating systems and browsers can load .pac files too.)");
server.listen(proxyPort);

function dispatcher(req, res) {
  var parsed = url.parse(req.url);
  if (!parsed.hostname) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    return res.end('Not found');
  }
  var name = parsed.hostname;
  var matches = name.match(/^(.*)?\.dev$/);
  if (matches) {
    name = matches[1];
  }

  if (name === 'monitor') {
    return monitor(req, res);
  }

  if (!sites[name]) {
    // Not one of ours
    res.writeHead(200, {'Content-Type': 'text/plain'});
    return res.end('Hmm, there is no such dev site right now. TODO: list dev sites available here. HINT: never set this up as your proxy server for ALL sites. Use the provided proxy.pac file via System Preferences -> Network -> Advanced -> Proxies -> Automatic Configuration.');
  }

  // Talk to the appropriate server app, start one if needed
  return serveProxy(name, req, res);
}

function serveProxy(name, req, res)
{
  var site = sites[name];
  async.series({
    spinup: function(callback) {
      if (site.port) {
        return callback(null);
      }
      return launch(site, callback);
    },

    proxy: function(callback) {
      var target = 'http://localhost:' + site.port;
      var superEnd = res.end;
      res.end = function(data, encoding) {
        return superEnd.call(res, data, encoding);
      };
      // Workaround for https://github.com/nodejitsu/node-http-proxy/issues/529
      req.url = req.url.replace(/^\w+\:\/\/.*?\//, '/');
      return proxy.web(req, res, { target: target });
    }
  }, function(err) {
    if (err) {
      res.writeHead(500, {'Content-Type': 'text/plain'});
      return res.end('Oh dear, node-dev-proxy is having some trouble.');
    }
  });
}

function refresh()
{
  var newSites = {};
  var siteNames = glob.sync(sitesPath + '/*');
  siteNames = _.map(siteNames, function(siteName) {
    return basename(siteName).toLowerCase();
  });
  siteNames = _.filter(siteNames, function(siteName) {
    return siteName.match(/^[\w\-]+$/);
  });
  _.each(siteNames, function(siteName) {
    if (sites[siteName]) {
      newSites[siteName] = sites[siteName];
    } else {
      newSites[siteName] = { name: siteName, output: [] };
    }
  });
  var orphans = _.difference(_.keys(sites), _.keys(newSites));
  _.each(orphans, function(orphan) {
    if (orphan.child) {
      // Isn't that a charming line of code? Yikes
      orphan.child.kill();
      delete orphan.child;
      delete orphan.port;
    }
  });
  sites = newSites;
}

// Escape output suitably to be included in a pre tag
function esc(s) {
  s = s.toString('utf8');
  if (s === 'undefined') {
    s = '';
  }
  if (typeof(s) !== 'string') {
    s = s + '';
  }
  return s.replace(/\&/g, '&amp;').replace(/</g, '&lt;').replace(/\>/g, '&gt;').replace(/\"/g, '&quot;').replace(/\r?\n/g, "\n");
}

function send(name, category, data) {
  var output = '<span class="' + category + '">' + esc(data) + '</span>\n';
  sites[name].output.push({
    id: nextMessage++,
    o: output
  });
}

function launch(site, callback) {
  site.port = nextPort++;
  // http://stackoverflow.com/questions/7171725/open-new-terminal-tab-from-command-line-mac-os-x
  // myexec(
  //   'osascript -e \'tell app "Terminal"\n' +
  //     'do script "(export PORT=' + sites[site].port + ' && ' +
  //       'cd ' + sitesPath + '/' + site + ' && ' +
  //       'node app.js)"\n' +
  //   'end tell\'', function() {
  //   // We really can't tell when the app itself dies this way.
  //   // TODO: our own frontend to multiplex stdout/stderr from all the sites
  //   // which would allow us to retain process control, replacing terminal
  // });

  // Spawn the app
  var env = {};
  extend(true, env, process.env);
  env.PORT = site.port;

  site.child = myspawn('node', [ sitesPath + '/' + site.name + '/app.js' ], {
    cwd: sitesPath + '/' + site.name,
    env: env
  });

  site.child.stdout.on('data', function(data) {
    send(site.name, 'stdout', data);
  });

  site.child.stderr.on('data', function(data) {
    send(site.name, 'stderr', data);
  });

  site.child.on('close', function(code) {
    delete site.child;
    delete site.port;
    site.output = [];
  });

  // Wait until we can successfully connect to the app
  var connected = false;
  var tries = 0;

  return async.until(function() {
    return connected;
  }, function(callback) {
    var socket = net.connect({port: site.port, host: 'localhost'}, function() {
      // Connection successful
      socket.end();
      connected = true;
      return callback(null);
    });
    socket.on('error', function(e) {
      tries++;
      socket.end();
      if (tries === 30) {
        console.log('unable to connect to ' + site.name + ' on port ' + site.port + 'after 30 tries:');
        console.log(e);
        return callback('failed');
      }
      return setTimeout(callback, 250);
    });
  }, function(err) {
    return callback(err);
  });
}

function myspawn(program, args, options) {
  return spawn(program, args, options);
}
