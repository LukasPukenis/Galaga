$(function() {
  var assets = './assets/';

  var AssetLoader = (function() {
    // bash: find . -type f
    var asset_paths = [
      './Space/Space_bg_1.png',
      './Space/Space_bg_4.png',
      './Space/Space_bg_0.png',
      './Space/Space_bg_3.png',
      './Space/Space_bg_2.png',
      './Alien/Alien_l.png',
      './Alien/Alien_r.png',
      './Alien/Alien_ll.png',
      './Alien/Alien_c.png',
      './Alien/Alien_rr.png',
      './Objects/Powerup_life.png',
      './Objects/Powerup_generic.png',
      './Objects/Game_over.png',
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
      './Weapon/Explosion/Explosion_07.png',
      './noise.png',
      './credits.png'
    ];

    var LoadedAssets = [];

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
        LoadedAssets.push({
          path: asset,
          image: img
        });
      });
    };

    return {
      load: load,
      assets: LoadedAssets
    }
  })();

  var Galaga = (function() {
    var scene = []; // scene objects
    var action = null;  // input action to do

    var canvas = document.getElementById('playground');
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    var move_step = 10;
    var bullet_step = 10;
    var enemy_bullet_step = 17;
    var bullet_limit = 5;
    var lifes = 3;
    var score = 0;
    var konami_code_enabled = false;
    var game_over = false;
    var ship_invincible_time = 3000;  // 3 seconds
    var ship_hit_time_end = null;

    var start_time = new Date().getTime();
    var enemiesGrid = [
      [0,0,0,1,1,1,1,0,0,0],
      [0,0,2,2,2,2,2,2,0,0],
      [0,0,2,2,2,2,2,2,0,0],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1]
    ];

    var renderer = 'GL';
    var dims = {
      width: 1024,
      height: 1024
    };

    var won = false;
    var throwDice = randomRange = function(from, to) {
      if (from > to) {
        var t = from;
        from = to;
        to = t;
      }
      return from + Math.round(Math.random() * (to-from));
    };

    // bezier operations
    function lerp(a, b, t) {
      return a + ((b - a) * t);
    };

    function bezier(a, b, t) {
      return lerp(a, b, t);
    };

    function bezierQuadratic(a, b, c, t) {
      return bezier(lerp(a, b, t), lerp(b, c, t), t);
    };

    function bezierCubic(a, b, c, d, t) {
      return bezierQuadratic(lerp(a, b, t), lerp(b, c, t), lerp(c, d, t), t);
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

      // add hearts
      for (var i = 0; i < lifes; i++) {
        scene.push(new SceneNode({
          type: 'object',
          id: null,
          life: i,
          position: {
            x: dims.width - 200  - (i*36),
            y: 0
          },
          dimensions: {
            width: 36,
            height: 28
          },
          asset_id: 'Objects/Powerup_life.png',
          animate: function() {
            if (lifes == this.life) {
              removeSceneNodeById(this.id);
            }
          }
        }));
      }

      // add ship itself
      scene.push(new SceneNode({
        type: 'ship',
        was_hit: false, // this indicates that the ship has been hit and so should not be hit again while this is true
        position: {
          x: ((dims.width - 72) / 2),
          y: dims.height - 90
        },
        last_pos: {
          x: ((dims.width - 72) / 2),
          y: dims.height - 90
        },
        dimensions: {
          width: 72,
          height: 90
        },
        id: null,
        asset_id: 'Ship/Ship_c.png',
        animate: function() {
           if (this.was_hit && lifes > 0) {
            if (new Date().getTime() >= ship_hit_time_end) {
              this.visible = true;
              this.was_hit = false;
              this.position.x = ((dims.width - 72) / 2);
            }
          }
        }
      }));

      // transform asset_id fields to prepend assets folder. No need to write it all over the place
      transformAssets();
    };

    var keyboardInputBuffer = [];
    var check4KonamiCode = function(keyCode) {
      keyboardInputBuffer.push(keyCode);
      if (keyboardInputBuffer.length > 10) {
        keyboardInputBuffer.shift();
      }

      console.log(keyboardInputBuffer);
      // up up down down left right left right b a

      if (_(keyboardInputBuffer).isEqual([38, 38, 40, 40, 37, 39, 37, 39, 66, 65])) {
        konami_code_enabled = true;
      }
    };

    var removeSceneNode = function(idx, id) {
      scene.splice(idx, 1);
      if (typeof id !== undefined) {
        if (renderer == 'GL') Renders.GL.cleanNode(id);
      }
    };

    var removeSceneNodeById = function(id) {
      scene = _(scene).reject(function(node) {
        return node.id == id;
      });
      if (renderer == 'GL') Renders.GL.cleanNode(id);
    };

    var addSceneNode = function(node) {
      scene.push(node);
      transformAssets();
    };

    var getShip = function() {
      return _(scene).find(function(node) { return node.type == 'ship' });
    };

    var getEnemyShips = function() {
      return _(scene).filter(function(node) { return node.type == 'enemy' });
    };

    // keyboard actions
    var moveLeft = function() {
      var ship = getShip();
      ship.last_pos = {
        x: ship.position.x,
        y: ship.position.y
      };
      ship.position.x -= move_step;
      if (ship.position.x < 0) ship.position.x = 0;
    };

    var moveRight = function() {
      var ship = getShip();
      ship.last_pos = {
        x: ship.position.x,
        y: ship.position.y
      };
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
      if (ship.was_hit) return false;

      if (!konami_code_enabled) {
        var bullet_count = _(scene).reduce(function(count, node) {
          if (node.type == 'bullet') return count + 1;
          return count;
        }, 0);

        if (bullet_count >= bullet_limit) return false;
      }
      var bullets_to_build = 1;
      if (konami_code_enabled) bullets_to_build = 3;

      for (var bullet_i = 0; bullet_i < bullets_to_build; bullet_i++) {
        var bullet = new SceneNode({
          type: 'bullet',
          position: {
            x: ship.position.x + (ship.dimensions.width / 2) - 2 + ((bullet_i - bullets_to_build/2) * 17),
            y: ship.position.y - 14 + (Math.abs(bullet_i - bullets_to_build/2)) * 10
          },
          dimensions: {
            width: 4,
            height: 20
          },
          asset_id: 'Weapon/Ship_bullet.png',
          animate: function() {
            var bullet = this;
            this.position.y -= bullet_step;

            if (konami_code_enabled) {
              this.position.x += Math.round(5 - Math.random()*10);
            }
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

                      if (renderer == 'GL') {
                        Renders.GL.updateCSS(this.id, {
                          background: 'url("'+this.asset_id+'")',
                        });
                      }

                      if (this.frame_index > this.frame_count) {
                        removeSceneNodeById(this.id);
                        this.id = null;
                      }
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
    };

    // Renderers
    var Renders = {
      GL: {
        tvFramebuffer: null,
        tvTexture: null,
        tvRenderBuffer: null,
        tvProgram: null,
        tvNoiseTex: null,
        add_nodes: function() {
          _(scene).each(function(node, idx) {
            if (!node.id) {
              node.id = GUID();
            }
          });
        },
        setRectangle: function(gl, x, y, width, height) {
          var x1 = -width/2.0;
          var x2 = width/2.0;
          var y1 = -height/2.0;
          var y2 = height/2.0;
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
             x1, y1,
             x2, y1,
             x1, y2,
             x1, y2,
             x2, y1,
             x2, y2]), gl.STATIC_DRAW);
        },

        createRenderBuffer: function () {
             // create shaders for tv render
             this.tvVertexShader = createShaderFromScriptElement(gl, "2d-tv-vertex-shader");
             this.tvFragmentShader = createShaderFromScriptElement(gl, "2d-tv-fragment-shader");
             this.tvProgram = createProgram (gl, [this.tvVertexShader, this.tvFragmentShader]);

             // create frame buffer
             this.tvFramebuffer = gl.createFramebuffer();
             gl.bindFramebuffer(gl.FRAMEBUFFER, this.tvFramebuffer);

             // create frame texture
             this.tvTexture = gl.createTexture();
             gl.bindTexture(gl.TEXTURE_2D, this.tvTexture);
             gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
             gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

             // bind frame buffer to frame texture
             gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

             // add depth buffer

             this.tvRenderBuffer = gl.createRenderbuffer();
             gl.bindRenderbuffer (gl.RENDERBUFFER, this.tvRenderBuffer);
             gl.renderbufferStorage (gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 1024, 1024);

             // attach texture and render buffer to frame buffer object
             gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tvTexture, 0);
             gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.tvRenderBuffer);

             // rebind defaults
             gl.bindTexture(gl.TEXTURE_2D, null);
             gl.bindRenderbuffer(gl.RENDERBUFFER, null);
             gl.bindFramebuffer(gl.FRAMEBUFFER, null);

             var image = _(AssetLoader.assets).find (function (asset) { return asset.path == './noise.png'; }).image;

             this.tvNoiseTex = gl.createTexture ();
             gl.bindTexture(gl.TEXTURE_2D, this.tvNoiseTex);
             gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
             gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
             gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      },
       init: function() {
          this.startTime = (new Date ()).getTime ();
          this.createRenderBuffer ();
          var canvas = document.getElementById('playground');
          var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

          this._buffer = gl.createBuffer();
          gl.bindTexture(gl.TEXTURE_2D, null);

          // setup GLSL program
          vertexShader = createShaderFromScriptElement(gl, "2d-vertex-shader");
          fragmentShader = createShaderFromScriptElement(gl, "2d-fragment-shader");

          program = createProgram(gl, [vertexShader, fragmentShader]);
          gl.useProgram(program);

          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
          gl.disable(gl.DEPTH_TEST);


          this.texCoordBuffer = gl.createBuffer();
          this.positionLocation = gl.getAttribLocation(program, "a_position");
          this.texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

          gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
          gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array([
              0.0,  0.0,
              1.0,  0.0,
              0.0,  1.0,
              0.0,  1.0,
              1.0,  0.0,
              1.0,  1.0]),
          gl.STATIC_DRAW);

          gl.enableVertexAttribArray(this.texCoordLocation);
          gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

          //////////////////
          _.each(AssetLoader.assets, function(asset) {
            var img = asset.image;
            // upload images one by one to gpu
            gl.activeTexture(gl.TEXTURE0);
            var texture = gl.createTexture();
            asset.glTexture = texture;
            gl.bindTexture(gl.TEXTURE_2D, texture);

            // Set the parameters so we can render any size image.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          });

          ////////////////
          Renders.GL.initialized = true;
        },
        startFrame: function () {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.tvFramebuffer);
            gl.clearColor (0.0, 0.0, 0.0, 1.0);
            gl.clear (gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        },
        endFrame: function () {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            this.renderTvTexture () ;
        },
        updateCSS: function(id, options) {
          $('#playground').find('#'+id).css(options);
        },
        cleanNode: function(node_id) {
          $('#playground').find('#'+node_id).remove();
        },
        render: function(node) {
          if (window.pause) return false;
          if (!Renders.GL.initialized) Renders.GL.init();
          if (node.visible === false) return;

          Renders.GL.add_nodes();

          var asset_entry = _(AssetLoader.assets).find(function(asset) {
            return (assets+asset.path).replace('/./', '/') == node.asset_id;
          });
          var image = asset_entry.image;

          gl.activeTexture(gl.TEXTURE0);

          // get the texture
          var tex = asset_entry.glTexture;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.useProgram(program);

          // lookup uniforms
          var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
          var rotation = gl.getUniformLocation(program, "u_rotation");
          var center = gl.getUniformLocation(program, "u_center");
          var time_passed = gl.getUniformLocation(program, "u_time");

          gl.uniform1f(time_passed, (new Date().getTime() - start_time) / 1000);

          // set the resolution
          gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

          if ( !isNaN(parseInt(node.rotation))) {
            gl.uniform1f(rotation, node.rotation);
          } else {
            gl.uniform1f(rotation, 0);
          }

          var center_x = node.position.x + (node.dimensions.width / 2);
          var center_y = node.position.y + (node.dimensions.height / 2);

          gl.uniform2f(center, center_x, center_y);

          // Create a buffer for the position of the rectangle corners.
          gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
          gl.enableVertexAttribArray(this.positionLocation);
          gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

          // Set a rectangle the same size as the image.
          this.setRectangle(gl, node.position.x, node.position.y, image.width, image.height);

          // Draw the rectangle.
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        },

        renderTvTexture: function () {
          gl.clearColor (0.0, 0.0, 0.0, 1.0);
          gl.clear (gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
          // provide texture coordinates for the rectangle.


          gl.useProgram(this.tvProgram);

          var u_time = ((new Date ()).getTime () - this.startTime)/1000.0;
          gl.uniform1f (gl.getUniformLocation (this.tvProgram, "u_time"), u_time);
          gl.uniform2f (gl.getUniformLocation (this.tvProgram, "u_resolution"), 1024, 1024);
          gl.uniform1i (gl.getUniformLocation (this.tvProgram, "u_image"), 0);
          gl.uniform1i (gl.getUniformLocation (this.tvProgram, "u_noise"), 1);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, this.tvTexture);

          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, this.tvNoiseTex);

          // Create a buffer for the position of the rectangle corners.
          var buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.enableVertexAttribArray(this.positionLocation);
          gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

          // Set a rectangle the same size as the image.
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
           -1, -1,
            1, -1,
           -1,  1,
           -1,  1,
            1, -1,
            1,  1]),
            gl.STATIC_DRAW);
          // Draw the rectangle.
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }
    };

    var renderScene = function() {
      if (getEnemyShips().length == 0) Win();
      processQueue();
      Renders.GL.startFrame();

      for (var i = 0; i < scene.length; i++) {
        var scene_node = scene[i];
        if (renderer == 'GL') Renders.GL.render(scene_node);
        if (scene_node.animate) scene_node.animate();
      }
      Renders.GL.endFrame();
      requestAnimationFrame(renderScene);
    };

    // bind input events and attach them to action so we can shoot without stopping the moving. Keyup is not called when another key is pressed
    var bindKeyboard = function() {
      // also bind touches
      $('#left_btn').on('touchstart mousedown', function() {
        action = moveLeft;
      });
      $('#left_btn').on('touchend mouseup', function() {
        action = null;
        return false;
      });
      $('#right_btn').on('touchstart mousedown', function() {
        action = moveRight;
        return false;
      });
      $('#right_btn').on('touchend mouseup', function() {
        action = null;
        return false;
      });
      $('#shoot_btn').on('touchstart mousedown', function() {
        shoot();
        return false;
      });

      document.onkeydown = function(e) {
        e = e || window.event;

        check4KonamiCode(e.keyCode);

        if (action == null && e.keyCode == 37) {
          action = moveLeft;
        } else if (action == null && e.keyCode == 39) {
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

    var calculateEnemyPath = function(source, destination) {
      return {
        A: {
          x: source.position.x,
          y: source.position.y
        },
        P1: {
          x: source.position.x,
          y: source.position.y
        },
        P2: {
          x: destination.position.x,
          y: destination.position.y
        },
        B: {
          x: destination.position.x,
          y: destination.position.y
        }
      }
    };

    var Win = function() {
      if (won) return;
      won = true;
      scene = _(scene).reduce(function(new_scene, node) {
        if (node.type == 'ship') {
          new_scene.push(node);
        }
        return new_scene;
      }, []);

      getShip().visible = false;
      scene.push(new SceneNode({
        id: null,
        asset_id: 'credits.png',
        position: {
          x: (1024 - 415) / 2,
          y: 1024
        },
        dimensions: {
          width: 415,
          height: 1767
        },
        animate: function() {
          this.position.y -= 2;
          if (this.position.y <= -1060) {
            this.animate = null;
          }
        }
      }));
      transformAssets();
    };

    var gameOver = function() {
      scene.push(new SceneNode({
        type: 'object',
        asset_id: 'Objects/Game_over.png',
        id: null,
        position: {
          x: (dims.width - 362) / 2,
          y: (dims.height - 63) / 2
        },
        dimensions: {
          width: 362,
          height: 63
        }
      }));
      game_over = true;
      transformAssets();
    };

    var shipWasHit = function() {
      lifes--;

      if (lifes <= 0) {
        gameOver();
      }

      var ship = getShip();

      ship.visible = false;
      ship.was_hit = true;
      ship_hit_time_end = new Date().getTime() + ship_invincible_time;

      if (ship.was_hit) {
        hit = false;
        var explosion = new SceneNode({
          type: 'explosion',
          position: {
            x: ship.position.x + ((ship.dimensions.width - 80) / 2),
            y: ship.position.y + ((ship.dimensions.height - 80) / 2)
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

            if (renderer == 'GL') {
              Renders.GL.updateCSS(this.id, {
                background: 'url("'+this.asset_id+'")',
              });
            }

            if (this.frame_index > this.frame_count) {
              removeSceneNodeById(this.id);
              this.id = null;
            }
          },
          id: null,
          asset_id: 'Weapon/Explosion/Explosion_01.png',
        });

        transformAssets();
        addSceneNode(explosion);
      }
    };

    var buildEnemies = function() {
      _(enemiesGrid).each(function(line, index) {
        _(line).each(function(type, idx) {
          if (type == 0) return;

          var enemy = new SceneNode({
            type: 'enemy',
            position: {
              x: ((dims.width / 2) - (line.length * 40 / 1.4)) + idx * 1.4 * 40,
              y: index * 48
            },
            dimensions: {
              width: 36,
              height: 40
            },
            asset_id: 'Alien/Alien_c.png',
            attacking: false,
            going_back: false,
            attack_speed: 5000,
            attack_iteration: 0.0,  // this will go up to 1.0
            attack_start_time: null,
            attack_bezier_params: {
              A: null,
              P1: null,
              P2: null,
              B: null
            },
            before_attacking_pos: {
              x: null,
              y: null
            },
            shot: false,
            rotation: 0,
            last_x: null,
            last_y: null,
            shot_bullet: false,

            animate: function() {
              // check to see if enemy itself didnt hit the ship
              var ship = getShip();

              if (!ship.was_hit) {
                var r1 = ship.position;
                var r2 = this.position;

                r1.right = r1.x + ship.dimensions.width;
                r1.bottom = r1.y + ship.dimensions.height;

                r2.right = r2.x + this.dimensions.width;
                r2.bottom = r2.y + this.dimensions.height;

                if (!(r1.right < r2.x || r2.right < r1.x || r1.bottom < r2.y || r2.bottom < r1.y )) {
                  removeSceneNodeById(this.id);
                  shipWasHit();
                }
              }

              // decide to shoot
              if (!game_over && this.attacking && !this.shot && throwDice(0, 1000) == 1) {
                this.shot = true;

                var bullet = new SceneNode({
                  type: 'enemy_bullet',
                  position: {
                    x: this.position.x + (this.dimensions.width / 2) - 2,
                    y: this.position.y - 14
                  },
                  dimensions: {
                    width: 4,
                    height: 20
                  },
                  asset_id: 'Weapon/Alien_bullet.png',
                  animate: function() {
                    this.position.y += enemy_bullet_step;

                    // check for collision. If enemy is hit then shot array will have it's ID
                    var ship = getShip();
                    var xcoll = this.position.x >= ship.position.x && this.position.x <= ship.position.x+ship.dimensions.width;
                    var ycoll = this.position.y >= ship.position.y && this.position.y <= ship.position.y+ship.dimensions.height;

                    if (xcoll && ycoll) {
                      removeSceneNodeById(this.id);
                      shipWasHit();
                    }
                  }
                });

                addSceneNode(bullet);
              }

              // decide to attack or not
              if (!game_over && !this.attacking && !this.going_back && throwDice(0, 6000) == 1) {
                this.attacking = true;
                this.before_attack_pos = {
                  x: this.position.x,
                  y: this.position.y
                },
                this.attack_start_time = new Date().getTime(),
                this.attack_bezier_params = calculateEnemyPath(this, getShip());
              }

              // fly to attack
              if ((this.attacking && !this.going_back) || (!this.attacking && this.going_back) ) {
                var time_diff = new Date().getTime() - this.attack_start_time;
                var t = time_diff / this.attack_speed;
                var ship = getShip();
                var ship_pos = ship.position;
                var last_pos = ship.last_pos;

                if (t <= 1.0) {
                  var new_x, new_y;
                  if (this.attacking) {
                    new_x = bezierCubic(this.attack_bezier_params.A.x, this.attack_bezier_params.P1.x, this.attack_bezier_params.P2.x, this.attack_bezier_params.B.x, t);
                    new_y = bezierCubic(this.attack_bezier_params.A.y, this.attack_bezier_params.P1.y, this.attack_bezier_params.P2.y, this.attack_bezier_params.B.y, t);
                  } else {
                    new_x = bezierCubic(this.attack_bezier_params.B.x, this.attack_bezier_params.P2.x, this.attack_bezier_params.P1.x, this.attack_bezier_params.A.x, t);
                    new_y = bezierCubic(this.attack_bezier_params.B.y, this.attack_bezier_params.P2.y, this.attack_bezier_params.P1.y, this.attack_bezier_params.A.y, t);
                  }

                  if (this.last_x && this.last_y) {
                    this.rotation = Math.atan2( this.last_y-new_y, this.last_x-new_x);
                    this.rotation = this.rotation + Math.PI / 2.0; // radians -> angle
                  }
                  this.last_x = new_x;
                  this.last_y = new_y;

                  this.position = { x: new_x, y: new_y };
                } else if (this.attacking) {
                  this.attacking = false;
                  this.going_back = true;

                  this.attack_start_time = new Date().getTime();
                  this.attack_bezier_params = calculateEnemyPath({
                    position: this.before_attack_pos
                  }, this);

                } else {
                  this.rotation = 0;
                  return;
                }
              }
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