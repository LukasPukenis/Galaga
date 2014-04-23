$(function() {
  var Galaga = (function() {
    var assets = './assets/';
    var scene = [];
    var move_step = 10;

    var renderer = 'DOM'; // TODO: WebGL
    var dims = {
      width: 400,
      height: 400
    };

    var SceneNode = function(options) {
      for (var i in options) {
        this[i] = options[i];
      }
    };    

    var buildScene = function() {

      // add ship itself
      scene.push(new SceneNode({
        type: 'ship',
        position: {
          x: ((dims.width - 72) / 2),
          y: dims.height - 90 
        },
        dimensions: {
          width: 72,
          height: 90
        },
        id: null,
        asset_id: 'Ship/Ship_c.png'
      }));

      // transform asset_id fields to prepend assets folder. No need to write it all over the place
      scene = _(scene).map(function(s) {
        s.asset_id = assets + s.asset_id;
        return s;
      });
    };

    var findShip = function() {
      return _(scene).find(function(node) { return node.type == 'ship' });
    }

    // keyboard actions
    var moveLeft = function() {
      var ship = findShip();
      ship.position.x -= move_step;
      if (ship.position.x < 0) ship.position.x = 0;
    };
    
    var moveRight = function() {
      var ship = findShip();
      ship.position.x += move_step;
      if (ship.position.x > dims.width - ship.dimensions.width) ship.position.x = dims.width - ship.dimensions.width;
    };

    var shoot = function() {
      var ship = findShip();
    }

    // Renderers
    var Renders = {
      DOM: {
        nodes_already_added: false,
        prefix: 'galaga_',        
        add_nodes: function() {
          _(scene).each(function(node, idx) {
            if (!node.id) {              
              var new_id = Renders.DOM.prefix+idx;
              node.id = new_id;
              $('#playground').append('<div id="'+new_id+'" style="position: absolute; background: url('+node.asset_id+')">');
            }
          });
        },
        render: function(node) {
          if (!Renders.DOM.nodes_already_added) {
            Renders.DOM.nodes_already_added = true;
            Renders.DOM.add_nodes();
          }

          if (node.type == 'ship') {
            var styles = {
              width:  node.dimensions.width+'px',
              height: node.dimensions.height+'px',
              left: node.position.x+'px',
              top: node.position.y +'px'
            };

            $('#playground').find('#'+node.id).css(styles);
          }
        },
        buildStyles: function(styles) {


          var built = [];
          built.push('position: absolute');

          for (var style in styles) {
            built.push(style+':'+styles[style]);
          }
          return built.join(';');
        }
      }
    };
    
    var renderScene = function() {
      _(scene).each(function(scene_node) {
        if (renderer == 'DOM') Renders.DOM.render(scene_node);        
      });
      requestAnimationFrame(renderScene);
    };

    var bindKeyboard = function() {
      document.onkeydown = function(e) {
        e = e || window.event;

        if (e.keyCode == 37) {
          moveLeft();
        } else if (e.keyCode == 39) {
          moveRight();
        } else if (e.keyCode == 32) {
          shoot();
        }
      };
    };

    var init = function() {
      buildScene();
      bindKeyboard();
    };

    var run = function() {
      renderScene();
    };

    return {
      init: init,
      run: run
    }
  })();

  Galaga.init();
  Galaga.run();
});

