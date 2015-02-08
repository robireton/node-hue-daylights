var verbose = false;
var VSOP87D_Earth = require('./vsop87d-earth.json');
var nutation_data = require('./nutation.json');

Number.prototype.normalizedRadians = function() {
  var value = this;
  while (value < 0)         value += ( 2*Math.PI );
  while (value > 2*Math.PI) value -= ( 2*Math.PI );
  return value;
}

Number.prototype.normalizedDegrees = function() {
  var value = Math.abs(this.valueOf());
  if (value > 360) value -= (Math.floor(value / 360) * 360);
  return ((this.valueOf() < 0) ? (360-value) : (value));
}

Number.prototype.DegreesToRadians = function() { return this.valueOf() * Math.PI / 180; }
Number.prototype.RadiansToDegrees = function() { return this.valueOf() * 180 / Math.PI; }
Number.prototype.DDtoDMS = function() {
  var value = Math.abs(this.valueOf());
  var degrees = Math.floor(value);
  value -= degrees;
  value *= 60;
  var minutes = Math.floor(value);
  value -= minutes;
  value *= 60;
  value = Math.floor(value);
  return new String(((this.valueOf()<0)?('-'):('')) + degrees + '°' + ((minutes>0 || value>0)?(minutes + 'ʹ' + ((value>0)?(value + 'ʺ'):(''))):('')));
}

Number.prototype.DDtoHMS = function() {
  var value = Math.abs(this.valueOf())/15;
  var hours = Math.floor(value);
  value -= hours;
  value *= 60;
  var minutes = Math.floor(value);
  value -= minutes;
  value *= 60;
  value = Math.floor(value);
  return new String(((this.valueOf()<0)?('-'):('')) + hours + 'h' + ((minutes>0 || value>0)?(minutes + 'm' + ((value>0)?(value + 's'):(''))):('')));
}

Number.prototype.DHtoHMS = function() {
  var value = this.valueOf();
  var hours = Math.floor(value);
  value -= hours;
  value *= 60;
  var minutes = Math.floor(value);
  value -= minutes;
  value *= 60;
  var seconds = Math.floor(value);
  return new String(((hours<10)?('0'):('')) + hours + ':' + ((minutes<10)?('0'):('')) + minutes + ':' + ((seconds<10)?('0'):('')) + seconds );
}

Date.prototype.toCustom = function() {
  var year    = this.getFullYear();
  var month   = this.getMonth() + 1;
  var date    = this.getDate();
  var hours   = this.getHours();
  var minutes = this.getMinutes();
  var seconds = this.getSeconds();
  return new String(year + '-' + ((month<10)?('0'):('')) + month + '-' + ((date<10)?('0'):('')) + date + ' ' + ((hours<10)?('0'):('')) + hours + ':' + ((minutes<10)?('0'):('')) + minutes + ':' + ((seconds<10)?('0'):('')) + seconds);
}

Date.prototype.toJD = function() {
  var Y = this.getUTCFullYear();
  var M = 1 + this.getUTCMonth();
  if (M < 3) {
    Y--;
    M+=12;
  }
  var D = this.getUTCDate() + this.getUTCHours()/24 + this.getUTCMinutes()/1440 + this.getUTCSeconds()/86400 + this.getUTCMilliseconds()/86400000;
  var A = Math.floor( Y / 100 );
  var B = 2 - A + Math.floor( A / 4 );
  var JD = Math.floor( 365.25 * (Y + 4716) ) + Math.floor( 30.6001 * (M + 1) ) + D + B - 1524.5;
  if (JD < 0) throw new Error('method not valid for negative Julian Day numbers');

  return JD;
}

Date.prototype.toJDE = function() {
  return this.toJD() + computeΔT(this.getUTCFullYear(), 1+this.getUTCMonth())/86400;
}

