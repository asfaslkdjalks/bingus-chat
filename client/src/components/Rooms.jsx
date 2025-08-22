import React, { useState, useEffect, useRef } from 'react';

const Rooms = ({ 
  socket, 
  rooms, 
  currentRoomData, 
  roomMessages, 
  roomInput, 
  setRoomInput,
  isRoomCreator,
  createRoom,
  joinRoom,
  leaveRoom,
  sendRoomMessage,
  playVideoToRoom,
  refreshRoomList,
  myUsername
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const roomMessagesEndRef = useRef(null);

  useEffect(() => {
    roomMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages]);

  const handleCreateRoom = () => {
    if (newRoomName.trim()) {
      createRoom(newRoomName);
      setNewRoomName('');
      setShowCreateModal(false);
    }
  };

  const handlePlayVideo = () => {
    if (videoUrl.trim() && isRoomCreator) {
      playVideoToRoom(videoUrl);
      setVideoUrl('');
    }
  };

  // If in a room, show room view
  if (currentRoomData) {
    return (
      <div className="rooms-container">
        <div className="room-view">
          <div className="room-header">
            <h2>{currentRoomData.name}</h2>
            <div className="room-info">
              <span className="room-users">
                👥 {currentRoomData.users?.length || 1} users
              </span>
              {isRoomCreator && <span className="creator-badge">👑 Creator</span>}
            </div>
            <button className="leave-room-btn" onClick={leaveRoom}>
              Leave Room
            </button>
          </div>

          <div className="room-content">
            <div className="room-chat-section">
              <div className="room-messages">
                {roomMessages.map((msg, index) => (
                  <div key={index} className={`room-msg ${msg.type === 'system' ? 'system-msg' : ''}`}>
                    {msg.type === 'system' ? (
                      <span className="system-text">{msg.msg}</span>
                    ) : (
                      <>
                        <span className="room-msg-name" style={{ color: msg.color }}>
                          {msg.name}
                        </span>
                        <span className="room-msg-content">: {msg.msg}</span>
                      </>
                    )}
                  </div>
                ))}
                <div ref={roomMessagesEndRef} />
              </div>
              
              <div className="room-input-container">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      sendRoomMessage();
                    }
                  }}
                  className="room-input"
                />
                <button onClick={sendRoomMessage} className="room-send-btn">
                  Send
                </button>
              </div>
            </div>

            <div className="room-controls">
              {isRoomCreator ? (
                <div className="creator-controls">
                  <h3>Room Controls</h3>
                  <div className="video-control">
                    <input
                      type="text"
                      placeholder="Paste YouTube URL..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="video-input"
                    />
                    <button onClick={handlePlayVideo} className="play-video-btn">
                      🎬 Play to Room
                    </button>
                  </div>
                </div>
              ) : (
                <div className="viewer-info">
                  <p>Only the room creator can control videos</p>
                </div>
              )}

              <div className="room-users-list">
                <h4>Users in Room:</h4>
                <ul>
                  {currentRoomData.users?.map((user, index) => (
                    <li key={index}>
                      {user} {currentRoomData.creator === user && '👑'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Room list view
  return (
    <div className="rooms-container">
      <div className="rooms-header">
        <h2>Public Rooms</h2>
        <div className="rooms-actions">
          <button onClick={refreshRoomList} className="refresh-btn">
            🔄 Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="create-room-btn">
            ➕ Create Room
          </button>
        </div>
      </div>

      <div className="rooms-list">
        {rooms.length === 0 ? (
          <div className="no-rooms">
            <p>No rooms available</p>
            <p>Create one to get started!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="room-card">
              <div className="room-card-header">
                <h3>{room.name}</h3>
                <span className="room-user-count">👥 {room.userCount || 0}</span>
              </div>
              <div className="room-card-info">
                <span className="room-creator">Created by: {room.creator}</span>
              </div>
              <button 
                onClick={() => joinRoom(room.id)} 
                className="join-room-btn"
              >
                Join Room
              </button>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Room</h3>
            <input
              type="text"
              placeholder="Room name..."
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateRoom();
                }
              }}
              className="modal-input"
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => setShowCreateModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleCreateRoom} className="confirm-btn">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;