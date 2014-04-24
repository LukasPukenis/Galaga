$(function() {
  var assets = './assets/';
  
  var AssetLoader = (function() {
    var asset_paths = [
      './Space/Space_bg_1.png',
      './Space/Space_bg_4.png',
      './Space/Space_bg_0.png',
      './Space/Space_bg_3.png',
      './Space/Space_bg_2.png',
      './preview.png',
      './Alien/Alien_l.png',
      './Alien/Alien_r.png',
      './Alien/Alien_ll.png',
      './Alien/Alien_c.png',
      './Alien/Alien_rr.png',
      './Objects/Powerup_life.png',
      './Objects/Powerup_generic.png',
      './Light/Particle.png',
      './Light/Light_blue_omni.png',
      './Light/Light_red_omni.png',
      './Ship/Ship_r.png',
      './Ship/Ship_c.png',
      './Ship/Ship_l.png',
      './Ship/Ship_rr.png',
      './Ship/Ship_ll.png',
      './Ship/Exhaust/exhaust_03.png',
      './Ship/Exhaust/exhaust_01.png',
      './Ship/Exhaust/exhaust_02.png',
      './Ship/Exhaust/exhaust_04.png',
      './Weapon/Ship_bullet.png',
      './Weapon/Alien_bullet.png',
      './Weapon/Explosion/Explosion_08.png',
      './Weapon/Explosion/Explosion_01.png',
      './Weapon/Explosion/Explosion_05.png',
      './Weapon/Explosion/Explosion_03.png',
      './Weapon/Explosion/Explosion_02.png',
      './Weapon/Explosion/Explosion_04.png',
      './Weapon/Explosion/Explosion_06.png',
      './Weapon/Explosion/Explosion_07.png'
    ];

    var load = function(callback) {
      var images = [];
      var size = asset_paths.length;
      var loaded = 0;

      _(asset_paths).each(function(asset) {
        var img = new Image();
        img.onload = function () {
          loaded++;
          if (loaded == size) {
            callback();            
          }
        }
        img.src = assets + asset + '?'+Math.random();
      });
    };

    return {
      load: load
    }
  })();

  var Galaga = (function() {    
    var scene = []; // scene objects
    var action = null;  // input action to do

    var move_step = 10;
    var bullet_step = 10;

    /*
    var enemiesGrid = [
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,2,2,2,2,2,2,0,0],
      [0,0,2,2,2,2,2,2,0,0],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1]
    ];
  */
    var enemiesGrid = [
      [0,0,0,0,0,0,0,0],
      [1,1,1,1,1,1,1,1]
    ];

    var renderer = 'DOM'; // TODO: WebGL
    var dims = {
      width: 400,
      height: 400
    };

    var prefix = 'galaga_';
    var GUID_i = 0;
    var GUID = function() {      
      GUID_i++;      
      return prefix+GUID_i;
    };

    var SceneNode = function(options) {
      for (var i in options) {
        this[i] = options[i];
      }
    };    

    var transformAssets = function() {
      scene = _(scene).map(function(s) {
        if (s.asset_id.indexOf(assets) == -1) s.asset_id = assets + s.asset_id;
        return s;
      });
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
      transformAssets();      
    };

    var removeSceneNode = function(idx, id) {
      scene.splice(idx, 1);
      if (typeof id !== undefined) {
        if (renderer == 'DOM') Renders.DOM.cleanNode(id);
      }      
    };

    var removeSceneNodeById = function(id) {
      scene = _(scene).reject(function(node) {
        return node.id == id;
      });
      if (renderer == 'DOM') Renders.DOM.cleanNode(id);
    }

    var addSceneNode = function(node) {      
      scene.push(node);
      transformAssets();
    }

    var getShip = function() {
      return _(scene).find(function(node) { return node.type == 'ship' });
    };

    var getEnemyShips = function() {
      return _(scene).filter(function(node) { return node.type == 'enemy' });
    };

    // keyboard actions
    var moveLeft = function() {
      var ship = getShip();
      ship.position.x -= move_step;
      if (ship.position.x < 0) ship.position.x = 0;
    };
    
    var moveRight = function() {
      var ship = getShip();
      ship.position.x += move_step;
      if (ship.position.x > dims.width - ship.dimensions.width) ship.position.x = dims.width - ship.dimensions.width;
    };

    var padZero = function(number) {
      if (number < 10) {
        return '0'+number;
      }
      return number;
    };

    var shoot = function() {
      var ship = getShip();

      var bullet = new SceneNode({
        type: 'bullet',
        position: {
          x: ship.position.x + (ship.dimensions.width / 2) - 2,
          y: ship.position.y - 14
        },
        dimensions: {
          width: 4,
          height: 20 
        },
        asset_id: 'Weapon/Ship_bullet.png',
        animate: function() {
          var bullet = this;
          this.position.y -= bullet_step;

          // check for collision. If enemy is hit then shot array will have it's ID
          var enemies = getEnemyShips();
          var shot = [];
          _(enemies).each(function(enemy) {
            // point -> rectangle collision
            var xcoll = bullet.position.x >= enemy.position.x && bullet.position.x <= enemy.position.x+enemy.dimensions.width;
            var ycoll = bullet.position.y >= enemy.position.y && bullet.position.y <= enemy.position.y+enemy.dimensions.height;
            
            if (xcoll && ycoll) {
              removeSceneNodeById(bullet.id);
              shot.push(enemy.id);
            }
          });

          // shot array holds the IDs shot objects so we find the enemies and replace them with explosions
          _(shot).each(function(idx) {
            for (var i = 0; i < scene.length; i++) {
              var node = scene[i];

              if (node.id == idx) {
                var explosion = new SceneNode({
                  type: 'explosion',
                  position: {
                    x: node.position.x - (node.dimensions.width / 2),
                    y: node.position.y - (node.dimensions.height / 2)
                  },
                  dimensions: {
                    width: 80,
                    height: 80 
                  },
                  frame_index: 0,
                  frame_count: 7,
                  animate: function() {
                    this.frame_index++;
                    this.asset_id = this.asset_id.replace(/[0-9]+/g, padZero(this.frame_index));

                    if (renderer = 'DOM') {
                      Renders.DOM.updateCSS(this.id, {
                        background: 'url("'+this.asset_id+'")',
                      });
                    }

                    if (this.frame_index > this.frame_count) {
                      removeSceneNodeById(this.id);
                      this.id = null;
                    }
                    console.log(' -> ',$('#'+this.id).size());
                  },
                  id: null,
                  asset_id: 'Weapon/Explosion/Explosion_01.png',
                });

                // remove enemy and insert explosion
                removeSceneNode(i, node.id);
                scene.splice(i, 0, explosion);
              }
            }
          });

          transformAssets();
          // check for out of screen bounds
          if (this.position.y < 0) removeSceneNodeById(bullet.id);
        }
      });

      addSceneNode(bullet);
    }

    // Renderers
    var Renders = {          
      DOM: {
        add_nodes: function() {
          _(scene).each(function(node, idx) {
            if (!node.id) {                            
              node.id = GUID();
              $('#playground').append('<div id="'+node.id+'" style="position: absolute; background: url('+node.asset_id+')">');
            }
          });
        },
        updateCSS: function(id, options) {
          $('#playground').find('#'+id).css(options);
        },
        cleanNode: function(node_id) {
          $('#playground').find('#'+node_id).remove();
        },
        render: function(node) {
          if (renderer = 'DOM') {
            Renders.DOM.add_nodes();
          }

          var styles = {
            width:  node.dimensions.width+'px',
            height: node.dimensions.height+'px',
            left: node.position.x+'px',
            top: node.position.y +'px'
          };

          $('#playground').find('#'+node.id).css(styles);
        }
      }
    };
    
    var renderScene = function() {
      processQueue();
      _(scene).each(function(scene_node) {
        if (renderer == 'DOM') Renders.DOM.render(scene_node);        
        if (scene_node.animate) scene_node.animate();
      });
      requestAnimationFrame(renderScene);
    };

    // bind input events and attach them to action so we can shoot without stopping the moving. Keyup is not called when another key is pressed
    var bindKeyboard = function() {      
      document.onkeydown = function(e) {
        e = e || window.event;
        if (e.keyCode == 37) {
          action = moveLeft;
        } else if (e.keyCode == 39) {
          action = moveRight;
        } else if (e.keyCode == 32) {
          shoot();
        }
      };

      document.onkeyup = function(e) {
        e = e || window.event;
        if (e.keyCode == 37) {
          action = null;
        } else if (e.keyCode == 39) {
          action = null;
        }
      }
    };

    var buildEnemies = function() {
      _(enemiesGrid).each(function(line, index) {
        _(line).each(function(type, idx) {
          if (type == 0) return;

          var enemy = new SceneNode({
            type: 'enemy',
            position: {
              x: idx * 40,
              y: index * 44
            },
            dimensions: {
              width: 36,
              height: 40 
            },
            asset_id: 'Alien/Alien_c.png',
            animate: function() {
              
            }
          });

          addSceneNode(enemy);
        });
      });
    };

    var processQueue = function() {
      if (action) action();
    };

    var init = function() {
      buildScene();
      bindKeyboard();
      buildEnemies();
    };

    var run = function() {
      renderScene();      
    };

    return {
      init: init,
      run: run
    }
  })();

  AssetLoader.load(function() {
    Galaga.init();
    Galaga.run();
  });  
});