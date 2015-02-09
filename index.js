"use strict";
var nconf = require('nconf');
var meeus = require('./meeus.js');

nconf.argv({
  "v": {
    alias: "verbose",
    describe: "explain what’s going on under-the-hood",
    boolean: true
  },
  "t": {
    alias: "latitude",
    describe: "observer latitude in decimal degrees; positive is north, negative is south",
    default: 39.1
  },
  "n": {
    alias: "longitude",
    describe: "observer longitude in decimal degrees; positive is east, negative is west",
    default: -84.5
  },
  "h": {
    alias: "host",
    describe: "address of the Hue bridge"
  },
  "u": {
    alias: "user",
    describe: "authorized username for interacting with the Hue bridge"
  },
  "e": {
    alias: "east",
    describe: "ID of the East light",
    default: 1
  },
  "s": {
    alias: "south",
    describe: "ID of the South light",
    default: 2
  },
  "w": {
    alias: "west",
    describe: "ID of the West light",
    default: 3
  }
}).file({ "file": process.env.HOME + '/.config/node-hue-daylights-config.json' });

var coordinates = { "latitude": parseFloat(nconf.get('latitude')), "longitude": parseFloat(nconf.get('longitude'))};
if (isNaN(coordinates.latitude) || isNaN(coordinates.latitude)) throw "latitude and/or longitude variable(s) not set."

var sun = meeus.getSunPosition(coordinates, nconf.get('verbose'));
console.log(sun);

var twilight = -18; //Astronomical
var max_elevation = Math.min(90 + 23.44 - Math.abs(coordinates.latitude), 90);

var total_brightness = (1 + Math.cos(Math.min(0, Math.max(-Math.PI, Math.PI * (sun.elevation-twilight) / (max_elevation-twilight) - Math.PI))))/2;
console.log(total_brightness);

var east  = Math.min(255, Math.max(1, Math.ceil(360*total_brightness*((Math.cos(interopolate(sun.azimuth, -60, 240, -Math.PI, Math.PI)) + 1) / 2))));
var south = Math.min(255, Math.max(1, Math.ceil(360*total_brightness*((Math.cos(interopolate(sun.azimuth,  30, 330, -Math.PI, Math.PI)) + 1) / 2))));
var west  = Math.min(255, Math.max(1, Math.ceil(360*total_brightness*((Math.cos(interopolate(sun.azimuth, 120, 410, -Math.PI, Math.PI)) + 1) / 2))));
console.log('east: %d; south: %d, west: %d', east, south, west);

var color = Math.round(interopolate(sun.elevation, 0, Math.max(0, Math.min(90 - 23.44/2 - Math.abs(coordinates.latitude), 90)), 500, 153));
console.log('color: %d', color);

function interopolate(x, x0, x1, y0, y1) {
  return Math.min(Math.max(y0,y1), Math.max(Math.min(y0,y1), y0 + (y1-y0) * (x-x0) / (x1-x0)));
}

var hue = require("node-hue-api"),
    HueApi = hue.HueApi,
    lightState = hue.lightState;

var api = new HueApi(nconf.get('host'), nconf.get('user'));

var state_east  = lightState.create().on().ct(color).bri(east);
var state_south = lightState.create().on().ct(color).bri(south);
var state_west  = lightState.create().on().ct(color).bri(west);

api.setLightState(nconf.get('east'),  state_east).done();
api.setLightState(nconf.get('south'), state_south).done();
api.setLightState(nconf.get('west'),  state_west).done();
