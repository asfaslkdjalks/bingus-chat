// drawClient.js

let socket; // Assuming socket.io is already initialized in your main.js
let currentDrawer = null; // ID of the current drawer
let currentUser = null; // ID of the current user, set this based on your application logic

// Initialize the drawing game
function initDrawingGame(initSocket) {
  socket = initSocket;
  setupCanvas();
  setupGuessListener();
  setupSocketListeners();
}

// Setup the canvas for drawing
function setupCanvas() {
  const canvas = document.getElementById('drawing-canvas');
  const context = canvas.getContext('2d');
  let drawing = false;

  canvas.addEventListener('mousedown', (event) => {
    if (currentUser === currentDrawer) {
      drawing = true;
      draw(event);
    }
  });

  canvas.addEventListener('mouseup', () => {
    drawing = false;
    context.beginPath();
  });

  canvas.addEventListener('mousemove', (event) => {
    if (drawing && currentUser === currentDrawer) {
      draw(event);
    }
  });

  function draw(event) {
    if (!drawing) return;
    context.lineWidth = 3; // Example width, make it adjustable as needed
    context.lineCap = 'round';
    context.strokeStyle = 'black'; // Example color, make it adjustable as needed

    context.lineTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);
    context.stroke();
    context.beginPath();
    context.moveTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);

    // Send the drawing data to the server
    socket.emit('draw', { /* drawing data */ });
  }
}

// Setup listener for guesses
function setupGuessListener() {
  const guessInput = document.getElementById('guess-input');
  guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      socket.emit('guess', guessInput.value);
      guessInput.value = '';
    }
  });
}

// Setup Socket.io listeners for drawing game events
function setupSocketListeners() {
  socket.on('round started', (data) => {
    currentDrawer = data.drawer;
    // Handle new round start
  });

  socket.on('drawing', (drawData) => {
    // Update canvas with incoming drawing data
  });

  socket.on('correct guess', (data) => {
    // Handle correct guess
  });

  socket.on('guess made', (data) => {
    // Display other players' guesses
  });

  socket.on('game ended', (data) => {
    // Display end of game results
  });
}

export { initDrawingGame };
