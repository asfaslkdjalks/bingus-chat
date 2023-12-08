// draw.js

// Game state
let game = {
  isPlaying: false,
  word: null,
  drawer: null,
  guesses: [],
  round: 0,
  maxRounds: 3,
  scores: {}, // Stores scores indexed by player ID
  players: [], // List of player IDs
};

const wordList = [
  "cat",
  "sun",
  "cup",
  "tree",
  "book",
  "phone",
  "house",
  "car",
  "ball",
  "hat",
];

// Function to choose a random word from the list
function chooseWord() {
  const randomIndex = Math.floor(Math.random() * wordList.length);
  return wordList[randomIndex];
}
// Function to start a new game
function nextDrawer() {
  if (game.players.length === 0) return null;
  let currentIndex = game.players.indexOf(game.drawer);
  let nextIndex = (currentIndex + 1) % game.players.length;
  return game.players[nextIndex];
}

// Start a new game and the first round
function startGame(io) {
  if (!game.isPlaying) {
    game.isPlaying = true;
    game.players = []; // Reset players list or populate it as needed
    game.drawer = game.players[0] || null; // Choose the first drawer
    startRound(io); // Start the first round
  }
}

function startRound(io) {
  game.round++;
  if (game.round <= game.maxRounds) {
    game.word = chooseWord();
    game.drawer = nextDrawer(); // Implement this function to choose the next drawer
    game.guesses = [];
    io.emit("round started", { drawer: game.drawer, round: game.round });
  } else {
    endGame(io);
  }
}

// Function to end the current game
function endGame(io) {
  game.isPlaying = false;
  game.round = 0;
  // Emit final scores
  io.emit("game ended", { scores: game.scores });
  resetGame();
}

function resetGame() {
  game.word = null;
  game.drawer = null;
  game.guesses = [];
  game.scores = {};
  game.players = [];
}
// Function to handle a new drawing from the drawer
function handleDraw(io, socket, drawData) {
  socket.broadcast.emit("drawing", drawData);
}

// Function to handle a new guess from a guesser
function handleGuess(io, socket, guess) {
  if (game.isPlaying && socket.id !== game.drawer) {
    const isCorrect = guess.toLowerCase() === game.word.toLowerCase();
    game.guesses.push({ id: socket.id, guess, isCorrect });

    if (isCorrect) {
      // Update scores
      game.scores[socket.id] = (game.scores[socket.id] || 0) + 1;
      io.emit("correct guess", { id: socket.id, guess, scores: game.scores });
      startRound(io);
    } else {
      socket.broadcast.emit("guess made", { id: socket.id, guess });
    }
  }
}

function joinGame(socketId) {
  if (!game.players.includes(socketId)) {
    game.players.push(socketId);
    game.scores[socketId] = 0; // Initialize score
  }
}

function leaveGame(socketId) {
  game.players = game.players.filter((id) => id !== socketId);
  delete game.scores[socketId];
}

module.exports = {
  startGame,
  chooseWord,
  endGame,
  handleDraw,
  handleGuess,
  joinGame,
  leaveGame,
  startRound,
};
