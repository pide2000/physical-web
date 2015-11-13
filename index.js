var https = require('http');
var noble = require('noble');
var urldecode = require('./urldecode.js');
var open = require('open');
var express = require('express');
var CHECK_BKN_DATA_INTERVAL = 1000; // milliseconds


var discoveredData = new Object();
var app = express();

var discoveredBeacons = [];
var running = false;


//return a list of all discovered beacons
app.get('/beaconList', function (req, res) {

  res.json(discoveredData);

});


//return information of a specific beacon
app.get('/beaconInformation', function (req, res) {
  // do a POST request
  // create the JSON object
  jsonObject = '{"sender":'+ JSON.stringify(discoveredData[req.query.id].url) +',"receiver":"12345","action":1,"firstSeenTime":'+ discoveredData[req.query.id].firstSeen+'}';

  //doPostCall(jsonObject);
  res.send(discoveredData[req.query.id]);

});


//start the express js app at port 3000
var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);

});


//disable noble when ble is disabled
noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    //delte feaa false to true
    noble.startScanning(['feaa'],false);
  } else {
    noble.stopScanning();
  }
});

//when scan starts print something
noble.on('scanStart', function() {
  console.log('Scan started...');
  console.log();
});


//when scan stops print something
noble.on('scanStop', function() {
  console.log('Scan stopped...');
  console.log();
});


//when a beacon is discovered save it in the per[] array for further
noble.on('discover', function(peripheral) {

  console.log("Discovered beacon with id " + peripheral.uuid);
  var id = peripheral.id;
  var entered = !discoveredBeacons[id];

  if (entered) {
    discoveredBeacons[id] = peripheral;
    discoveredBeacons[id].firstSeen = Date.now();
  }

  //if continous check is disabled start it
  if(!running){
    checkBeaconData();
  }

});

//check every x seconds beacon data
function checkBeaconData(){

  running = true;

  setInterval(function() {
    for(var id in discoveredBeacons) {
      updatePeripherialData(discoveredBeacons[id]);
    }
  }, CHECK_BKN_DATA_INTERVAL);

}



function updatePeripherialData(peripherial){

  advertisement = peripherial.advertisement;
  serviceData = advertisement.serviceData;

  peripherialID = peripherial.id;
  if(!discoveredData[peripherial.id]){
    discoveredData[peripherial.id] = new Object();
    discoveredData[peripherial.id].firstSeen = Date.now();

  }

  discoveredData[peripherial.id].rssi = JSON.stringify(peripherial.rssi);

    if (serviceData && serviceData.length) {
      //getManufacturer in noble called localName

      discoveredData[peripherial.id].manufacturer = advertisement.localName;

      for (var i in serviceData) {

        //check for eddystone url 0x10
        if (serviceData[i].data.toString('hex').substr(0, 2) === '10') {
          discoveredData[peripherial.id].url = urldecode(serviceData[i].data.toString('hex'));
        }

        //check for eddystone uuid 0x00
        else if ((serviceData[i].data.toString('hex').substr(0, 2) === '00')){
          discoveredData[peripherial.id].uuid = serviceData[i].data.toString('hex');
        }

        // check for telemetry data 0x20
        else if ((serviceData[i].data.toString('hex').substr(0, 2) === '20')){
          discoveredData[peripherial.id].tel = serviceData[i].data.toString('hex');;
        }
      }


  }

}


function doPostCall(jsonObject){

  /**
   * HOW TO Make an HTTP Call - POST
   */

// prepare the header
  var postheaders = {
    'Content-Type' : 'application/json',
    'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
  };

// the post options
  var optionspost = {
    host : 'jenkins3.intern.punkt.de',
    port : 8080,
    path : '/tpw/logs/add',
    method : 'POST',
    headers : postheaders
  };

  console.info('Options prepared:');
  console.info(optionspost);
  console.info('Do the POST call');

// do the POST call
  var reqPost = https.request(optionspost, function(res) {
    console.log("statusCode: ", res.statusCode);
    // uncomment it for header details
//  console.log("headers: ", res.headers);

    res.on('data', function(d) {
      console.info('POST result:\n');
      process.stdout.write(d);
      console.info('\n\nPOST completed');
    });
  });

// write the json data
  console.log(jsonObject);
  reqPost.write(jsonObject);
  reqPost.end();
  reqPost.on('error', function(e) {
    console.error(e);
  });

}

