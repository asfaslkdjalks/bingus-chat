const socket = io();
// setupLocalVideo();
// DOM elements
const startSearchingButton = document.getElementById("start-searching");
// const localVideoDiv = document.getElementById("local-video");
// const remoteVideoDiv = document.getElementById("remote-videos");
const searchingMessage = document.getElementById("searching-message");
const connectedMessage = document.getElementById("connected-message");
const defaultMessage = document.getElementById("default-message");
const disconnectedMessage = document.getElementById("disconnected-message");
const messageInput = document.getElementById("messageInput");
const commandInput = document.getElementById("commandInput");
const sendButton = document.getElementById("sendButton");
const messagesContainer = document.getElementById("messages");
let localStream;
let room;

const emojiMap = {
  ":smile:": "😊",
  ":laugh:": "😂",
  ":heart:": "❤️",
  ":thumbs_up:": "👍",
  ":thumbs_down:": "👎",
  ":clap:": "👏",
  ":wink:": "😉",
  ":cry:": "😢",
  ":angry:": "😠",
  ":astonished:": "😲",
  ":sweat_smile:": "😅",
  ":rolling_eyes:": "🙄",
  ":thinking:": "🤔",
  ":bored:": "😒",
  ":sunglasses:": "😎",
  ":flushed:": "😳",
  ":scream:": "😱",
  ":kiss:": "😘",
  ":tongue:": "😛",
  ":hushed:": "😯",
  ":grin:": "😁",
  ":star_struck:": "🤩",
  ":shushing_face:": "🤫",
  ":brain:": "🧠",
  ":muscle:": "💪",
  ":wave:": "👋",
  ":pray:": "🙏",
  ":unicorn:": "🦄",
  ":cherry_blossom:": "🌸",
  ":fire:": "🔥",
  ":joycat:": "😹",
};

