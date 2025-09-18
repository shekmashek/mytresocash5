import React, { useRef } from 'react';

const ResizableTh = ({ children, width, onResize, id, className, style }) => {
  const thRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = thRef.current.offsetWidth;

    const handleMouseMove = (moveEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      onResize(id, newWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th
      ref={thRef}
      className={`px-4 py-3 text-left font-semibold text-gray-900 bg-gray-100 border-b-2 border-r border-gray-200 relative ${className}`}
      style={{ ...style, width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
    >
      <div className="flex justify-between items-center h-full">
        <div className="flex-grow truncate">{children}</div>
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 right-0 w-2 h-full cursor-col-resize"
          style={{ zIndex: 30 }}
        />
      </div>
    </th>
  );
};

export default ResizableTh;
