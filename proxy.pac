// "Then go to the Network part of System Preferences and go to the Advanced dialog
// of your Connection. There you can select the Proxies tab where you select the second entry
// on the left side (Automatic Proxy Configuration) and select the proxy.pac file."
// http://superuser.com/questions/564741/add-a-proxy-to-a-particular-host-only-in-mac
//
// You can use this file on other operating systems too. Most browsers directly
// support .pac files.

function FindProxyForURL(url, host) {
    PROXY = "PROXY 127.0.0.1:5050"

    // dev sites via proxy
    if (shExpMatch(host,"*.dev")) {
        return PROXY;
    }
    // everything else directly
    return "DIRECT";
}