let messageCounter = 0;
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function sendGlobalMsg() {
  var inputField = document.getElementById("global-message");
  var message = inputField.value.trim();
  var mentions = null; // Initialize mentions as null

  // Clear the input field right away
  inputField.value = "";

  // Check if the input starts with the command to set username
  if (message.startsWith("/set_username")) {
    const args = message.split(" ");
    if (args.length === 3) {
      const username = args[1];
      const secretPhrase = args[2];

      // Store the username and passphrase in localStorage
      localStorage.setItem("username", username);
      localStorage.setItem("secretPhrase", secretPhrase);

      // Emit an event to set the username and tripcode
      socket.emit("set username with tripcode", {
        username: username,
        secretPhrase: secretPhrase,
      });
    } else {
      console.error("Usage: /set_username <username> <passphrase>");
      // Implement user feedback in the UI
    }
  } else {
    // Check if the message starts with "@" and includes a mention
    if (message.startsWith("@")) {
      // Extract the mentioned username using regex
      // This matches a word after '@' until a space, end of line, or a hashtag
      var mentionMatch = message.match(/@([\w~]+)(?=\s|$|#)/);
      if (mentionMatch) {
        mentions = mentionMatch[1]; // Grab the username without the '@'
      }
    }

    // Prepare the message data, including the tripcode and mentions if available
    const messageData = {
      msg: message,
      tripcode: inputField.dataset.tripcode || "", // Include the tripcode if it's available
      mentions: mentions, // Include the mentions if a username was matched
    };

    // Emit the message as a global chat message with additional data
    socket.emit("global chat message", messageData);
  }
}

// When sending a message
function sendMessage(input, type) {
  const message = input.value.trim();

  if (type === "msg") {
    if (input.value == "") {
      return;
    }
    const uniqueId = generateUniqueId();
    console.log(`Sending message: ${message} with ID: ${uniqueId}`);
    socket.emit("chat message", { text: message, id: uniqueId });
    appendMessage(message, "sent", uniqueId);
  } else if (type === "cmd") {
    // Handle command messages
    const command = commandSelector.value;
    const fullCommand = command + " " + message;

    if (fullCommand.startsWith("/yt ")) {
      const ytLink = fullCommand.substring(4).trim();
      if (ytLink) {
        console.log("emitting youtube command");
        socket.emit("youtube_command", { link: ytLink });
      }
    } else if (fullCommand.startsWith("/sc ")) {
      const scLink = fullCommand.substring(4).trim();
      if (scLink) {
        console.log("emitting soundcloud command");
        socket.emit("soundcloud_command", { link: scLink });
      }
    }
  }
  input.value = "";
}

function appendMessage(text, type, id) {
  console.log(`Appending message: ${text} with ID: ${id} as ${type}`); // Debug log
  const messagesContainer = document.getElementById("messages"); // Ensure this is correct
  if (!messagesContainer) {
    console.error("messagesContainer not found"); // Error log if container not found
    return;
  }
  const messageElement = document.createElement("div");
  messageElement.innerText = text;
  messageElement.id = id;
  messageElement.classList.add("message", `${type}-message`);
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

let myUsername; // Variable to store the user's username

function appendGlobalMsg(data, id) {
  const messagesContainer = document.getElementById("global-messages");
  if (!messagesContainer) {
    console.error("messagesContainer not found");
    return;
  }

  if (data.msg !== "") {
    var messageDiv = document.createElement("div");
    var nameSpan = document.createElement("span");
    var tripcodeSpan = document.createElement("span");
    var messageContentSpan = document.createElement("span");

    messageDiv.id = id;
    messageDiv.className = "global-msg";

    // Split the name and tripcode
    console.log(data);
    let [username, tripcode] = data.name.split("#");

    nameSpan.textContent = username;
    nameSpan.className = "name-span"; // Add this class for styling
    nameSpan.style.color = data.color;
    nameSpan.style.fontWeight = "bold";

    tripcodeSpan.textContent = tripcode ? "#" + tripcode : "";
    tripcodeSpan.className = "tripcode"; // Use this class for styling and hover effect

    messageContentSpan.textContent = ": " + data.msg;
    messageContentSpan.className = "message-content";

    // Check if the message mentions the user's name
    if (data.mentions + "#" + data.tripcode == myUsername) {
      messageDiv.classList.add("highlighted"); // Highlight the message
      // Assuming "ding-sound" is an audio element ID that you want to play
      var dingSound = document.getElementById("ding-sound");
      if (dingSound) {
        dingSound.play(); // Play the ding sound
      }
    }

    // Assemble the message
    nameSpan.appendChild(tripcodeSpan); // Append tripcodeSpan inside nameSpan
    messageDiv.appendChild(nameSpan);
    messageDiv.appendChild(messageContentSpan);

    // Append the new message at the end of the container
    messagesContainer.appendChild(messageDiv);

    // Scroll to the bottom of the container
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add event listener for clicking the username
    nameSpan.addEventListener("click", function () {
      // Input the username into the global-message input field
      var inputField = document.getElementById("global-message");
      inputField.value = "@" + username + " "; // Add a space after the username for convenience
      inputField.dataset.tripcode = tripcode;
      inputField.focus(); // Bring focus to the input field
    });
  }
}

socket.on("typing", (data) => {
  const typingIndicator = document.getElementById("typingIndicator");
  if (data.typing) {
    typingIndicator.style.display = "block"; // Show typing indicator
  } else {
    typingIndicator.style.display = "none"; // Hide typing indicator
  }
});
// When receiving a message
socket.on("chat message", (data) => {
  if (!document.getElementById(data.id)) {
    // If the message is not already displayed
    appendMessage(data.text, "received", data.id);
    document.getElementById("ding-sound2").play();
  }
});

function attachTrack(track, container) {
  // // Check if the track is a Twilio RemoteTrack and extract the underlying MediaStreamTrack
  // let mediaStreamTrack = track.mediaStreamTrack
  //   ? track.mediaStreamTrack
  //   : track;
  // // Check if we have a valid MediaStreamTrack before proceeding
  // if (mediaStreamTrack instanceof MediaStreamTrack) {
  //   let element = document.createElement(track.kind); // 'video' or 'audio'
  //   element.autoplay = true;
  //   element.srcObject = new MediaStream([mediaStreamTrack]);
  //   container.appendChild(element);
  // } else {
  //   console.error(
  //     "The mediaStreamTrack is not an instance of MediaStreamTrack:",
  //     mediaStreamTrack
  //   );
  // }
}

function detachTrack(track) {
  const elements = track.detach();
  elements.forEach((element) => element.remove());
}

// Start searching for a partner
startSearchingButton.addEventListener("click", () => {
  if (messagesContainer) {
    messagesContainer.innerHTML = "";
  }
  searchingMessage.style.display = "block";
  connectedMessage.style.display = "none";
  defaultMessage.style.display = "none";
  socket.emit("join");
  leaveRoom();
});

// Receiving a token from the server, store it and wait for the 'matched' event
let token;
socket.on("token", (data) => {
  token = data.token;
});

// Receiving the room SID and connecting to the Twilio room
socket.on("matched", (data) => {
  console.log(`Joining room with SID: ${data.roomSid}`);
  Twilio.Video.connect(token, {
    name: data.roomSid,
    video: false,
    audio: false,
  })
    .then((connectedRoom) => {
      room = connectedRoom;
      room.participants.forEach(participantDisconnected);
      room.on("participantConnected", participantConnected);
      room.on("participantDisconnected", participantDisconnected);
      connectedMessage.style.display = "block";
      disconnectedMessage.style.display = "none";
      searchingMessage.style.display = "none";
    })
    .catch((err) => console.error("Error connecting to Twilio:", err));
});

// Existing setupLocalVideo and other functions
function setupLocalVideo() {
  console.log("nice");
  // navigator.mediaDevices
  //   .getUserMedia({ video: true, audio: true })
  //   .then((stream) => {
  //     localStream = stream;
  //     const videoElement = document.createElement("video");
  //     videoElement.srcObject = stream;
  //     videoElement.autoplay = true;
  //     videoElement.muted = true; // Mute the local video to prevent feedback
  //     localVideoDiv.appendChild(videoElement);
  //   })
  //   .catch((err) => {
  //     console.error("Error accessing local media:", err);
  //     // Optionally inform the user that their video cannot be accessed
  //   });
}

function participantConnected(participant) {
  console.log(`Participant connected: ${participant.identity}`);
  // const div = document.createElement("div");
  // div.id = participant.sid;
  // remoteVideoDiv.appendChild(div);

  // participant.tracks.forEach((publication) => {
  //   if (publication.isSubscribed) {
  //     const track = publication.track;
  //     attachTrack(track, div);
  //     console.log(`Subscribed to track: ${track.kind}`);
  //   }
  // });

  // participant.on("trackSubscribed", (track) => {
  //   attachTrack(track, div);
  //   console.log(`Track subscribed: ${track.kind}`);
  // });

  // participant.on("trackUnsubscribed", (track) => {
  //   detachTrack(track);
  //   console.log(`Track unsubscribed: ${track.kind}`);
  // });
}

function participantDisconnected(participant) {
  console.log(`Participant disconnected: ${participant.identity}`);
  // const participantDiv = document.getElementById(participant.sid);
  // if (participantDiv) {
  //   participantDiv.remove();
  // }

  // // Do not stop the local video feed here, as this is for remote participants
}

let canvas = document.getElementById("soundcloud-visualization");
let ctx = canvas.getContext("2d");

// Assuming global variables for the audio context and analyser
let audioContext;
let analyser;
let dataArray;
let bufferLength;

// Canvas context for drawing the visualization
let canvasCtx;

function playSoundCloudTrack(link) {
  // Initialize Audio Context
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Create an audio element
  var audio = new Audio();
  audio.src = link;
  audio.controls = true;
  audio.autoplay = true;

  // Player container
  var playerContainer = document.getElementById("soundcloud-player-container");
  playerContainer.innerHTML = "";

  // Create or get a canvas element
  let canvas = document.createElement("canvas");
  canvas.id = "soundcloud-visualization";
  canvas.width = playerContainer.offsetWidth; // Set the width to match the container
  canvas.height = 200; // Height of the canvas for visualization

  // Append elements to the container
  playerContainer.appendChild(audio);
  playerContainer.appendChild(canvas);

  // Get the context of the canvas for drawing
  canvasCtx = canvas.getContext("2d");

  // Create an analyser node
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  // Connect the audio element to the analyser
  const source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  // Setup for visualization
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  // Start the visualization
  requestAnimationFrame(renderFrame);
}

function renderFrame() {
  requestAnimationFrame(renderFrame);

  analyser.getByteFrequencyData(dataArray);

  // Clear the canvas
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  // Example visualization: Draw bars for each frequency
  let barWidth = (canvas.width / bufferLength) * 2.5;
  let barHeight;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i];
    canvasCtx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
    canvasCtx.fillRect(
      x,
      canvas.height - barHeight / 2,
      barWidth,
      barHeight / 2
    );
    x += barWidth + 1;
  }
}

function trackUnsubscribed(track) {
  track.detach().forEach((element) => element.remove());
}

// Handle partner disconnection
socket.on("partner-disconnected", () => {
  if (messagesContainer) {
    messagesContainer.innerHTML = "";
  }
  disconnectedMessage.style.display = "block";
  connectedMessage.style.display = "none";
  leaveRoom();
  searchingMessage.style.display = "none";
  startSearchingButton.disabled = false;
});

// Handle window unload event
window.addEventListener("beforeunload", leaveRoom);

function leaveRoom() {
  if (room) {
    room.disconnect();
    // Do not stop local tracks here if you want to keep the local feed alive.
    // Only stop them if you are sure you want to close the local video feed.
    room.participants.forEach((participant) => {
      const participantDiv = document.getElementById(participant.sid);
      if (participantDiv) {
        participantDiv.remove();
      }
    });
    // remoteVideoDiv.innerHTML = "";
    room = null; // Clear the room reference
    startSearchingButton.disabled = false;
    searchingMessage.style.display = "block";
    connectedMessage.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  let youtubePlayer;
  const messageInput = document.getElementById("messageInput");
  const commandInput = document.getElementById("commandInput");
  const storedUsername = localStorage.getItem("username");
  const storedSecretPhrase = localStorage.getItem("secretPhrase");
  myUsername = storedUsername;

  socket.on("users online", function (count) {
    // Update the UI element that shows the number of users online
    // Assuming you have an element with the ID 'online-users'
    const onlineUsersElement = document.getElementById("online-users");
    onlineUsersElement.innerHTML = `<span class="green-text">${count}</span> online`;
  });

  if (storedUsername && storedSecretPhrase) {
    // Emit the event to set the username and tripcode
    socket.emit("set username with tripcode", {
      username: storedUsername,
      secretPhrase: storedSecretPhrase,
    });
    myUsername = storedUsername;
  } else {
    socket.emit("set username", {
      username: myUsername,
    });
  }

  socket.on("set username", function (username) {
    myUsername = username;
  });

  socket.on("username updated", function (username) {
    myUsername = username;
  });

  socket.on("global chat message", function (data) {
    global_msg_id = generateUniqueId();
    appendGlobalMsg(data, global_msg_id);
  });

  document
    .getElementById("global-message")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        sendGlobalMsg(); // Make sure this function sends the message and clears the input
      }
    });

  socket.on("yt_command", (data) => {
    // Log the properties of 'data.link' to find the actual URL
    console.log("Received yt_command data:", data.link);
    // Once you find the correct property that contains the URL, use it here
    // Assuming the actual URL is in 'data.link.url', for example
    if (data) {
      playYouTubeVideoInPiP(data.link);
    } else {
      console.error("YouTube link not found in data:", data);
    }
  });

  socket.on("sc_command", (data) => {
    // Log the properties of 'data' to find the actual URL
    console.log("Received sc_command data:", data.link);
    // Here you would handle the SoundCloud link, for example, playing it in an embedded player
    if (data) {
      playSoundCloudTrack(data.link);
    } else {
      console.error("SoundCloud link not found in data:", data);
    }
  });
  window.onYouTubeIframeAPIReady = function () {
    createPlayer(window.videoIdToPlay); // Assume videoIdToPlay is a global variable set when '/yt' command is issued
  };
  const typingIndicator = document.getElementById("typingIndicator");
  typingIndicator.style.display = "none";

  // Emit an event when the user starts typing
  messageInput.addEventListener("input", () => {
    socket.emit("typing", { typing: true });
  });

  // Use a timer to detect when the user has stopped typing
  let typingTimer;
  messageInput.addEventListener("keyup", () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.emit("typing", { typing: false });
    }, 500); // Adjust the delay as needed
  });

  function toggleDarkMode() {
    const body = document.body;
    const toggleButton = document.getElementById("dark-mode-toggle");
    const chatName = document.getElementById("header"); // This is the element that contains the name of the chat.

    body.classList.toggle("dark-mode");
    toggleButton.textContent = body.classList.contains("dark-mode")
      ? "🐸"
      : "🐱";

    // Update the chat name based on the dark mode state.
    chatName.textContent = body.classList.contains("dark-mode")
      ? "bing bong chat"
      : "bingus chat";
  }

  // Check if dark mode preference is stored in localStorage
  const prefersDarkMode = localStorage.getItem("darkMode") === "enabled";
  if (prefersDarkMode) {
    toggleDarkMode();
  }

  // If there is a dark mode toggle button, set up the event listener
  const darkModeToggleButton = document.getElementById("dark-mode-toggle");
  if (darkModeToggleButton) {
    darkModeToggleButton.addEventListener("click", toggleDarkMode);
  }

  // Bouncing letters animation for the waiting message
  const waitingMessage = document.getElementById("searching-message");
  if (waitingMessage) {
    let messageText = waitingMessage.textContent.trim();
    waitingMessage.textContent = "";
    let delay = 0;

    for (let i = 0; i < messageText.length; i++) {
      const letter = messageText[i];
      const letterSpan = document.createElement("span");
      letterSpan.innerHTML = letter === " " ? "&nbsp;" : letter;
      letterSpan.classList.add("bounce");
      letterSpan.style.animationDelay = `${delay}s`;
      delay += 0.04; // Reduced delay increment to make the animation quicker
      waitingMessage.appendChild(letterSpan);
      // WAIT 2 SECONDS HERE BEFORE NEXT LOOP
    }
  }

  // Send button functionality
  const sendButton = document.getElementById("sendButton");
  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  } else {
    console.error("Send button not found!");
  }

  function playYouTubeVideoInPiP(ytLink) {
    console.log("Attempting to play YouTube video in PiP mode...");

    // Show the player container
    const playerContainer = document.getElementById("player-container");
    if (playerContainer) {
      playerContainer.style.display = "block"; // Adjust as per your layout
    }

    // Validate the link
    if (typeof ytLink !== "string") {
      console.error("ytLink is not a string:", ytLink);
      return;
    }

    // Extract video ID from the link
    const videoId = extractYouTubeVideoID(ytLink);
    if (!videoId) {
      console.error("Invalid YouTube link:", ytLink);
      return;
    }

    console.log(`Extracted video ID: ${videoId}`);

    // Load video in existing player if it exists, else create a new iframe and player
    if (youtubePlayer && youtubePlayer.loadVideoById) {
      youtubePlayer.loadVideoById(videoId);
    } else {
      createYouTubeIframe(videoId);
    }
  }

  function extractYouTubeVideoID(ytLink) {
    console.log("Extracting YouTube video ID...");
    const regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = ytLink.match(regex);
    if (match && match[1]) {
      console.log(`Found YouTube video ID: ${match[1]}`);
      return match[1];
    } else {
      console.error("No YouTube video ID found in link:", ytLink);
      return null;
    }
  }

  function createYouTubeIframe(videoId) {
    console.log("Creating YouTube IFrame...");
    if (window.YT && window.YT.Player) {
      console.log("YouTube IFrame Player API is already loaded.");
      createPlayer(videoId);
    } else {
      console.log("Loading YouTube IFrame Player API...");
      var tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = function () {
        console.log("YouTube IFrame Player API is ready.");
        createPlayer(videoId);
      };
    }
  }

  function createPlayer(videoId) {
    console.log("Creating YouTube player...");
    youtubePlayer = new YT.Player("player", {
      height: "195",
      width: "320",
      videoId: videoId,
      playerVars: { autoplay: 1, controls: 1 },
      events: {
        onReady: onPlayerReady,
        onError: onPlayerError,
        onStateChange: onPlayerStateChange,
      },
    });
  }

  lastAction = null;

  function onPlayerStateChange(event) {
    const currentTime = youtubePlayer.getCurrentTime();

    if (event.data === YT.PlayerState.ENDED) {
      console.log("Video has ended.");
      removeIframe();
    } else if (event.data === YT.PlayerState.PLAYING && lastAction !== "play") {
      lastAction = "play";
      socket.emit("videoAction", { action: "play", time: currentTime });
    } else if (event.data === YT.PlayerState.PAUSED && lastAction !== "pause") {
      lastAction = "pause";
      socket.emit("videoAction", { action: "pause", time: currentTime });
    }
    // Removed the 'close' condition from here
  }

  socket.on("videoAction", (data) => {
    lastAction = data.action;
    if (data.action === "play") {
      youtubePlayer.seekTo(data.time);
      youtubePlayer.playVideo();
    } else if (data.action === "pause") {
      youtubePlayer.pauseVideo();
      youtubePlayer.seekTo(data.time);
    } else if (data.action === "close") {
      closeVideo(); // Call the function to close the video
    }
  });

  function removeIframe() {
    console.log("Hiding YouTube player container...");
    const playerContainer = document.getElementById("player-container");
    if (playerContainer) {
      playerContainer.style.display = "none";
      console.log("YouTube player container hidden.");
    } else {
      console.error("No player container found to hide.");
    }
  }

  function closeVideo(userInitiated = false) {
    if (youtubePlayer && youtubePlayer.stopVideo) {
      youtubePlayer.stopVideo(); // Stop the video
    }

    const playerContainer = document.getElementById("player-container");
    if (playerContainer) {
      playerContainer.style.display = "none";
    }

    // Emit the close event only if it's user-initiated
    if (userInitiated) {
      socket.emit("videoAction", { action: "close" });
    }
  }

  document.getElementById("close-video").addEventListener("click", function () {
    closeVideo(true); // User-initiated close
  });

  function makeDraggable(draggableElement, dragHandle) {
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;

    // Call this function on mousedown or touchstart on the overlay
    dragHandle.onmousedown = dragMouseDown;
    dragHandle.ontouchstart = dragTouchStart; // Added for touch support

    function dragMouseDown(e) {
      e.preventDefault(); // Prevent text selection
      // Get the initial mouse cursor positions
      pos3 = e.clientX;
      pos4 = e.clientY;
      // Call functions when the mouse cursor moves or is released
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function dragTouchStart(e) {
      e.preventDefault(); // Prevent default touch behavior
      // Get the initial touch positions
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
      // Call functions when the touch moves or ends
      document.ontouchend = closeDragElement;
      document.ontouchmove = elementTouchMove;
    }

    function elementDrag(e) {
      e.preventDefault();
      // Calculate the new cursor positions
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // Set the element's new position
      draggableElement.style.top = draggableElement.offsetTop - pos2 + "px";
      draggableElement.style.left = draggableElement.offsetLeft - pos1 + "px";
    }

    function elementTouchMove(e) {
      e.preventDefault();
      // Calculate the new touch positions
      pos1 = pos3 - e.touches[0].clientX;
      pos2 = pos4 - e.touches[0].clientY;
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
      // Set the element's new position
      draggableElement.style.top = draggableElement.offsetTop - pos2 + "px";
      draggableElement.style.left = draggableElement.offsetLeft - pos1 + "px";
    }

    function closeDragElement() {
      // Stop moving the element
      document.onmouseup = null;
      document.onmousemove = null;
      document.ontouchend = null;
      document.ontouchmove = null;
    }
  }

  function onPlayerReady(event) {
    console.log("YouTube player is ready.");
    const dragHandleIcon = document.querySelector("#drag-handle i");
    const resizeHandlePlayer = document.getElementById("resize-handle-player");
    if (dragHandleIcon) {
      dragHandleIcon.style.display = "block";
    }
    // Get the draggable container and the drag handle
    const playerContainer = document.getElementById("player-container");
    if (playerContainer) {
      playerContainer.style.display = "block"; // or "flex" if that's your layout
    }
    const dragHandle = document.getElementById("drag-handle");

    if (playerContainer && dragHandle) {
      makeDraggable(playerContainer, dragHandle);
      makeResizable(playerContainer, resizeHandlePlayer);
    } else {
      console.error("Draggable elements not found in the DOM");
    }
  }

  function onPlayerError(event) {
    console.error("YouTube player error:", event.data);
  }

  // Execute a function when the user releases a key on the keyboard
  messageInput.addEventListener("keyup", function (event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.key === "Enter") {
      // Cancel the default action, if needed
      event.preventDefault();
      // Call the sendMessage function
      console.log(messageInput);
      sendMessage(messageInput, "msg");
    }
  });

  // Execute a function when the user releases a key on the keyboard
  commandInput.addEventListener("keyup", function (event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.key === "Enter") {
      // Cancel the default action, if needed
      event.preventDefault();
      // Call the sendMessage function
      sendMessage(commandInput, "cmd");
    }
  });

  const chatBox = document.getElementById("chat-box");
  const resizeHandle = document.getElementById("resize-handle");

  makeResizable(chatBox, resizeHandle);

  const chatBoxDraggable = document.getElementById("chat-box-draggable");
  const chatDragHandleIcon = document.querySelector("#chat-drag-handle i");
  makeDraggable(chatBoxDraggable, chatDragHandleIcon); // Assuming makeDraggable function is defined elsewhere
});

