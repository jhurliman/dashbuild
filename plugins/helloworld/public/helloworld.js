
function helloWorld(el) {
  var $widget = $(el);
  var pluginCtx = this;

  function init() {
    console.log('Hello world!');

    var $img = $('<img src="/plugins/helloworld/img/helloworld.png">');
    $widget.html($img);

    pluginCtx.on('resize', resizeHandler);
    pluginCtx.on('unload', unloadHandler);
  }

  function resizeHandler(e) {
    // We don't have any special drawing requirements so no need to do anything
  }

  function unloadHandler() {
    // Nothing to unload
  }

  init();
}


console.log('Hello world JS loaded');

// Register this plugin
$dash.registerPlugin('helloworld', helloWorld);
