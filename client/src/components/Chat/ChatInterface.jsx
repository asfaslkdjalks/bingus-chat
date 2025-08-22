import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

const ChatInterface = ({ socket, connectionStatus, onFindPartner, currentRoom }) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('chat message', (data) => {
      setMessages(prev => [...prev, { ...data, type: 'received' }]);
    });

    socket.on('typing', (data) => {
      setIsTyping(data.typing);
    });

    return () => {
      socket.off('chat message');
      socket.off('typing');
    };
  }, [socket]);

  useEffect(() => {
    if (connectionStatus === 'searching' || connectionStatus === 'disconnected') {
      setMessages([]);
    }
  }, [connectionStatus]);

  const handleSendMessage = (message) => {
    if (!socket || !currentRoom) return;
    
    const messageData = {
      text: message,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
    
    socket.emit('chat message', messageData);
    setMessages(prev => [...prev, { ...messageData, type: 'sent' }]);
  };

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

  const handleCommand = (command, value) => {
    if (command === '/yt' && socket) {
      socket.emit('youtube_command', { link: value });
    } else if (command === '/sc' && socket) {
      socket.emit('soundcloud_command', { link: value });
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-container">
        {connectionStatus === 'connected' && currentRoom && (
          <div className="command-bar">
            <select id="command-selector">
              <option value="/yt">YouTube</option>
              <option value="/sc">SoundCloud</option>
            </select>
            <input 
              type="text" 
              placeholder="Paste a link..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const select = document.getElementById('command-selector');
                  handleCommand(select.value, e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
        )}
        
        <MessageList messages={messages} isTyping={isTyping} />
        
        <div className="status-messages">
          {connectionStatus === 'default' && (
            <div>Click the find button to start a chat</div>
          )}
          {connectionStatus === 'searching' && (
            <div className="searching-message">
              Searching for someone to chat with...
            </div>
          )}
          {connectionStatus === 'connected' && (
            <div>Connected</div>
          )}
          {connectionStatus === 'disconnected' && (
            <div>Disconnected</div>
          )}
        </div>
        
        <div className="bottom-section">
          <button 
            onClick={onFindPartner}
            disabled={connectionStatus === 'searching'}
          >
            Find
          </button>
        </div>
      </div>
      
      {connectionStatus === 'connected' && (
        <ChatInput 
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
        />
      )}
    </div>
  );
};

export default ChatInterface;