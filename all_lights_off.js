"use strict";
var nconf = require('nconf');

nconf.argv({
  "h": {
    alias: "host",
    describe: "address of the Hue bridge"
  },
  "u": {
    alias: "user",
    describe: "authorized username for interacting with the Hue bridge"
  }
}).file({ "file": process.env.HOME + '/.config/node-hue-daylights-config.json' });

var hue = require("node-hue-api"),
    HueApi = hue.HueApi,
    lightState = hue.lightState;

var api = new HueApi(nconf.get('host'), nconf.get('user'));
api.setGroupLightState(0,  lightState.create().off()).done();
