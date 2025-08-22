import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

// Import components
import YouTubePlayer from './components/YouTubePlayer';
import Rooms from './components/Rooms';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : '');

function App() {
  const [socket, setSocket] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'enabled';
  });
  const [currentView, setCurrentView] = useState('chat'); // 'chat' or 'rooms'
  
  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('default'); // default, searching, connected, disconnected
  const [currentRoom, setCurrentRoom] = useState(null);
  
  // Room states
  const [rooms, setRooms] = useState([]);
  const [currentRoomData, setCurrentRoomData] = useState(null);
  const [roomMessages, setRoomMessages] = useState([]);
  const [roomInput, setRoomInput] = useState('');
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  
  // User states
  const [username, setUsername] = useState(() => localStorage.getItem('username') || null);
  const [secretPhrase, setSecretPhrase] = useState(() => localStorage.getItem('secretPhrase') || '');
  const [myUsername, setMyUsername] = useState(null);
  
  // Chat states
  const [messages, setMessages] = useState([]);
  const [globalMessages, setGlobalMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [globalInput, setGlobalInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [selectedCommand, setSelectedCommand] = useState('/yt');
  
  // YouTube states
  const [youtubeLink, setYoutubeLink] = useState(null);
  const [showYouTube, setShowYouTube] = useState(false);
  const [isRoomVideo, setIsRoomVideo] = useState(false);
  
  // Refs
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const globalMessagesEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      
      // Set username on connection
      if (username && secretPhrase) {
        newSocket.emit('set username with tripcode', { username, secretPhrase });
        setMyUsername(username);
      } else {
        newSocket.emit('set username', { username });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('users online', (count) => {
      setOnlineUsers(count);
    });

    socket.on('set username', (name) => {
      setMyUsername(name);
    });

    socket.on('username updated', (name) => {
      setMyUsername(name);
    });

    socket.on('matched', (data) => {
      setCurrentRoom(data.roomSid);
      setConnectionStatus('connected');
      setMessages([]);
    });

    socket.on('partner-disconnected', () => {
      setConnectionStatus('disconnected');
      setCurrentRoom(null);
      setMessages([]);
    });

    socket.on('chat message', (data) => {
      if (!document.getElementById(data.id)) {
        setMessages(prev => [...prev, { ...data, type: 'received' }]);
      }
    });

    socket.on('global chat message', (data) => {
      console.log('Received global message:', data);
      setGlobalMessages(prev => [...prev, data]);
    });

    socket.on('typing', (data) => {
      setIsTyping(data.typing);
    });

    socket.on('yt_command', (data) => {
      console.log('Received YouTube command:', data);
      setYoutubeLink(data.link);
      setShowYouTube(true);
      setIsRoomVideo(false);
    });

    // Room events
    socket.on('room_list', (roomList) => {
      setRooms(roomList);
    });

    socket.on('room_created', (data) => {
      console.log('Room created:', data);
      setCurrentRoomData(data);
      setIsRoomCreator(true);
      setRoomMessages([]);
    });

    socket.on('room_joined', (data) => {
      console.log('Joined room:', data);
      setCurrentRoomData(data);
      setIsRoomCreator(false);
      setRoomMessages([]);
    });

    socket.on('room_message', (data) => {
      setRoomMessages(prev => [...prev, data]);
    });

    socket.on('room_user_joined', (data) => {
      setRoomMessages(prev => [...prev, { 
        type: 'system', 
        msg: `${data.username} joined the room` 
      }]);
      if (currentRoomData) {
        setCurrentRoomData(prev => ({
          ...prev,
          users: [...(prev?.users || []), data.username]
        }));
      }
    });

    socket.on('room_user_left', (data) => {
      setRoomMessages(prev => [...prev, { 
        type: 'system', 
        msg: `${data.username} left the room` 
      }]);
      if (currentRoomData) {
        setCurrentRoomData(prev => ({
          ...prev,
          users: prev?.users?.filter(u => u !== data.username) || []
        }));
      }
    });

    socket.on('room_closed', () => {
      setCurrentRoomData(null);
      setIsRoomCreator(false);
      setRoomMessages([]);
      alert('The room has been closed');
    });

    socket.on('room_video', (data) => {
      console.log('Room video command received:', data);
      setYoutubeLink(data.link);
      setShowYouTube(true);
      setIsRoomVideo(true);
    });

    return () => {
      socket.off('users online');
      socket.off('set username');
      socket.off('username updated');
      socket.off('matched');
      socket.off('partner-disconnected');
      socket.off('chat message');
      socket.off('global chat message');
      socket.off('typing');
      socket.off('yt_command');
      socket.off('room_list');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_message');
      socket.off('room_user_joined');
      socket.off('room_user_left');
      socket.off('room_closed');
      socket.off('room_video');
    };
  }, [socket, currentRoomData]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    globalMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [globalMessages]);

  // Dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode ? 'enabled' : 'disabled');
  };

  // Find partner
  const handleFindPartner = () => {
    if (socket) {
      setMessages([]);
      setConnectionStatus('searching');
      socket.emit('join');
    }
  };

  // Send message
  const handleSendMessage = () => {
    if (!messageInput.trim() || !socket || !currentRoom) return;
    
    const messageData = {
      text: messageInput,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
    
    socket.emit('chat message', messageData);
    setMessages(prev => [...prev, { ...messageData, type: 'sent' }]);
    setMessageInput('');
  };

  // Send global message
  const handleSendGlobalMessage = () => {
    if (!globalInput.trim() || !socket) return;

    // Check for username command
    if (globalInput.startsWith('/set_username')) {
      const args = globalInput.split(' ');
      if (args.length === 3) {
        const newUsername = args[1];
        const newSecret = args[2];
        
        localStorage.setItem('username', newUsername);
        localStorage.setItem('secretPhrase', newSecret);
        
        socket.emit('set username with tripcode', {
          username: newUsername,
          secretPhrase: newSecret
        });
        
        setUsername(newUsername);
        setSecretPhrase(newSecret);
      }
      setGlobalInput('');
      return;
    }

    // Check for mentions
    let mentions = null;
    if (globalInput.startsWith('@')) {
      const mentionMatch = globalInput.match(/@([\w~]+)(?=\s|$|#)/);
      if (mentionMatch) {
        mentions = mentionMatch[1];
      }
    }

    const messageData = {
      msg: globalInput,
      tripcode: '',
      mentions: mentions
    };

    console.log('Sending global message:', messageData);
    socket.emit('global chat message', messageData);
    setGlobalInput('');
  };

  // Handle typing
  const handleTyping = () => {
    if (!socket) return;
    
    socket.emit('typing', { typing: true });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { typing: false });
    }, 500);
  };

  // Handle commands
  const handleCommand = () => {
    if (!commandInput.trim() || !socket) return;

    const fullCommand = selectedCommand + ' ' + commandInput;
    console.log('Sending command:', fullCommand);

    if (fullCommand.startsWith('/yt ')) {
      const ytLink = fullCommand.substring(4).trim();
      if (ytLink) {
        console.log('Sending YouTube link:', ytLink);
        socket.emit('youtube_command', { link: ytLink });
        setYoutubeLink(ytLink);
        setShowYouTube(true);
        setIsRoomVideo(false);
      }
    } else if (fullCommand.startsWith('/sc ')) {
      const scLink = fullCommand.substring(4).trim();
      if (scLink) {
        socket.emit('soundcloud_command', { link: scLink });
      }
    }
    
    setCommandInput('');
  };

  // Generate unique ID
  const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Room functions
  const createRoom = (roomName) => {
    if (socket && roomName) {
      socket.emit('create_room', { name: roomName });
    }
  };

  const joinRoom = (roomId) => {
    if (socket) {
      socket.emit('join_room', { roomId });
    }
  };

  const leaveRoom = () => {
    if (socket && currentRoomData) {
      socket.emit('leave_room', { roomId: currentRoomData.id });
      setCurrentRoomData(null);
      setIsRoomCreator(false);
      setRoomMessages([]);
    }
  };

  const sendRoomMessage = () => {
    if (!roomInput.trim() || !socket || !currentRoomData) return;
    
    socket.emit('room_message', { 
      roomId: currentRoomData.id, 
      msg: roomInput 
    });
    setRoomInput('');
  };

  const playVideoToRoom = (videoUrl) => {
    if (socket && currentRoomData && isRoomCreator) {
      console.log('Playing video to room:', videoUrl);
      socket.emit('room_video', { 
        roomId: currentRoomData.id, 
        link: videoUrl 
      });
      // Also show it locally for the creator
      setYoutubeLink(videoUrl);
      setShowYouTube(true);
      setIsRoomVideo(true);
    }
  };

  const refreshRoomList = () => {
    if (socket) {
      socket.emit('get_rooms');
    }
  };

  // Render status message
  const renderStatusMessage = () => {
    switch (connectionStatus) {
      case 'searching':
        return (
          <div className="searching-message">
            {'Searching for someone to chat with...'.split('').map((char, i) => (
              <span key={i} className="bounce" style={{ animationDelay: `${i * 0.04}s` }}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </div>
        );
      case 'connected':
        return <div className="connected-message">Connected</div>;
      case 'disconnected':
        return <div className="disconnected-message">Disconnected</div>;
      default:
        return <div className="default-message">Click the find button to start a chat</div>;
    }
  };

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <header className="header">
        <h1 id="header">{darkMode ? 'bing bong chat' : 'bingus chat (beta)'}</h1>
        <div className="header-controls">
          <nav className="nav-tabs">
            <button 
              className={`nav-tab ${currentView === 'chat' ? 'active' : ''}`}
              onClick={() => setCurrentView('chat')}
            >
              Chat
            </button>
            <button 
              className={`nav-tab ${currentView === 'rooms' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('rooms');
                refreshRoomList();
              }}
            >
              Rooms
            </button>
          </nav>
          <button id="dark-mode-toggle" onClick={toggleDarkMode}>
            {darkMode ? '🐸' : '🐱'}
          </button>
        </div>
      </header>

      {currentView === 'chat' ? (
        <main className="main-container">
          <section id="chat-interface">
            <div id="chat-container">
              {connectionStatus === 'connected' && currentRoom && (
                <div id="cmd-bar" className="row">
                  <div className="select-wrapper">
                    <select 
                      id="commandSelector"
                      value={selectedCommand}
                      onChange={(e) => setSelectedCommand(e.target.value)}
                    >
                      <option value="/yt">yt</option>
                      <option value="/sc">sc</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    id="commandInput"
                    placeholder="paste a link..."
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCommand();
                      }
                    }}
                  />
                </div>
              )}

              <div id="messages">
                {messages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    id={msg.id}
                    className={`message ${msg.type}-message`}
                  >
                    {msg.text}
                  </div>
                ))}
                {isTyping && (
                  <div id="typingIndicator" className="typing-indicator">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div id="status-messages">
                {renderStatusMessage()}
              </div>

              <div id="bottom-section">
                <button 
                  id="start-searching"
                  onClick={handleFindPartner}
                  disabled={connectionStatus === 'searching'}
                >
                  Find
                </button>
              </div>
            </div>

            {connectionStatus === 'connected' && (
              <div id="new-message">
                <input
                  type="text"
                  id="messageInput"
                  placeholder="type your message here..."
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                />
                <button id="sendButton" onClick={handleSendMessage}>
                  <i className="fas fa-paper-plane">→</i>
                </button>
              </div>
            )}
          </section>

          <div id="activities-container">
            <div id="chat-box-draggable">
              <div id="chat-box">
                <div id="online-users">
                  <span className="green-text">{onlineUsers}</span> online
                </div>
                <div id="global-messages">
                  {globalMessages.map((msg, index) => (
                    <div key={index} className="global-msg">
                      <span 
                        className="name-span" 
                        style={{ color: msg.color, fontWeight: 'bold' }}
                      >
                        {msg.name?.split('#')[0]}
                        {msg.name?.includes('#') && (
                          <span className="tripcode">
                            #{msg.name.split('#')[1]}
                          </span>
                        )}
                      </span>
                      <span className="message-content">: {msg.msg}</span>
                    </div>
                  ))}
                  <div ref={globalMessagesEndRef} />
                </div>
                <div className="input-container">
                  <input 
                    id="global-message" 
                    placeholder="global chat..." 
                    autoComplete="off"
                    value={globalInput}
                    onChange={(e) => setGlobalInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendGlobalMessage();
                      }
                    }}
                  />
                  <button id="emoji-button">😊</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <Rooms 
          socket={socket}
          rooms={rooms}
          currentRoomData={currentRoomData}
          roomMessages={roomMessages}
          roomInput={roomInput}
          setRoomInput={setRoomInput}
          isRoomCreator={isRoomCreator}
          createRoom={createRoom}
          joinRoom={joinRoom}
          leaveRoom={leaveRoom}
          sendRoomMessage={sendRoomMessage}
          playVideoToRoom={playVideoToRoom}
          refreshRoomList={refreshRoomList}
          myUsername={myUsername}
        />
      )}
      
      {showYouTube && youtubeLink && (
        <YouTubePlayer 
          videoUrl={youtubeLink}
          socket={socket}
          onClose={() => {
            setShowYouTube(false);
            setYoutubeLink(null);
            setIsRoomVideo(false);
          }}
          isRoomVideo={isRoomVideo}
        />
      )}
    </div>
  );
}

export default App;