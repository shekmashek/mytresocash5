import React from 'react';

const FlagIcon = ({ lang, className }) => {
  if (lang === 'fr') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" className={className} aria-label="Drapeau Français">
        <rect width="1" height="2" fill="#0055A4"/>
        <rect width="1" height="2" x="1" fill="#FFFFFF"/>
        <rect width="1" height="2" x="2" fill="#EF4135"/>
      </svg>
    );
  }
  if (lang === 'en') {
    // GB flag
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className={className} aria-label="Drapeau du Royaume-Uni">
        <clipPath id="s-en-a-clip">
          <path d="M0 0v30h60V0z"/>
        </clipPath>
        <clipPath id="s-en-b-clip">
          <path d="M30 15h30v15zM0 15h30V0z"/>
        </clipPath>
        <g clipPath="url(#s-en-a-clip)">
          <path d="M0 0v30h60V0z" fill="#012169"/>
          <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
          <path d="M0 0l60 30m0-30L0 30" clipPath="url(#s-en-b-clip)" stroke="#C8102E" strokeWidth="4"/>
          <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
          <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
        </g>
      </svg>
    );
  }
  return null;
};

export default FlagIcon;
