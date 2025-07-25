import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSignature } from '@/contexts/SignatureContext';

interface CursorSignatureProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
}

export function CursorSignature({ containerRef, zoom }: CursorSignatureProps) {
  const { 
    signature, 
    isSignatureMode, 
    signatureSize
  } = useSignature();

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const animationFrameId = useRef<number | null>(null);

  const updateMousePosition = useCallback((e: MouseEvent) => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    
    animationFrameId.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      
      setMousePosition({ x, y });
      setIsVisible(true);
    });
  }, [containerRef, zoom]);

  useEffect(() => {
    if (!isSignatureMode || !signature || !containerRef.current) {
      setIsVisible(false);
      return;
    }

    const container = containerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      updateMousePosition(e);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };

    const handleMouseEnter = () => {
      if (isSignatureMode && signature) {
        setIsVisible(true);
      }
    };

    // Use passive listeners for better performance
    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseenter', handleMouseEnter);

    // Cleanup
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseenter', handleMouseEnter);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isSignatureMode, signature, containerRef, updateMousePosition]);

  if (!isSignatureMode || !signature || !isVisible) {
    return null;
  }

  return (
    <div
      className="absolute pointer-events-none z-[9999]"
      style={{
        left: mousePosition.x - signatureSize.width / 2,
        top: mousePosition.y - signatureSize.height / 2,
        width: signatureSize.width,
        height: signatureSize.height,
        opacity: 0.9,
        transform: 'translate3d(0, 0, 0)', // Hardware acceleration
        willChange: 'transform', // Optimize for animations
      }}
    >
      {/* Transparent container with just border for visual guidance */}
      <div className="w-full h-full border-2 border-dashed border-blue-500 rounded-md relative">
        <img 
          src={signature} 
          alt="Signature preview" 
          className="w-full h-full object-contain"
          draggable={false}
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}
        />
      </div>
    </div>
  );
} 