Number.prototype.JDtoDate = function() {
  var JD = this.valueOf();
  if (JD < 0) throw new Error('method not valid for negative Julian Day numbers');
  var JD = this.valueOf() + 0.5;
  var Z = Math.floor(JD);
  var F = JD - Z;
  var A = Z;
  if ( Z >= 2299161 ) {
    var alpha = Math.floor( (Z - 1867216.25) / 36524.25 );
    A = Z + 1 + alpha - Math.floor( alpha / 4 );
  }
  var B = A + 1524;
  var C = Math.floor( (B - 122.1) / 365.25 );
  var D = Math.floor( 365.25 * C );
  var E = Math.floor( (B - D) / 30.6001 );

  var month = (E < 14) ? (E - 1) : (E - 13);
  var year = (month > 2) ? (C - 4716) : (C - 4715);
  var X = B - D - Math.floor( 30.6001 * E ) + F;
  var date = Math.floor(X);
  X -= date;
  X *= 24;
  var hours = Math.floor(X);
  X -= hours;
  X *= 60;
  var minutes = Math.floor(X);
  X -= minutes;
  X *= 60;
  var seconds = Math.floor(X);
  X -= seconds;
  X *= 1000;

  return new Date( Date.UTC(year, month - 1, date, hours, minutes, seconds, Math.floor(X)) );
}

function positionSun(JDE, lat, lon) {
  var heliocentric = positionEarth(JDE);
  if (verbose) console.log('L = ' + heliocentric.L + '°');
  if (verbose) console.log('B = ' + heliocentric.B*3600 + 'ʺ');
  if (verbose) console.log('R = ' + heliocentric.R + ' a.u.');

  //convert heliocentric longitude & latitude to geocentric
  var Θ = (heliocentric.L + 180).normalizedDegrees();
  if (verbose) console.log('Θ = ' + Θ + '°');
  var β = -heliocentric.B;
  if (verbose) console.log('β = ' + β*3600 + 'ʺ');

  //convert to FK5 reference frame
  var T = (JDE - 2451545) / 36525; //time in centuries from 2000.0
  if (verbose) console.log('T = ' + T);
  var λʹ = Θ + T*(-1.397 + T*(-0.00031 * T));
  if (verbose) console.log('λʹ = ' + λʹ + '°');
  var ΔΘ = -0.09033 / 3600;
  if (verbose) console.log('ΔΘ = ' + ΔΘ + '°');
  var Δβ  = (0.03916 / 3600) * (Math.cos(λʹ.DegreesToRadians()) - Math.sin(λʹ.DegreesToRadians()));
  if (verbose) console.log('Δβ = ' + Δβ*3600 + 'ʺ');
  Θ += ΔΘ;
  if (verbose) console.log('Θ = ' + Θ + '°');
  β += Δβ;
  if (verbose) console.log('β = ' + β*3600 + 'ʺ');

  //correct for nutation and aberration
  var objNutObl = calculateNutationAndObliquity(JDE);
  if (verbose) console.log('correction for aberration: ' + (-20.4898)/heliocentric.R + 'ʺ');
  var λ = Θ + objNutObl.Δψ - (20.4898/3600) / heliocentric.R;
  if (verbose) console.log('λ = ' + λ.DDtoDMS());

  //convert to right ascension & declination
  var ε = (objNutObl.ε).DegreesToRadians();
  var α = Math.atan2(Math.sin(λ.DegreesToRadians()) * Math.cos(ε) - Math.tan(β.DegreesToRadians()) * Math.sin(ε), Math.cos(λ.DegreesToRadians())).RadiansToDegrees().normalizedDegrees();
  if (verbose) console.log('α = ' + α + '° (' + α.DDtoHMS() + ')');
  var δ = Math.asin(Math.sin(β.DegreesToRadians()) * Math.cos(ε) + Math.cos(β.DegreesToRadians()) * Math.sin(ε) * Math.sin(λ.DegreesToRadians())).RadiansToDegrees();
  if (verbose) console.log('δ = ' + δ + '° (' + δ.DDtoDMS() + ')');

  var τ = T/10;
  if (verbose) console.log('τ = ' + τ);
  var L0 = (280.4664567 + τ*(360007.6982779 + τ*(0.03032028 + τ*(1/49931 + τ*(-1/15299 - τ/1988000))))).normalizedDegrees();
  if (verbose) console.log('L₀ = ' + L0);
  var E = (L0 - 0.0057183 - α + objNutObl.Δψ * Math.cos(ε)).normalizedDegrees();
  if (verbose) console.log('E = ' + E + '°');
  if (E > 180) E-=360;
  E *= 4; //convert degrees of arc to minutes of time;
  if (verbose) console.log('E = ' + E + 'm');

  var A, h;
  if (!isNaN(lat) && !isNaN(lon)) {
    var θ0 = (280.46061837 + 360.98564736629 * (JDE - 2451545.0) + 0.000387933 * T*T + T*T*T / 38710000).normalizedDegrees() + objNutObl.Δψ*Math.cos(ε);
    if (verbose) console.log('θ₀ = ' + θ0.DDtoHMS());

    var L = -lon;
    var φ =  lat;
    if (verbose) console.log('φ = ' + φ);

    var H = (θ0 - L - α).normalizedDegrees();
    if (verbose) console.log('H = ' + (180 + H).normalizedDegrees().DDtoHMS());

    A = (180 + Math.atan2(Math.sin(H.DegreesToRadians()),Math.cos(H.DegreesToRadians()) * Math.sin(φ.DegreesToRadians()) - Math.tan(δ.DegreesToRadians()) * Math.cos(φ.DegreesToRadians())).RadiansToDegrees()).normalizedDegrees();
    if (verbose) console.log('A = ' + A + '° (' + A.DDtoDMS() + ')');
    A = Math.round(1000000 * A)/1000000;

    h = Math.asin(Math.sin(φ.DegreesToRadians()) * Math.sin(δ.DegreesToRadians()) + Math.cos(φ.DegreesToRadians()) * Math.cos(δ.DegreesToRadians()) * Math.cos(H.DegreesToRadians())).RadiansToDegrees();
    if (verbose) console.log('h = ' + h + '° (' + h.DDtoDMS() + ')');
    h = Math.round(1000000 * h)/1000000;
  }

  return { "E": E, "A": A, "h": h };
}

