
window.$dashutils = (function() {
  this.formatNumber = function(num, decimalPlaces) {
    var str = num.toFixed(decimalPlaces || 0);
    var parts = str.split('.');
    parts[0] = commaSeparateNumber(parts[0]);

    return parts.join('.');
  };

  this.formatAMPM = function(date) {
    date = date || new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    //var ampm = hours >= 12 ? 'pm' : 'am';
    hours = (hours % 12) || 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    return hours + ':' + minutes;
  };

  function commaSeparateNumber(num) {
    var RE = /(\d+)(\d{3})/;
    num = num.toString();

    while (RE.test(num))
      num = num.replace(RE, '$1' + ',' + '$2');

    return num;
  }

  return this;
})();
