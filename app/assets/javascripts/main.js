(function(){

  // Polyfills
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

  if (!window.WebSocket) {
    if (window.MozWebSocket)
      window.WebSocket = window.MozWebSocket
  }

  // CONSTANTS
  var COLORS = ['red', 'blue', 'yellow', 'green', 'white'];
  var SIZES = [2, 5, 8, 10, 14];

  // STATES
  var color = COLORS[0];
  var size = SIZES[1];
  var pid;
  var pname;
  var myEventCount = [];
  var localEventCount = [];
  var meCtx;

  // every player positions
  var players = {};

  var viewport = $('#viewport');

  // Init pname
  function queryPname() {
    var n = prompt("What is your name?");
    if (n) {
      localStorage.setItem("pname", n);
    }
    return n || pname;
  }
  pname = localStorage.getItem("pname") || "Player "+Math.floor(1000*Math.random());
  $('#pname').text(pname);
  $('#pname_reset').click(function(e) {
    e.preventDefault();
    pname = queryPname();
    send({ type: 'changeName', pname: pname });
    $('#pname').text(pname);
  });


  // WebSocket
  var socket = new WebSocket("ws://"+location.host+"/stream");
  var connected = false;
  socket.onopen = function(evt) { 
    connected = true;
    send({ type: 'open', size: size, color: color, pname: pname });
  }
  socket.onclose = function(evt) { 
    connected = false;
  };
  socket.onerror = function(evt) { console.error("error", evt); };


  function send (o) {
    // THESE ARE TEMPORARY, we need the server to store them, or replay everything
    o.color = color; 
    o.pname = pname;
    o.size = size;

    localEventCount[o.type] = (localEventCount[o.type] || 0) + 1;
    connected && socket.send(JSON.stringify(o));
  }


(function(){
  var canvas = document.getElementById("draws");
  var ctx = canvas.getContext("2d");

  socket.onmessage = function (e) {
    var m = JSON.parse(e.data);
    var player = players[m.pid];
    if (player === undefined) {
      player = players[m.pid] = m;
    }
    if (m.type=="youAre") {
      pid = m.pid;
    }
    if (m.pid == pid) {
      myEventCount[m.type] = (myEventCount[m.type] || 0) + 1;
    }

    if (m.type == "disconnect") {
      delete players[m.pid];
      return;
    }

    // clear local canvas if synchronized
    if (m.type=="lineTo" && myEventCount[m.type] == localEventCount[m.type])
        meCtx.clearRect(0,0,meCtx.canvas.width,meCtx.canvas.height);

    if (m.type == "lineTo" || m.type=="endLine") {
      ctx.strokeStyle = m.color;
      ctx.lineWidth = m.size;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
    }
    players[m.pid] = $.extend(players[m.pid], m);
  }

  var w = canvas.width, h = canvas.height;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

}());

// "me" canvas is where you draw before the user sends your own events (before synchronization)
(function(){
  var canvas = document.getElementById("me");
  var ctx = meCtx = canvas.getContext("2d");
  var pressed;
  var position;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function positionWithE (e) {
    var o = $(canvas).offset();
    return { x: e.clientX-(o.left-$(window).scrollLeft()), y: e.clientY-(o.top-$(window).scrollTop()) };
  }

  function lineTo(x, y) {
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      ctx.lineTo(x, y);
      ctx.stroke();
  }

  viewport.on("mousedown", function (e) {
    e.preventDefault();
    var o = positionWithE(e);
    position = o;
    o.type = 'startLine';
    send(o);
    pressed = true;
  });
  viewport.on("mouseup", function (e) {
    e.preventDefault();
    var o = positionWithE(e);
    o.type = 'lineTo';
    lineTo(o.x, o.y);
    position = o;
    send(o);
    send({ type: 'endLine' });
    pressed = false;
  });
  viewport.on("mousemove", function (e) {
    e.preventDefault();
    var o = positionWithE(e);
    o.type = pressed ? 'lineTo' : 'moveTo';
    pressed && lineTo(o.x, o.y);
    position = o;
    send(o);
  });
}());

(function(){
  var canvas = document.getElementById("positions");
  var ctx = canvas.getContext("2d");

  ctx.font = "9px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  function render () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var pid in players) { var player = players[pid];
      if (!player) return;
      ctx.beginPath();
      ctx.strokeStyle = player.color;
      ctx.arc(player.x, player.y, player.size/2, 0, 2*Math.PI);
      ctx.stroke();
      ctx.fillStyle = player.color;
      ctx.fillText((player.pname+"").substring(0,20), player.x, player.y-Math.round(player.size/2)-4);
    }
  }

  requestAnimFrame(function loop () {
    requestAnimFrame(loop);
    render();
  }, canvas);
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
        send({ type: 'changeColor', color: color });
      }
      else {
        i -= COLORS.length;
        if ( i < SIZES.length) {
          size = SIZES[i];
          send({ type: 'changeSize', size: size });
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