function calculateNutationAndObliquity(JDE) { //T is time in centuries from 2000.0
  var i, arg;

  var T = (JDE - 2451545) / 36525; //time in centuries from 2000.0
  var D  = (297.85036 + T*(445267.111480 + T*(-0.0019142 + T/189474))).normalizedDegrees(); //mean elongation of the Moon from the Sun in degrees
  if (verbose) console.log('D: ' + D + '°');
  var M  = (357.52772 + T*( 35999.050340 + T*(-0.0001603 - T/300000))).normalizedDegrees(); //mean anomoly of the Sun (Earth) in degrees
  if (verbose) console.log('M: ' + M + '°');
  var Mʹ = (134.96298 + T*(477198.867398 + T*( 0.0086972 + T/ 56250))).normalizedDegrees(); //mean anomoly of the Moon in degrees
  if (verbose) console.log('Mʹ: ' + Mʹ + '°');
  var F  =  (93.27191 + T*(483202.017538 + T*(-0.0036825 + T/327270))).normalizedDegrees(); //Moon's argument of latitude in degrees
  if (verbose) console.log('F: ' + F + '°');
  var Ω  = (125.04452 + T*( -1934.136261 + T*( 0.0020708 + T/450000))).normalizedDegrees(); //longitude of the ascending node of the Moon's mean orbit on the ecliptic, measured from the mean equinox of the date in degrees
  if (verbose) console.log('Ω: ' + Ω + '°');

  var Δψ = 0;
  var Δε = 0;
  for (i=0; i<nutation_data.length; i++) {
    arg = (nutation_data[i].D * D + nutation_data[i].M * M + nutation_data[i].Mʹ * Mʹ + nutation_data[i].F * F + nutation_data[i].Ω * Ω).DegreesToRadians();
    Δψ += (nutation_data[i].Δψ.A + nutation_data[i].Δψ.B * T) * Math.sin(arg);
    Δε += (nutation_data[i].Δε.A + nutation_data[i].Δε.B * T) * Math.cos(arg);
  }
  Δψ /= 36000000; //coefficients above were in units of 0ʺ.0001
  if (verbose) console.log('Δψ = ' + Δψ*3600 + 'ʺ');
  Δε /= 36000000; //coefficients above were in units of 0ʺ.0001
  if (verbose) console.log('Δε = ' + Δε*3600 + 'ʺ');

  var U = T / 100;
  var ε0 = 23+26/60+21.448/3600 + U*(-4680.93/3600
                  + U*(-   1.55/3600
                  + U*( 1999.25/3600
                  + U*(-  51.38/3600
                  + U*(- 249.67/3600
                  + U*(-  39.05/3600
                  + U*(  7.12/3600
                  + U*(   27.87/3600
                  + U*(  5.79/3600
                  + U*2.45/3600)))))))));
  if (verbose) console.log('ε₀ = ' + ε0 + '° (' + ε0.DDtoDMS() + ')');

  var ε = ε0 + Δε;
  if (verbose) console.log('ε = ' + ε + '° (' + ε.DDtoDMS() + ')');

  return { "Δψ": Δψ, "Δε": Δε, "ε": ε };
}

