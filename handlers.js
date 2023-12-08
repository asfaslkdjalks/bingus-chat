// const twilio = require("twilio");

// // Twilio credentials from environment variables
// const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
// const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
// const twilioApiKey = process.env.TWILIO_API_KEY;
// const twilioApiSecret = process.env.TWILIO_API_SECRET;

// // Initialize Twilio client
// const client = twilio(twilioApiKey, twilioApiSecret, { accountSid: twilioAccountSid });

// // Manage queues and rooms in-memory (for demo purposes, consider a persistent storage for production)
// let waitingQueue = [];
// let activeRooms = {};

// function generateToken(identity) {
//   const AccessToken = twilio.jwt.AccessToken;
//   const VideoGrant = AccessToken.VideoGrant;

//   const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret, { identity: identity });
//   const grant = new VideoGrant();
//   token.addGrant(grant);

//   return token.toJwt();
// }

// function handleJoin(socket, io) {
//   socket.userId = socket.id;
//   addToQueue(socket.userId);
//   const token = generateToken(socket.userId);
//   socket.emit("token", { token: token });
// }

// function handleDisconnect(socket, io) {
//   removeFromQueue(socket.userId);
//   notifyPartnerAndCleanup(socket.userId, io);
// }

// function handleTyping(socket, data, io) {
//   const roomSid = socket.roomSid;
//   if (roomSid) {
//     socket.to(roomSid).emit("typing", data);
//   }
// }

// function handleChatMessage(socket, msg, io) {
//   const roomSid = socket.roomSid;
//   if (roomSid) {
//     io.in(roomSid).emit("chat message", msg);
//   }
// }

// function handleYoutubeCommand(socket, ytLink, io) {
//   const roomSid = socket.roomSid;
//   if (roomSid) {
//     io.in(roomSid).emit("yt_command", ytLink);
//   }
// }

// function addToQueue(userId) {
//   waitingQueue.push(userId);
//   pairUsers(); // You may need to implement this function if not already done
// }

// function removeFromQueue(userId) {
//   waitingQueue = waitingQueue.filter(id => id !== userId);
// }

// function notifyPartnerAndCleanup(userId, io) {
//   // Find the room the user was in
//   const roomSid = Object.keys(activeRooms).find(sid => activeRooms[sid].includes(userId));
//   if (roomSid) {
//     const partnerId = activeRooms[roomSid].find(id => id !== userId);
//     if (partnerId) {
//       io.to(partnerId).emit("partner-disconnected");
//     }
//     delete activeRooms[roomSid];
//   }
// }

// async function createRoom() {
//     try {
//       const room = await client.video.v1.rooms.create({
//         type: 'go'
//       });
//       console.log("Created room:", room.sid);
//       return room.sid;
//     } catch (error) {
//       console.error("Failed to create room:", error);
//       throw error;
//     }
//   }
  
  
  
//   async function pairUsers() {
//     while (waitingQueue.length >= 2) {
//       const user1 = waitingQueue.shift();
//       const user2 = waitingQueue.shift();
//       if (user1 !== user2) {
//         try {
//           const roomSid = await createRoom();
//           activeRooms[roomSid] = [user1, user2];
//           // ... (emit events to both users with the room info) ...
//         } catch (error) {
//           console.error("Error in pairing users:", error);
//           waitingQueue.unshift(user1, user2); // Requeue users on error
//         }
//       } else {
//         console.log(`User ${user1} tried to connect to themselves. Re-adding to the waiting queue.`);
//         waitingQueue.unshift(user1);
//       }
//     }
//   }
  
//   function cleanupRoom(roomSid) {
//     // ... logic to complete a room in Twilio and clean up local state ...
//   }

// // ... include other necessary functions and exports ...

// module.exports = {
//   handleJoin,
//   handleDisconnect,
//   handleTyping,
//   handleChatMessage,
//   handleYoutubeCommand,
//   createRoom,
//   pairUsers,
//   cleanupRoom,
// };
