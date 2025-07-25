import { Button } from "@/components/ui/button";
import Draggable from "react-draggable";
import { Resizable } from "re-resizable";
import { X, Move } from "lucide-react";

interface DraggableSignatureProps {
  signature: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  onHide: () => void;
  draggableRef: React.RefObject<HTMLDivElement | null>;
}

export function DraggableSignature({
  signature,
  position,
  size,
  onPositionChange,
  onSizeChange,
  onHide,
  draggableRef,
}: DraggableSignatureProps) {
  const handleDrag = (e: any, data: any) => {
    // Update position in real-time during drag
    onPositionChange({
      x: data.x,
      y: data.y,
    });
  };

  const handleResize = (
    e: any,
    direction: any,
    ref: HTMLElement,
    delta: { width: number; height: number }
  ) => {
    onSizeChange({
      width: size.width + delta.width,
      height: size.height + delta.height,
    });
  };

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onHide();
  };

  // Enhanced resize handle styles
  const resizeHandleStyles = {
    bottomRight: {
      background: '#3b82f6',
      border: '2px solid white',
      borderRadius: '50%',
      width: '16px',
      height: '16px',
      right: '-8px',
      bottom: '-8px',
      cursor: 'se-resize',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    topRight: {
      background: '#3b82f6',
      border: '2px solid white',
      borderRadius: '50%',
      width: '16px',
      height: '16px',
      right: '-8px',
      top: '-8px',
      cursor: 'ne-resize',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    bottomLeft: {
      background: '#3b82f6',
      border: '2px solid white',
      borderRadius: '50%',
      width: '16px',
      height: '16px',
      left: '-8px',
      bottom: '-8px',
      cursor: 'sw-resize',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    topLeft: {
      background: '#3b82f6',
      border: '2px solid white',
      borderRadius: '50%',
      width: '16px',
      height: '16px',
      left: '-8px',
      top: '-8px',
      cursor: 'nw-resize',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
  };

  return (
    <Draggable
      nodeRef={draggableRef}
      position={position}
      onDrag={handleDrag}
      handle=".drag-handle"
      bounds="parent"
    >
      <div
        ref={draggableRef}
        className="absolute"
        style={{
          zIndex: 1000,
          width: size.width,
          height: size.height,
        }}
      >
        <Resizable
          size={{ width: size.width, height: size.height }}
          onResize={handleResize}
          minWidth={80}
          minHeight={40}
          maxWidth={500}
          maxHeight={300}
          handleStyles={resizeHandleStyles}
          enable={{
            top: false,
            right: false,
            bottom: false,
            left: false,
            topRight: true,
            bottomRight: true,
            bottomLeft: true,
            topLeft: true,
          }}
          className="w-full h-full"
        >
          <div className="drag-handle w-full h-full border-2 border-dashed border-blue-500 bg-white bg-opacity-95 hover:bg-opacity-100 transition-all duration-200 rounded shadow-lg group cursor-move relative">
            {/* Signature Image */}
            <img 
              src={signature} 
              alt="Signature to place" 
              className="w-full h-full object-contain p-2 pointer-events-none select-none"
              draggable={false}
            />
            
            {/* Move indicator */}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-80 transition-opacity duration-200 pointer-events-none">
              <Move className="h-4 w-4 text-blue-600" />
            </div>
            
            {/* Control buttons */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-7 w-7 p-0 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg"
                onClick={handleHideClick}
                type="button"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Resize instruction */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity duration-200 pointer-events-none">
              <span className="text-xs text-blue-600 font-medium bg-white px-1 rounded">
                Resize
              </span>
            </div>
          </div>
        </Resizable>
      </div>
    </Draggable>
  );
} 