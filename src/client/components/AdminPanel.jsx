import React, { useState } from 'react';
import './AdminPanel.css';
import DatabaseManager from './DatabaseManager';

function AdminPanel({ conversations, onCorrectAnswer, onLogout }) {
  const [corrections, setCorrections] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDatabase, setShowDatabase] = useState(false);

  const handleCorrection = async (index, correction) => {
    try {
      setIsSaving(true);
      
      // Save the correction locally first
      setCorrections(prev => ({
        ...prev,
        [index]: correction
      }));

      // Send correction to server
      const response = await fetch('/api/admin/corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original: conversations[index].answer,
          correction: correction
        }),
      });

      if (response.ok) {
        // Update the UI through parent component
        onCorrectAnswer(index, correction);
      } else {
        console.error('Failed to save correction');
      }
    } catch (error) {
      console.error('Error saving correction:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button onClick={onLogout} className="logout-button">
        Logout
      </button>
      
      <div className="admin-panel">
        <div className="admin-header">
          <h2>Admin Monitoring Panel</h2>
        </div>
        <div className="conversations-list">
          {conversations.map((conv, index) => (
            <div key={index} className="conversation-item">
              <div className="user-message">{conv.question}</div>
              <div className="ai-response">
                <div className="response-text">{conv.answer}</div>
                <textarea
                  value={corrections[index] || ''}
                  onChange={(e) => setCorrections(prev => ({
                    ...prev,
                    [index]: e.target.value
                  }))}
                  placeholder="Enter correction..."
                />
                <button 
                  onClick={() => handleCorrection(index, corrections[index])}
                  disabled={isSaving || !corrections[index]}
                >
                  {isSaving ? 'Saving...' : 'Send Correction'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="admin-controls">
          <button 
            onClick={() => setShowDatabase(true)}
            className="database-button"
            aria-label="Update Database"
          />
        </div>
      </div>
      
      {showDatabase && (
        <DatabaseManager onClose={() => setShowDatabase(false)} />
      )}
    </>
  );
}

export default AdminPanel; 