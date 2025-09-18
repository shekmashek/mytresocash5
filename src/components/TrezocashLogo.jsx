import React from 'react';

const TrezocashLogo = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
    >
      <defs>
        {/* Main gold gradient for the coin body */}
        <radialGradient id="flashyGold" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="40%" stopColor="#FBBF24" />
          <stop offset="80%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </radialGradient>

        {/* Gradient for the inner bevel highlight */}
        <linearGradient id="bevelHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
        </linearGradient>

        {/* Gradient for the inner bevel shadow */}
        <linearGradient id="bevelShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#B45309" stopOpacity="0" />
          <stop offset="100%" stopColor="#78350F" stopOpacity="0.5" />
        </linearGradient>

        {/* Pattern for the circuit background */}
        <pattern id="circuitPattern" patternUnits="userSpaceOnUse" width="10" height="10">
          <path d="M0 5 H10 M5 0 V10" stroke="#FBBF24" strokeWidth="0.5" opacity="0.3" />
        </pattern>
        
        {/* Filter for the textured look on the 'T' */}
        <filter id="texture">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="turbulence"/>
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="0.5" />
        </filter>

        {/* Filter for engraving effect */}
        <filter id="engrave">
          <feOffset in="SourceAlpha" dx="0.5" dy="0.5" result="offset"/>
          <feGaussianBlur in="offset" stdDeviation="0.5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="out" result="cutout"/>
          <feFlood floodColor="#000" floodOpacity="0.4" result="flood"/>
          <feComposite in2="cutout" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Main coin circle */}
      <circle cx="50" cy="50" r="48" fill="url(#flashyGold)" />

      {/* Circuit pattern background */}
      <circle cx="50" cy="50" r="40" fill="url(#circuitPattern)" />
      
      {/* Glossy highlight on top */}
      <path d="M 20 15 A 45 45 0 0 1 80 15 A 60 60 0 0 0 20 15" fill="white" fillOpacity="0.2" />

      {/* Inner ring with bevel effect */}
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#bevelHighlight)" strokeWidth="1" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#bevelShadow)" strokeWidth="1" />
      <circle cx="50" cy="50" r="42.5" fill="none" stroke="#B45309" strokeWidth="1.5" />

      {/* Outer ring */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="#B45309" strokeWidth="2" />
      
      {/* Central 'T' symbol - made larger */}
      <g transform="translate(0, 2)">
        <text
          x="50"
          y="68"
          textAnchor="middle"
          fontSize="70"
          fontWeight="bold"
          fill="#FDE047"
          stroke="#78350F"
          strokeWidth="2"
          fontFamily="Arial, sans-serif"
          filter="url(#texture)"
        >
          T
        </text>
      </g>
      
      {/* Text on the ring with engraving effect */}
      <path id="textPath" d="M 12,50 A 38,38 0 1,1 88,50" fill="none" />
      <text
        fill="#D97706"
        fontSize="5"
        fontWeight="bold"
        letterSpacing="2"
        filter="url(#engrave)"
      >
        <textPath href="#textPath" startOffset="50%" textAnchor="middle">
          TREZOCASH • DIGITAL • SECURE
        </textPath>
      </text>
    </svg>
  );
};

export default TrezocashLogo;
