'use client';

import { useState, useRef, MouseEvent } from 'react';

interface DynamicGradientCardProps {
  children: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  className?: string;
}

export default function DynamicGradientCard({ 
  children, 
  gradientFrom, 
  gradientTo,
  className = ''
}: DynamicGradientCardProps) {
  const [gradientAngle, setGradientAngle] = useState(90);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate center of the card
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate angle from center to mouse position
    const deltaX = x - centerX;
    const deltaY = y - centerY;
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    setGradientAngle(angle);
  };

  const handleMouseLeave = () => {
    // Reset to default angle
    setGradientAngle(90);
  };

  return (
    <div
      ref={cardRef}
      className={`rounded-lg p-[3px] transition-transform duration-300 hover:scale-[1.0125] ${className}`}
      style={{
        background: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

