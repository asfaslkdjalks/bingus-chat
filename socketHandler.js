// const { Server } = require("socket.io");
// const twilioLogic = require("./handlers");

// let io;

// function init(server) {
//   io = new Server(server, {
//     cors: {
//       origin: "http://localhost:3000",
//       methods: ["GET", "POST"],
//     },
//   });

//   io.on("connection", (socket) => {
//     console.log("A user connected:", socket.id);

//     socket.on("join", () => twilioLogic.handleJoin(socket, io));
//     socket.on("disconnect", () => twilioLogic.handleDisconnect(socket, io));
//     socket.on("typing", (data) => twilioLogic.handleTyping(socket, data, io));
//     socket.on("chat message", (msg) => twilioLogic.handleChatMessage(socket, msg, io));
//     socket.on("youtube_command", (ytLink) => twilioLogic.handleYoutubeCommand(socket, ytLink, io));
//   });
// }

// module.exports = { init };
