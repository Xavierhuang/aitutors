import React, { useState, useEffect } from 'react';
import './TextSelectionMenu.css';

function TextSelectionMenu({ 
  onTranslate, 
  onSummarize, 
  onRephrase, 
  onFlashcard, 
  onAIReply,
  onElaborate,
  onQuiz,
  loadingStates,
  handleGenerateImage
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection.toString().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setPosition({
          x: rect.x + window.scrollX + (rect.width / 2),
          y: rect.y + window.scrollY - 10
        });
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className="selection-menu"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <button 
        onClick={onTranslate} 
        disabled={loadingStates.translate}
      >
        {loadingStates.translate ? <span className="spinner"></span> : 'Translate'}
      </button>
      <button 
        onClick={onSummarize}
        disabled={loadingStates.summarize}
      >
        {loadingStates.summarize ? <span className="spinner"></span> : 'Summarize'}
      </button>
      <button 
        onClick={onRephrase}
        disabled={loadingStates.rephrase}
      >
        {loadingStates.rephrase ? <span className="spinner"></span> : 'Rephrase'}
      </button>
      <button onClick={onFlashcard}>Flashcard</button>
      <button 
        onClick={onAIReply}
        disabled={loadingStates.generateImage}
      >
        {loadingStates.generateImage ? <span className="spinner"></span> : 'Generate Image'}
      </button>
      <button 
        onClick={onElaborate}
        disabled={loadingStates.elaborate}
      >
        {loadingStates.elaborate ? <span className="spinner"></span> : 'Elaborate'}
      </button>
      <button 
        onClick={onQuiz} 
        disabled={loadingStates.quiz}
      >
        {loadingStates.quiz ? <span className="spinner"></span> : 'Quiz Me'}
      </button>
    </div>
  );
}

export default TextSelectionMenu; 