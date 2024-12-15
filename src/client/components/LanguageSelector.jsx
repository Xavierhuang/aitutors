import React, { useEffect, useRef } from 'react';
import './LanguageSelector.css';

const languages = [
  { code: 'zh', name: 'Chinese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
];

function LanguageSelector({ onSelect, onClose, position }) {
  const selectorRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div 
      ref={selectorRef}
      className="language-selector"
      style={{
        position: 'fixed',
        left: '50%',
        top: `${position.y - 150}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onSelect(lang.code)}
          className="language-option"
        >
          {lang.name}
        </button>
      ))}
    </div>
  );
}

export default LanguageSelector; 