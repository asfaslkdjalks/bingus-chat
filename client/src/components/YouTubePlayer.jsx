import React, { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';

const YouTubePlayer = ({ videoUrl, socket, onClose }) => {
  const [player, setPlayer] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  
  // Position and size states
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: 80 });
  const [size, setSize] = useState({ width: 320, height: 195 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 320, height: 195, x: 0, y: 0 });
  
  const containerRef = useRef(null);

  const extractVideoId = (url) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const videoId = extractVideoId(videoUrl);

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
    },
  };

  const onReady = (event) => {
    setPlayer(event.target);
  };

  const onStateChange = (event) => {
    if (!socket || !player) return;
    
    const currentTime = player.getCurrentTime();
    
    if (event.data === 1 && lastAction !== 'play') {
      setLastAction('play');
      socket.emit('videoAction', { action: 'play', time: currentTime });
    } else if (event.data === 2 && lastAction !== 'pause') {
      setLastAction('pause');
      socket.emit('videoAction', { action: 'pause', time: currentTime });
    }
  };

  // Dragging functionality
  const handleMouseDownDrag = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleMouseMoveDrag = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - size.width;
    const maxY = window.innerHeight - size.height;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUpDrag = () => {
    setIsDragging(false);
  };

  // Resizing functionality
  const handleMouseDownResize = (e) => {
    setIsResizing(true);
    setResizeStart({
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY
    });
    e.stopPropagation();
    e.preventDefault();
  };

  const handleMouseMoveResize = (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    // Maintain aspect ratio (16:9)
    const newWidth = Math.max(200, Math.min(800, resizeStart.width + deltaX));
    const newHeight = Math.round(newWidth * 9 / 16);
    
    setSize({
      width: newWidth,
      height: newHeight
    });
  };

  const handleMouseUpResize = () => {
    setIsResizing(false);
  };

  // Add global mouse event listeners for drag and resize
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMoveDrag);
      document.addEventListener('mouseup', handleMouseUpDrag);
      return () => {
        document.removeEventListener('mousemove', handleMouseMoveDrag);
        document.removeEventListener('mouseup', handleMouseUpDrag);
      };
    }
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMoveResize);
      document.addEventListener('mouseup', handleMouseUpResize);
      return () => {
        document.removeEventListener('mousemove', handleMouseMoveResize);
        document.removeEventListener('mouseup', handleMouseUpResize);
      };
    }
  }, [isResizing, resizeStart]);

  // Socket event handling
  useEffect(() => {
    if (!socket) return;

    const handleVideoAction = (data) => {
      if (!player) return;
      
      setLastAction(data.action);
      if (data.action === 'play') {
        player.seekTo(data.time);
        player.playVideo();
      } else if (data.action === 'pause') {
        player.pauseVideo();
        player.seekTo(data.time);
      } else if (data.action === 'close') {
        onClose();
      }
    };

    socket.on('videoAction', handleVideoAction);

    return () => {
      socket.off('videoAction', handleVideoAction);
    };
  }, [socket, player, onClose]);

  if (!videoId) return null;

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height + 35}px`,
        backgroundColor: '#000',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        zIndex: 1000,
        cursor: isDragging ? 'move' : 'default',
        userSelect: 'none'
      }}
    >
      {/* Title bar for dragging */}
      <div 
        onMouseDown={handleMouseDownDrag}
        style={{
          height: '35px',
          background: 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%)',
          color: 'white',
          padding: '0 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'move'
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: '500' }}>
          🎬 YouTube Player
        </span>
        <button 
          onClick={() => {
            if (socket) {
              socket.emit('videoAction', { action: 'close' });
            }
            onClose();
          }}
          style={{
            background: '#ff4444',
            border: 'none',
            color: 'white',
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
          onMouseEnter={(e) => e.target.style.background = '#ff6666'}
          onMouseLeave={(e) => e.target.style.background = '#ff4444'}
        >
          ✕
        </button>
      </div>
      
      {/* YouTube player */}
      <div style={{ width: '100%', height: `${size.height}px` }}>
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      </div>
      
      {/* Resize handle */}
      <div 
        onMouseDown={handleMouseDownResize}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '20px',
          height: '20px',
          cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%)',
          borderBottomRightRadius: '10px'
        }}
      >
        <div style={{
          position: 'absolute',
          bottom: '3px',
          right: '3px',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.5)',
          pointerEvents: 'none'
        }}>
          ⋰
        </div>
      </div>
    </div>
  );
};

export default YouTubePlayer;