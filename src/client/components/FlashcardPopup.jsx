import React, { useState } from 'react';
import './FlashcardPopup.css';

function FlashcardPopup({ question, answer, onClose }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="flashcard-overlay" onClick={onClose}>
      <div className="flashcard-popup" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <div className={`flashcard-content ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
          <div className="flashcard-front">
            <h3>Question</h3>
            <p>{question}</p>
            <div className="flashcard-hint">(Click to see answer)</div>
          </div>
          <div className="flashcard-back">
            <h3>Answer</h3>
            <p>{answer}</p>
            <div className="flashcard-hint">(Click to see question)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashcardPopup; 