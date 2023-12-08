require("dotenv").config();
const path = require('path');
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const twilio = require("twilio");
const cors = require("cors");
const crypto = require("crypto");
const drawGame = require("./draw"); // Require the draw module

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://dry-sierra-61440-40b1a1da4b1b.herokuapp.com/",
    methods: ["GET", "POST"],
  },
});

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  cors({
    origin: "https://dry-sierra-61440-40b1a1da4b1b.herokuapp.com/", // or '*' to allow all origins
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const adjectives = [
  "arcane",
  "cryptic",
  "enigmatic",
  "ephemeral",
  "ethereal",
  "mystic",
  "occult",
  "oracular",
  "phantasmal",
  "prophetic",
  "sibylline",
  "supernatural",
  "uncanny",
  "abstruse",
  "alchemic",
  "cabalistic",
  "elusive",
  "gossamer",
  "hermetic",
  "inscrutable",
  "noetic",
  "recondite",
  "thematic",
  "esoteric",
  "phantom",
  "shadowy",
  "veiled",
  "whispered",
  "forgotten",
  "hidden",
  "obscure",
];

const nouns = [
  "aether",
  "chimera",
  "enigma",
  "fable",
  "gargoyle",
  "harbinger",
  "illusion",
  "jinx",
  "karma",
  "lemniscate",
  "mandrake",
  "nexus",
  "oracle",
  "paradox",
  "quasar",
  "relic",
  "sphinx",
  "totem",
  "umbral",
  "vortex",
  "wyvern",
  "xenolith",
  "zephyr",
  "vortex",
  "serpent",
  "riddle",
  "mystery",
  "labyrinth",
  "grimoire",
];

function generateRandomName() {
  let name;
  do {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    name = `${adjective}~${noun}#anon`;
  } while (assignedNames[name]); // Repeat if the name is already assigned
  assignedNames[name] = true;
  return name;
}

let waitingQueue = [];
let activeRooms = {};

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKey = process.env.TWILIO_API_KEY;
const twilioApiSecret = process.env.TWILIO_API_SECRET;

function generateToken(identity) {
  const AccessToken = twilio.jwt.AccessToken;
  const VideoGrant = AccessToken.VideoGrant;

  const token = new AccessToken(
    twilioAccountSid,
    twilioApiKey,
    twilioApiSecret,
    { identity: identity }
  );

  const grant = new VideoGrant();
  token.addGrant(grant);

  return token.toJwt();
}

function generateUniqueColor() {
  let color;
  color = `rgb(${Math.floor(Math.random() * 75) + 100}, ${
    Math.floor(Math.random() * 75) + 100
  }, ${Math.floor(Math.random() * 75) + 100})`;
  return color;
}

let assignedNames = {};

function generateTripcode(secretPhrase) {
  // Use the SHA-256 hash of the secret phrase as the tripcode
  return crypto
    .createHash("sha256")
    .update(secretPhrase)
    .digest("base64")
    .substring(0, 10); // Take the first 10 characters for the tripcode
}

let onlineUsersCount = 0;

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  onlineUsersCount++;
  io.emit("users online", onlineUsersCount);

  // Assign a unique color and a random username by default
  const userColor = generateUniqueColor();
  socket.on("set username", (username) => {
    console.log(username.username);
    if (username.username != null) {
      socket.userName = username.username;
    } else {
      socket.userName = generateRandomName(); // Default random username
      socket.emit("set username", socket.userName);
    }
  });

  // Allow users to set their username with an optional tripcode
  socket.on("set username with tripcode", (data) => {
    let { username, secretPhrase } = data;

    // If a secret phrase was provided, generate a tripcode
    const tripcode = secretPhrase ? generateTripcode(secretPhrase) : "";
    const userNameWithTrip = username + (tripcode ? `#${tripcode}` : "");

    // Update the user's name with the username that includes the optional tripcode
    socket.userName = userNameWithTrip;

    // Notify the user about the username change
    socket.emit("username updated", userNameWithTrip);
  });

  socket.on("global chat message", (msg) => {
    let tripcode = "";
    let mentions = null;
    if (msg.tripcode != "") {
      tripcode = msg.tripcode;
    }
    if (msg.mentions != null) {
      mentions = msg.mentions;
    }
    console.log(msg);
    if (msg.msg.trim() !== "") {
      // Ensure the message is not empty or just whitespace
      const messageWithColorAndName = {
        color: userColor,
        msg: msg.msg,
        name: socket.userName,
        tripcode: tripcode,
        mentions: mentions,
      };

      // Emit the message along with the color and name to all clients
      io.emit("global chat message", messageWithColorAndName);
    }
  });

  socket.on("join", () => {
    socket.userId = socket.id;
    addToQueue(socket.userId); // Add to queue when user joins
    const token = generateToken(socket.userId);
    socket.emit("token", { token: token });
    for (const [roomSid, users] of Object.entries(activeRooms)) {
      if (users.includes(socket.id)) {
        const otherUserId = users.find((id) => id !== socket.id);
        io.to(otherUserId).emit("partner-disconnected");
        console.log(activeRooms[roomSid]);
        // Remove the room from activeRooms
        delete activeRooms[roomSid];
        console.log(activeRooms[roomSid], "here");
        break;
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.userId);
    removeFromQueue(socket.userId);
    onlineUsersCount--;
    io.emit("users online", onlineUsersCount);

    // Check if the user was in an active room
    for (const [roomSid, users] of Object.entries(activeRooms)) {
      if (users.includes(socket.id)) {
        const otherUserId = users.find((id) => id !== socket.id);
        io.to(otherUserId).emit("partner-disconnected");

        // Remove the room from activeRooms
        delete activeRooms[roomSid];
        delete assignedNames[socket.userName];

        break;
      }
    }
  });
  socket.on("typing", (data) => {
    const roomSid = socket.roomSid; // Assuming you've set this when the room was created
    if (roomSid) {
      // Broadcast the typing event to the other user in the room
      socket.to(roomSid).emit("typing", { typing: data.typing });
    }
  });
  socket.on("chat message", (msg) => {
    const roomSid = socket.roomSid;
    if (activeRooms[roomSid]) {
      io.in(roomSid).emit("chat message", msg);
    } // Broadcast to all in the room
  });

  socket.on("youtube_command", (ytLink) => {
    const roomSid = socket.roomSid;
    if (roomSid) {
      console.log("sending youtube command back to client");
      // Server-side code
      io.in(roomSid).emit("yt_command", ytLink);
    } else {
      console.log("oh noooo");
    }
  });

  socket.on('videoAction', (data) => {
    const roomSid = socket.roomSid;
    if (roomSid) {
      console.log(`Relaying video action (${data.action}) to room: ${roomSid}`);
      // Relay this message to other clients in the same room
      socket.to(roomSid).emit('videoAction', data);
    } else {
      console.log("Room SID not found for video action");
    }
  });

  // Add this new event listener for SoundCloud commands
  socket.on("soundcloud_command", (scLink) => {
    const roomSid = socket.roomSid;
    if (roomSid) {
      console.log("sending soundcloud command back to client");
      // Server-side code
      io.in(roomSid).emit("sc_command", scLink);
    } else {
      console.log("oh no, room SID not found for SoundCloud command");
    }
  });

  socket.on("start game", () => {
    drawGame.startGame(io);
  });

  socket.on("draw", (drawData) => {
    drawGame.handleDraw(io, socket, drawData);
  });

  socket.on("guess", (guess) => {
    drawGame.handleGuess(io, socket, guess);
  });
});

function createRoom() {
  const client = twilio(twilioApiKey, twilioApiSecret, {
    accountSid: twilioAccountSid,
  });
  return client.video.v1.rooms
    .create({ type: "go" }) // Updated to use the v1 API
    .then((room) => {
      console.log("Created room:", room.sid);
      return room.sid;
    })
    .catch((error) => {
      console.error("Failed to create room:", error);
      throw error;
    });
}

async function pairUsers() {
  while (waitingQueue.length >= 2) {
    // Take the first two users from the queue
    const user1 = waitingQueue.shift();
    const user2 = waitingQueue.shift();

    // Check if the two users are not the same
    if (user1 !== user2) {
      try {
        const roomSid = await createRoom();

        // Store room information
        activeRooms[roomSid] = [user1, user2];

        const token1 = generateToken(user1);
        const token2 = generateToken(user2);

        const socket1 = io.sockets.sockets.get(user1);
        const socket2 = io.sockets.sockets.get(user2);

        if (socket1) {
          socket1.join(roomSid);
          socket1.roomSid = roomSid; // Set roomSid on socket1
        }

        if (socket2) {
          socket2.join(roomSid);
          socket2.roomSid = roomSid; // Set roomSid on socket2
        }

        io.to(user1).emit("matched", { roomSid: roomSid, token: token1 });
        io.to(user2).emit("matched", { roomSid: roomSid, token: token2 });
        console.log(`Paired users ${user1} and ${user2} in room ${roomSid}`);
      } catch (error) {
        console.error("Error in pairing users:", error);
        // If there's an error, put the users back at the front of the queue
        waitingQueue.unshift(user1, user2);
      }
    } else {
      console.log(
        `User ${user1} tried to connect to themselves. Re-adding to the waiting queue.`
      );
      // If it's the same user, only put one instance back into the queue
      waitingQueue.unshift(user1);
    }
  }
}

function addToQueue(userId) {
  waitingQueue.push(userId);
  pairUsers();
}

function removeFromQueue(userId) {
  waitingQueue = waitingQueue.filter((id) => id !== userId);
}

function cleanupRoom(roomSid) {
  const client = twilio(twilioApiKey, twilioApiSecret, {
    accountSid: twilioAccountSid,
  });
  client.video.v1
    .rooms(roomSid)
    .update({ status: "completed" })
    .then((room) => console.log(`Room ${room.sid} completed`))
    .catch((error) =>
      console.error(`Error completing room ${roomSid}:`, error)
    );

  delete activeRooms[roomSid];
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

