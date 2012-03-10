(function(){

  window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
          })();

  // CONSTANTS
  var COLORS = ['red', 'blue', 'yellow', 'green', 'white'];
  var SIZES = [2, 5, 8, 10, 14];

  // STATES
  var color = COLORS[0];
  var size = SIZES[1];


  // WebSocket

  if (!window.WebSocket) {
    if (window.MozWebSocket)
      window.WebSocket = window.MozWebSocket
  }
  var socket = new WebSocket("ws://"+location.host+"/stream");
  var connected = false;
  socket.onopen = function(evt) { 
    connected = true;
  }
  socket.onclose = function(evt) { 
    connected = false 
  };
  socket.onerror = function(evt) { console.error("error", evt); };


(function(){
  var canvas = document.getElementById("draws");
  var ctx = canvas.getContext("2d");

  var players = [];
  var pressed;

  function positionWithE (e) {
    var o = $(canvas).offset();
    return { x: e.clientX-o.left, y: e.clientY-o.top };
  }

  function send (o) {
    o.size = size;
    o.color = color;
    connected && socket.send(JSON.stringify(o));
  }

  canvas.addEventListener("mousedown", function (e) {
    var o = positionWithE(e);
    o.type = 'startLine';
    send(o);
    pressed = true;
  });
  canvas.addEventListener("mouseup", function (e) {
    var o = positionWithE(e);
    o.type = 'lineTo';
    send(o);
    send({ type: 'endLine' });
    pressed = false;
  });
  canvas.addEventListener("mousemove", function (e) {
    if (!pressed) return;
    var o = positionWithE(e);
    o.type = 'lineTo';
    send(o);
  });

  socket.onmessage = function (e) {
    var m = JSON.parse(e.data);
    var player = players[m.pid];
    if (player === undefined) {
      player = players[m.pid] = m;
    }
    if (m.type == "lineTo" || m.type=="endLine") {
      ctx.strokeStyle = m.color;
      ctx.lineWidth = m.size;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
    }
    players[m.pid] = m;
  }

  var w = canvas.width, h = canvas.height;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

}());

(function(){
  var canvas = document.getElementById("controls");
  var ctx = canvas.getContext("2d");
  var dirty = true;

  var BUTTON = 40;
  var RADIUS = 10;
  var SELECT = 4;

  function setup() {
    canvas.addEventListener("click", function (e) {
      var o = $(canvas).offset();
      var p = { x: e.clientX-o.left, y: e.clientY-o.top };
      var i = Math.floor(p.x / BUTTON);
      if (i < COLORS.length) {
        color = COLORS[i];
      }
      else {
        i -= COLORS.length;
        if ( i < SIZES.length) {
          size = SIZES[i];
        }
      }
      dirty = true;
    });
  }

  function render() {
    if (!dirty) return;
    dirty = false;
    var w = canvas.width, h = canvas.height;
    var x, y, radius;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);

    // draw colors
    x = BUTTON/2, y = h/2, radius = RADIUS;
    COLORS.forEach(function(c) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2*Math.PI);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.stroke();
      if (c == color) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.arc(x, y, radius+SELECT, 0, 2*Math.PI);
        ctx.stroke();
      }
      x += BUTTON;
    });

    // draw sizes
    ctx.fillStyle = 'black';
    SIZES.forEach(function(s) {
      ctx.beginPath();
      ctx.arc(x, y, s, 0, 2*Math.PI);
      ctx.fill();
      if (s == size) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.arc(x, y, s+SELECT, 0, 2*Math.PI);
        ctx.stroke();
      }
      x += BUTTON;
    });
  }

  setup();
  requestAnimFrame(function loop(){
    requestAnimFrame(loop);
    render();
  });

}());

}());