function positionEarth(JDE) {
  var τ = (JDE - 2451545) / 365250;

  var L = computeVSOP87(VSOP87D_Earth.L, τ).normalizedRadians();
  var B = computeVSOP87(VSOP87D_Earth.B, τ);
  var R = computeVSOP87(VSOP87D_Earth.R, τ);

  return { "L": L.RadiansToDegrees(), "B": B.RadiansToDegrees(), "R": R};

}

function computeΔT(year, month) {
  //c.f. http://eclipse.gsfc.nasa.gov/SEhelp/deltatpoly2004.html
  var y = year + (month - 0.5) / 12;

  if (year < -500) {
    var u = (year - 1820) / 100;
    return Math.round(-20 + 32 * u * u);
  }
  else if (year < 500) {
    var u = y / 100;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; u: ' + u + '; ΔT: ' + Math.round(10583.6 - 1014.41 * u + 33.78311 * Math.pow(u, 2) - 5.952053 * Math.pow(u, 3) - 0.1798452 * Math.pow(u, 4) + 0.022174192 * Math.pow(u, 5) + 0.0090316521 * Math.pow(u, 6)));
    return Math.round(10583.6 + u*(-1014.41 + u*(33.78311 + u*(-5.952053 + u*(-0.1798452 + u*(0.022174192 + u * 0.0090316521))))));
  }
  else if (year < 1600) {
    var u = (y - 1000) / 100;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; u: ' + u + '; ΔT: ' + Math.round(1574.2 - 556.01 * u + 71.23472 * Math.pow(u, 2) + 0.319781 * Math.pow(u, 3) - 0.8503463 * Math.pow(u, 4) - 0.005050998 * Math.pow(u, 5) + 0.0083572073 * Math.pow(u, 6)));
    return Math.round(1574.2 + u*(-556.01 + u*(71.23472 + u*(0.319781 + u*(-0.8503463 + u*(-0.005050998 + u * 0.0083572073))))));
  }
  else if (year < 1700) {
    var t = y - 1600;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; t: ' + t + '; ΔT: ' + Math.round(120 - 0.9808 * t - 0.01532 * Math.pow(t, 2) + Math.pow(t, 3) / 7129));
    return Math.round(120 + t*(-0.9808 + t*(-0.01532 + t/7129)));
  }
  else if (year < 1800) {
    var t = y - 1700;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; t: ' + t + '; ΔT: ' + Math.round(8.83 + 0.1603 * t - 0.0059285 * Math.pow(t, 2) + 0.00013336 * Math.pow(t, 3) - Math.pow(t, 4) / 1174000));
    return Math.round(8.83 + t*(0.1603 + t*(-0.0059285 + t*(0.00013336 - t/1174000))));
  }
  else if (year < 1860) {
    var t = y - 1800;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; t: ' + t + '; ΔT: ' + Math.round((13.72 - 0.332447 * t + 0.0068612 * Math.pow(t, 2) + 0.0041116 * Math.pow(t, 3) - 0.00037436 * Math.pow(t, 4)  + 0.0000121272 * Math.pow(t, 5) - 0.0000001699 * Math.pow(t, 6) + 0.000000000875 * Math.pow(t, 7)) * 10)/10);
    return Math.round((13.72 + t*(-0.332447 + t*(0.0068612 + t*(0.0041116 + t*(-0.00037436 + t*(0.0000121272 + t*(-0.0000001699 + t * 0.000000000875))))))) * 10)/10;
  }
  else if (year < 1900) {
    var t = y - 1860;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; t: ' + t + '; ΔT: ' + Math.round((7.62 + 0.5737 * t - 0.251754 * Math.pow(t, 2) + 0.01680668 * Math.pow(t, 3) - 0.0004473624 * Math.pow(t, 4) + Math.pow(t, 5) / 233174) * 10)/10);
    return Math.round((7.62 + t*(0.5737 + t*(-0.251754 + t*(0.01680668 + t*(-0.0004473624 + t/233174))))) * 10)/10;
  }
  else if (year < 1920) {
    var t = y - 1900;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; t: ' + t + '; ΔT: ' + Math.round((-2.79 + 1.494119 * t - 0.0598939 * Math.pow(t, 2) + 0.0061966 * Math.pow(t, 3) - 0.000197 * Math.pow(t, 4)) * 10)/10);
    return Math.round((-2.79 + t*(1.494119 + t*(-0.0598939 + t*(0.0061966 - t * 0.000197)))) * 10)/10;
  }
  else if (year < 1941) {
    var t = y - 1920;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; t: ' + t + '; ΔT: ' + Math.round((21.20 + 0.84493*t - 0.076100 * Math.pow(t, 2) + 0.0020936 * Math.pow(t, 3)) * 10)/10);
    return Math.round((21.20 + t*(0.84493 + t*(-0.076100 + t * 0.0020936))) * 10)/10;
  }
  else if (year < 1961) {
    var t = y - 1950;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; t: ' + t + '; ΔT: ' + Math.round((29.07 + 0.407*t - Math.pow(t, 2)/233 + Math.pow(t, 3) / 2547) * 10)/10);
    return Math.round((29.07 + t*(0.407 + t *(-1/233 + t/2547))) * 10)/10;
  }
  else if (year < 1986) {
    var t = y - 1975;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; t: ' + t + '; ΔT: ' + Math.round((45.45 + 1.067*t - Math.pow(t,2)/260 - Math.pow(t,3) / 718) * 10)/10);
    return Math.round((45.45 + t*(1.067 + t*(-1/260 - t/718))) * 10)/10;
  }
  else if (year < 2005) {
    var t = y - 2000;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; t: ' + t + '; ΔT: ' + Math.round((63.86 + 0.3345 * t - 0.060374 * Math.pow(t,2) + 0.0017275 * Math.pow(t,3) + 0.000651814 * Math.pow(t,4) + 0.00002373599 * Math.pow(t,5)) * 100)/100);
    return Math.round((63.86 + t*(0.3345 + t*(-0.060374 + t*(0.0017275 + t*(0.000651814 + t * 0.00002373599))))) * 100)/100;
  }
  else if (year < 2050) {
    var t = y - 2000;
    if (verbose) console.log('year: ' + year + '; y: ' + y + '; t: ' + t + '; ΔT: ' + Math.round((62.92 + 0.32217 * t + 0.005589 * t * t) * 10)/10);
    return Math.round((62.92 + t*(0.32217 + t * 0.005589)) * 10)/10;
  }
  else if (year < 2150) {
    return Math.round((-20 + 32 * Math.pow((y-1820)/100, 2) - 0.5628 * (2150 - y)) * 10)/10;
  }
  else {
    var u = (year - 1820) / 100;
    return Math.round(-20 + 32 * u * u);
  }
}

function computeVSOP87(obj, T) {
  var coeff, i;
  var X = 0;
  for (var alpha in obj) {
    coeff = 0;
    for (i=0; i<obj[alpha].length; i++) {
      coeff += obj[alpha][i].A * Math.cos(obj[alpha][i].B + obj[alpha][i].C * T);
    }
    X += coeff * Math.pow(T, alpha);
  }
  return X;
}

exports.getSunPosition = function(coord, v) {
  verbose = v;
  var sun = positionSun((new Date()).toJDE(), coord.latitude, coord.longitude);

  return { "azimuth": sun.A, "elevation": sun.h };
}
