import { useState, useEffect, useRef } from 'react';

const RangeSlider = ({ 
  minValue = 0, 
  maxValue = 100, 
  initialLeftValue = 0, 
  initialRightValue = 100, 
  formatLabel = (val) => val, 
  formatCurrentTime = (val) => val, 
  currentTime = null,
  onRangeChange 
}) => {
  const [leftPos, setLeftPos] = useState(initialLeftValue);
  const [rightPos, setRightPos] = useState(initialRightValue);
  const [isDragging, setIsDragging] = useState(false);
  const [currentHandle, setCurrentHandle] = useState(null);
  
  const containerRef = useRef(null);
  const leftHandleRef = useRef(null);
  const rightHandleRef = useRef(null);
  const trackFillRef = useRef(null);
  
  // Initialize slider on mount
  useEffect(() => {
    updateHandlePositions(initialLeftValue, initialRightValue);
    
    // Add global event listeners for drag operations
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  // Update handle positions
  const updateHandlePositions = (left, right) => {
    setLeftPos(left);
    setRightPos(right);
    
    if (leftHandleRef.current && rightHandleRef.current && trackFillRef.current) {
      leftHandleRef.current.style.left = `${left}%`;
      rightHandleRef.current.style.left = `${right}%`;
      
      // Update track fill position and width
      trackFillRef.current.style.left = `${left}%`;
      trackFillRef.current.style.width = `${right - left}%`;
    }
  };
  
  // Handle mouse move during drag
  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerLeft = containerRect.left;
    
    // Calculate position as percentage
    let position = ((e.clientX - containerLeft) / containerWidth) * 100;
    
    // Constrain to 0-100%
    position = Math.max(0, Math.min(100, position));
    
    if (currentHandle === 'left') {
      // Don't allow left handle to go past right handle
      if (position < rightPos) {
        updateHandlePositions(position, rightPos);
      }
    } else if (currentHandle === 'right') {
      // Don't allow right handle to go past left handle
      if (position > leftPos) {
        updateHandlePositions(leftPos, position);
      }
    }
    
    // Notify parent component of range change
    if (onRangeChange) {
      onRangeChange(leftPos, rightPos);
    }
  };
  
  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
    setCurrentHandle(null);
    
    if (containerRef.current) {
      containerRef.current.style.cursor = 'default';
    }
    
    // Final notification of range change
    if (onRangeChange) {
      onRangeChange(leftPos, rightPos);
    }
  };
  
  // Start dragging left handle
  const handleLeftMouseDown = (e) => {
    setIsDragging(true);
    setCurrentHandle('left');
    
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
    
    e.preventDefault(); // Prevent text selection
  };
  
  // Start dragging right handle
  const handleRightMouseDown = (e) => {
    setIsDragging(true);
    setCurrentHandle('right');
    
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
    
    e.preventDefault(); // Prevent text selection
  };
  
  return (
    <div className="multi-range-slider">
      <div className="current-time-display">
        {currentTime !== null ? formatCurrentTime(currentTime) : "No transaction"}
      </div>
      
      <div className="range-slider-title">Select Time Range:</div>
      
      <div className="slider-container" ref={containerRef}>
        <div className="slider-track"></div>
        <div className="slider-track-fill" ref={trackFillRef}></div>
        <div 
          className="slider-handle left-handle" 
          ref={leftHandleRef}
          onMouseDown={handleLeftMouseDown}
        ></div>
        <div 
          className="slider-handle right-handle" 
          ref={rightHandleRef}
          onMouseDown={handleRightMouseDown}
        ></div>
      </div>
      
      <div className="range-labels">
        <span>{formatLabel(minValue)}</span>
        <span>{formatLabel(maxValue)}</span>
      </div>
    </div>
  );
};

export default RangeSlider; 