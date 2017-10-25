module.exports = function(hwi, winston, ws, sendJson) {
  var tempWs = {};

  tempWs.getCurrentTemperature = function(response) {
    hwi.getCurrentTemperature(function(err, temp) {
      if (err) {
        response.error = err;
      } else {
        response.data = {temperature: temp};
      }
      ws.sendJson(response);
    });
  };

  return tempWs;
};