function makeResizable(element, handle, options = {}) {
  const minHeight = options.minHeight || 100; // Default minimum height
  const minWidth = options.minWidth || 100; // Default minimum width
  let startY, startHeight, startX, startWidth;

  handle.addEventListener("mousedown", function (e) {
    e.preventDefault(); // Prevent the default mouse down action
    handle.style.cursor = "grabbing";
    startY = e.clientY;
    startX = e.clientX;
    startHeight = parseInt(
      document.defaultView.getComputedStyle(element).height,
      10
    );
    startWidth = parseInt(
      document.defaultView.getComputedStyle(element).width,
      10
    );

    // Disable text selection during resize
    document.body.classList.add("no-select");

    document.documentElement.addEventListener("mousemove", mouseMoveHandler);
    document.documentElement.addEventListener("mouseup", mouseUpHandler);
  });

  function mouseMoveHandler(e) {
    e.preventDefault(); // Prevent any default behavior of the browser while dragging

    // Calculate the new cursor positions and dimensions
    const heightDifference = startY - e.clientY;
    const widthDifference = startX - e.clientX;
    const newHeight = startHeight + heightDifference;
    const newWidth = startWidth - widthDifference;

    // Check and update height if within allowed range
    if (newHeight >= minHeight) {
      element.style.height = newHeight + "px";
      element.style.top = element.offsetTop - heightDifference + "px";
      startY = e.clientY; // Update startY for the next iteration
      startHeight = newHeight; // Update startHeight for next iteration
    }

    // Check and update width if within allowed range
    if (newWidth >= minWidth) {
      element.style.width = newWidth + "px";
      startX = e.clientX; // Update startX for the next iteration
      startWidth = newWidth; // Update startWidth for next iteration
    }
  }

  function mouseUpHandler() {
    // Re-enable text selection after resizing
    document.body.classList.remove("no-select");
    handle.style.cursor = "";

    document.documentElement.removeEventListener("mousemove", mouseMoveHandler);
    document.documentElement.removeEventListener("mouseup", mouseUpHandler);
  }
}
