<a href="#"><img src="https://raw.github.com/punkave/zoltar/master/zoltar-crystalball.png" alt="Zoltar: A Launcher For Node-Powered Websites" /></a>

# zoltar

<a href="http://apostrophenow.org/"><img src="https://raw.github.com/punkave/zoltar/master/logos/logo-box-madefor.png" align="right" /></a>

zoltar launches your node-powered sites on demand when you access them by their actual names. No more "node app", no more "http://localhost:3000".

zoltar also provides a simple web-based console where you can see the output of all of your apps and easily shut them down, launch more, or visit their homepages.

<img src="https://raw.github.com/punkave/zoltar/master/screenshot1.png" />

## Setting up zoltar

First, move your node-powered sites to `~/node-sites` (or not, see "Changing the Configuration"). Each one should have an `app.js` file. The layout looks like this:

    ~/node-sites/site1/app.js
    ~/node-sites/site2/app.js
    ~/node-sites/site3/app.js

Etc. Don't put anything that isn't a node-powered website in this folder.

(`index.js` and `server.js` are also accepted, as well as anything specified as `main` in `package.json`.)

Now pick up `zoltar` from github. `cd` to the folder and run `npm install`:

    git clone https://github.com/punkave/zoltar
    cd zoltar
    npm install

Now start the proxy:

    node app

Next, **configure your system to use the provided `proxy.pac` file for webserver proxy configuration.** All the major web browsers provide a way to do this, so this works across Windows, Linux and Mac. On a Mac you can just do it system-wide:

* Go to System Preferences
* Open "Network"
* Click "Advanced"
* Click "Proxies"
* Click the "Browse" button for "Automatic Proxy Configuration"
* Pick the `proxy.pac` file that came with `zoltar`

## Launching Your Sites

Now, try visiting one of your sites! If you have `~/node-sites/site1/app.js` then you can visit:

    http://site1.dev

(Note: **Chrome will be a pain at first and insist you don't really mean it if you just type site1.dev without the http.** But it'll get over it after it sees you mean it the first couple times.)

Boom! Your site fires up in the background and you see the homepage.

## Viewing the Console

Try visiting:

    http://monitor.dev

You can see all the console output of each site. There is an "x" to shut each site down.

## Launching a Site From the Console

  And, if you click one of the tabs at right for sites not already running, they start up and open in your browser.

## Visiting a Running Site From the Console

 If you double-click the tab for a site that is already running, a new browser window is opened to visit that site.

## Restarting a Site

Just click the "↺" icon.

## Changing the Configuration

See `config-example.js` for configurable parameters. Copy that file to `config.js` and it will take effect. If you change the proxy port you must also change it in `proxy.pac` and you may need to select that file again in your operating system's network control panel.

Note that you can change the `nodeCommand` parameter to start your apps via `nodemon` or `forever` instead of `node`.

## About P'unk Avenue and Apostrophe

`zoltar` was created at [P'unk Avenue](http://punkave.com) to support our work developing projects with Apostrophe, an open-source content management system built on node.js. `zoltar` isn't mandatory for Apostrophe and vice versa, but they play very well together. If you like `zoltar` you should definitely [check out the Apostrophe sandbox project](http://github.com/punkave/apostrophe-sandbox).

## Support

First off: thanks to `proxy.pac` zoltar only looks at .dev sites and keeps its filthy mitts completely off the rest of your web traffic. So if a website is not working, don't blame zoltar. It wasn't even there, okay?

Having said that... feel free to open issues on [github](http://github.com/punkave/zoltar). We welcome pull requests.

<a href="http://punkave.com/"><img src="https://raw.github.com/punkave/zoltar/master/logos/logo-box-builtby.png" /></a>




