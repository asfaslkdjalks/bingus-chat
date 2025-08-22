require("dotenv").config();
const path = require('path');
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");
const drawGame = require("./draw");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true
  },
});

const port = process.env.PORT || 3000;

// Add this after your existing middleware setup
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React build
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // Handle React routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
  methods: ["GET", "POST"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Name generation arrays
const adjectives = [
  "arcane", "cryptic", "enigmatic", "ephemeral", "ethereal",
  "mystic", "occult", "oracular", "phantasmal", "prophetic",
  "sibylline", "supernatural", "uncanny", "abstruse", "alchemic",
  "cabalistic", "elusive", "gossamer", "hermetic", "inscrutable",
  "noetic", "recondite", "thematic", "esoteric", "phantom",
  "shadowy", "veiled", "whispered", "forgotten", "hidden", "obscure"
];

const nouns = [
  "aether", "chimera", "enigma", "fable", "gargoyle",
  "harbinger", "illusion", "jinx", "karma", "lemniscate",
  "mandrake", "nexus", "oracle", "paradox", "quasar",
  "relic", "sphinx", "totem", "umbral", "vortex",
  "wyvern", "xenolith", "zephyr", "serpent",
  "riddle", "mystery", "labyrinth", "grimoire"
];

// Global state
let waitingQueue = [];
let activeRooms = {};
let assignedNames = {};
let onlineUsersCount = 0;
let userColors = new Map(); // Store user colors
let publicRooms = new Map(); // Store public rooms

// Helper functions
function generateRandomName() {
  let name;
  do {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    name = `${adjective}~${noun}#anon`;
  } while (assignedNames[name]);
  assignedNames[name] = true;
  return name;
}

function generateUniqueColor() {
  return `rgb(${Math.floor(Math.random() * 75) + 100}, ${
    Math.floor(Math.random() * 75) + 100
  }, ${Math.floor(Math.random() * 75) + 100})`;
}

function generateTripcode(secretPhrase) {
  return crypto
    .createHash("sha256")
    .update(secretPhrase)
    .digest("base64")
    .substring(0, 10);
}

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  onlineUsersCount++;
  io.emit("users online", onlineUsersCount);

  // Assign a unique color to this user
  const userColor = generateUniqueColor();
  userColors.set(socket.id, userColor);
  
  // Initialize username
  socket.userName = null;
  
  // Handle username setting
  socket.on("set username", (data) => {
    console.log("Setting username:", data);
    if (data && data.username != null) {
      socket.userName = data.username;
    } else {
      socket.userName = generateRandomName();
      socket.emit("set username", socket.userName);
    }
    console.log("Username set to:", socket.userName);
  });

  // Handle username with tripcode
  socket.on("set username with tripcode", (data) => {
    console.log("Setting username with tripcode:", data);
    let { username, secretPhrase } = data;
    const tripcode = secretPhrase ? generateTripcode(secretPhrase) : "";
    const userNameWithTrip = username + (tripcode ? `#${tripcode}` : "");
    socket.userName = userNameWithTrip;
    socket.emit("username updated", userNameWithTrip);
    console.log("Username with tripcode set to:", socket.userName);
  });

  // Handle global chat messages
  socket.on("global chat message", (msg) => {
    console.log("Received global chat message:", msg, "from user:", socket.userName);
    
    let tripcode = "";
    let mentions = null;
    
    if (msg.tripcode && msg.tripcode !== "") {
      tripcode = msg.tripcode;
    }
    if (msg.mentions != null) {
      mentions = msg.mentions;
    }
    
    if (msg.msg && msg.msg.trim() !== "") {
      // If user doesn't have a username yet, assign one
      if (!socket.userName) {
        socket.userName = generateRandomName();
        socket.emit("set username", socket.userName);
        console.log("Auto-assigned username:", socket.userName);
      }
      
      const messageWithColorAndName = {
        color: userColors.get(socket.id),
        msg: msg.msg,
        name: socket.userName,
        tripcode: tripcode,
        mentions: mentions,
        timestamp: new Date().toISOString()
      };
      
      console.log("Broadcasting global message:", messageWithColorAndName);
      io.emit("global chat message", messageWithColorAndName);
    }
  });

  // Handle joining queue for random chat
  socket.on("join", () => {
    console.log("User joining queue:", socket.id);
    socket.userId = socket.id;
    
    // Clean up any existing rooms for this user
    for (const [roomSid, users] of Object.entries(activeRooms)) {
      if (users.includes(socket.id)) {
        const otherUserId = users.find((id) => id !== socket.id);
        if (otherUserId) {
          io.to(otherUserId).emit("partner-disconnected");
        }
        delete activeRooms[roomSid];
        break;
      }
    }
    
    addToQueue(socket.userId);
  });

  // Handle typing indicator
  socket.on("typing", (data) => {
    const roomSid = socket.roomSid;
    if (roomSid && activeRooms[roomSid]) {
      socket.to(roomSid).emit("typing", { typing: data.typing });
    }
  });

  // Handle private chat messages
  socket.on("chat message", (msg) => {
    console.log("Chat message in room:", socket.roomSid, "Message:", msg);
    const roomSid = socket.roomSid;
    if (roomSid && activeRooms[roomSid]) {
      io.in(roomSid).emit("chat message", msg);
    }
  });

  // Handle YouTube commands
  socket.on("youtube_command", (ytLink) => {
    const roomSid = socket.roomSid;
    if (roomSid && activeRooms[roomSid]) {
      console.log("Sending YouTube command to room:", roomSid);
      io.in(roomSid).emit("yt_command", ytLink);
    }
  });

  // Handle video sync actions
  socket.on('videoAction', (data) => {
    const roomSid = socket.roomSid;
    if (roomSid && activeRooms[roomSid]) {
      console.log(`Relaying video action (${data.action}) to room: ${roomSid}`);
      socket.to(roomSid).emit('videoAction', data);
    }
  });

  // Handle SoundCloud commands
  socket.on("soundcloud_command", (scLink) => {
    const roomSid = socket.roomSid;
    if (roomSid && activeRooms[roomSid]) {
      console.log("Sending SoundCloud command to room:", roomSid);
      io.in(roomSid).emit("sc_command", scLink);
    }
  });

  // Drawing game handlers
  socket.on("start game", () => {
    if (socket.roomSid && activeRooms[socket.roomSid]) {
      drawGame.startGame(io, socket.roomSid);
    }
  });

  socket.on("draw", (drawData) => {
    if (socket.roomSid && activeRooms[socket.roomSid]) {
      drawGame.handleDraw(io, socket, drawData);
    }
  });

  socket.on("guess", (guess) => {
    if (socket.roomSid && activeRooms[socket.roomSid]) {
      drawGame.handleGuess(io, socket, guess);
    }
  });

  // Public Rooms functionality
  socket.on("create_room", (data) => {
    const roomId = `public_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const room = {
      id: roomId,
      name: data.name,
      creator: socket.userName || 'Anonymous',
      creatorId: socket.id,
      users: [{
        id: socket.id,
        name: socket.userName || 'Anonymous'
      }],
      createdAt: new Date()
    };
    
    publicRooms.set(roomId, room);
    socket.publicRoomId = roomId;
    socket.join(roomId);
    
    socket.emit("room_created", {
      id: roomId,
      name: room.name,
      creator: room.creator,
      users: room.users.map(u => u.name)
    });
    
    console.log(`Room created: ${room.name} by ${room.creator}`);
  });

  socket.on("get_rooms", () => {
    const roomList = Array.from(publicRooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      creator: room.creator,
      userCount: room.users.length
    }));
    socket.emit("room_list", roomList);
  });

  socket.on("join_room", (data) => {
    const room = publicRooms.get(data.roomId);
    if (room) {
      // Leave previous room if any
      if (socket.publicRoomId && socket.publicRoomId !== data.roomId) {
        const prevRoom = publicRooms.get(socket.publicRoomId);
        if (prevRoom) {
          prevRoom.users = prevRoom.users.filter(u => u.id !== socket.id);
          socket.leave(socket.publicRoomId);
          io.to(socket.publicRoomId).emit("room_user_left", {
            username: socket.userName || 'Anonymous'
          });
        }
      }
      
      // Join new room
      socket.publicRoomId = data.roomId;
      socket.join(data.roomId);
      
      room.users.push({
        id: socket.id,
        name: socket.userName || 'Anonymous'
      });
      
      socket.emit("room_joined", {
        id: room.id,
        name: room.name,
        creator: room.creator,
        users: room.users.map(u => u.name)
      });
      
      socket.to(data.roomId).emit("room_user_joined", {
        username: socket.userName || 'Anonymous'
      });
      
      console.log(`${socket.userName} joined room ${room.name}`);
    }
  });

  socket.on("leave_room", (data) => {
    const room = publicRooms.get(data.roomId);
    if (room) {
      room.users = room.users.filter(u => u.id !== socket.id);
      socket.leave(data.roomId);
      
      // If creator left and room is empty, delete room
      if (room.creatorId === socket.id && room.users.length === 0) {
        publicRooms.delete(data.roomId);
        io.to(data.roomId).emit("room_closed");
      } else {
        socket.to(data.roomId).emit("room_user_left", {
          username: socket.userName || 'Anonymous'
        });
      }
      
      socket.publicRoomId = null;
      console.log(`${socket.userName} left room ${room.name}`);
    }
  });

  socket.on("room_message", (data) => {
    const room = publicRooms.get(data.roomId);
    if (room && socket.publicRoomId === data.roomId) {
      const messageData = {
        color: userColors.get(socket.id),
        msg: data.msg,
        name: socket.userName || 'Anonymous',
        timestamp: new Date().toISOString()
      };
      
      io.to(data.roomId).emit("room_message", messageData);
      console.log(`Room message in ${room.name}: ${data.msg}`);
    }
  });

  socket.on("room_video", (data) => {
    const room = publicRooms.get(data.roomId);
    if (room && room.creatorId === socket.id) {
      io.to(data.roomId).emit("room_video", {
        link: data.link
      });
      console.log(`Video played in room ${room.name}: ${data.link}`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    onlineUsersCount--;
    io.emit("users online", onlineUsersCount);
    
    // Remove from queue if present
    removeFromQueue(socket.id);
    
    // Clean up user color
    userColors.delete(socket.id);
    
    // Clean up assigned name
    if (socket.userName && assignedNames[socket.userName]) {
      delete assignedNames[socket.userName];
    }
    
    // Clean up public room if in one
    if (socket.publicRoomId) {
      const room = publicRooms.get(socket.publicRoomId);
      if (room) {
        room.users = room.users.filter(u => u.id !== socket.id);
        
        if (room.creatorId === socket.id && room.users.length === 0) {
          publicRooms.delete(socket.publicRoomId);
          io.to(socket.publicRoomId).emit("room_closed");
        } else {
          socket.to(socket.publicRoomId).emit("room_user_left", {
            username: socket.userName || 'Anonymous'
          });
        }
      }
    }
    
    // Notify partner if in active room
    for (const [roomSid, users] of Object.entries(activeRooms)) {
      if (users.includes(socket.id)) {
        const otherUserId = users.find((id) => id !== socket.id);
        if (otherUserId) {
          io.to(otherUserId).emit("partner-disconnected");
        }
        delete activeRooms[roomSid];
        break;
      }
    }
  });
});

// Room management functions
function createRoom() {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function pairUsers() {
  while (waitingQueue.length >= 2) {
    const user1 = waitingQueue.shift();
    const user2 = waitingQueue.shift();

    if (user1 !== user2) {
      try {
        const roomSid = createRoom();
        activeRooms[roomSid] = [user1, user2];

        const socket1 = io.sockets.sockets.get(user1);
        const socket2 = io.sockets.sockets.get(user2);

        if (socket1 && socket2) {
          // Join both sockets to the room
          socket1.join(roomSid);
          socket1.roomSid = roomSid;
          
          socket2.join(roomSid);
          socket2.roomSid = roomSid;
          
          // Notify both users they're matched
          io.to(user1).emit("matched", { roomSid: roomSid });
          io.to(user2).emit("matched", { roomSid: roomSid });
          
          console.log(`Paired users ${user1} and ${user2} in room ${roomSid}`);
        } else {
          // One or both users disconnected, clean up
          if (!socket1) removeFromQueue(user1);
          if (!socket2) removeFromQueue(user2);
          delete activeRooms[roomSid];
        }
      } catch (error) {
        console.error("Error in pairing users:", error);
        // Re-add users to queue on error
        waitingQueue.unshift(user1, user2);
      }
    } else {
      console.log(`Same user ID ${user1} detected, re-adding to queue`);
      waitingQueue.unshift(user1);
    }
  }
}

function addToQueue(userId) {
  if (!waitingQueue.includes(userId)) {
    waitingQueue.push(userId);
    console.log(`Added ${userId} to queue. Queue length: ${waitingQueue.length}`);
    pairUsers();
  }
}

function removeFromQueue(userId) {
  const index = waitingQueue.indexOf(userId);
  if (index > -1) {
    waitingQueue.splice(index, 1);
    console.log(`Removed ${userId} from queue. Queue length: ${waitingQueue.length}`);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Accepting connections from http://localhost:5173`);
});