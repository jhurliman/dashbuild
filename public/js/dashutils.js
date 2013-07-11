
window.$dashutils = (function() {
  this.formatNumber = function(num, decimalPlaces) {
    var str = num.toFixed(decimalPlaces || 0);
    var parts = str.split('.');
    parts[0] = commaSeparateNumber(parts[0]);

    return parts.join('.');
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
