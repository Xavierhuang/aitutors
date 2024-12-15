import React, { useState, useEffect } from 'react';
import './DatabaseManager.css';

function DatabaseManager({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newEntry, setNewEntry] = useState({ question: '', answer: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/database/entries');
      const data = await response.json();
      const validData = data.filter(entry => 
        entry && typeof entry.question === 'string' && typeof entry.answer === 'string'
      );
      setEntries(validData);
    } catch (error) {
      console.error('Error loading database:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
  };

  const handleSave = async (index) => {
    try {
      const response = await fetch('/api/database/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          index,
          entry: entries[index]
        }),
      });

      if (response.ok) {
        setEditingIndex(null);
        loadData();
      }
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleDelete = async (index) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        const response = await fetch('/api/database/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ index }),
        });

        if (response.ok) {
          loadData();
        }
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  const handleInsert = async () => {
    if (!newEntry.question || !newEntry.answer) {
      alert('Both question and answer are required');
      return;
    }

    try {
      const response = await fetch('/api/database/insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEntry),
      });

      if (response.ok) {
        setNewEntry({ question: '', answer: '' });
        loadData();
      }
    } catch (error) {
      console.error('Error inserting entry:', error);
    }
  };

  const handleChange = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index] = {
      ...newEntries[index],
      [field]: value
    };
    setEntries(newEntries);
  };

  const filteredEntries = entries.filter(entry => {
    if (!entry || !entry.question || !entry.answer) return false;
    return entry.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
           entry.answer.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="database-manager">
      <div className="database-header">
        <h2>Database Manager</h2>
        <input
          type="text"
          placeholder="Search entries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button onClick={onClose} className="close-button">Close</button>
      </div>

      <div className="new-entry-form">
        <input
          type="text"
          placeholder="New question"
          value={newEntry.question}
          onChange={(e) => setNewEntry({ ...newEntry, question: e.target.value })}
        />
        <input
          type="text"
          placeholder="New answer"
          value={newEntry.answer}
          onChange={(e) => setNewEntry({ ...newEntry, answer: e.target.value })}
        />
        <button onClick={handleInsert}>Add Entry</button>
      </div>

      {loading ? (
        <div className="loading">Loading database entries...</div>
      ) : (
        <div className="entries-list">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Answer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    {editingIndex === index ? (
                      <textarea
                        value={entry.question}
                        onChange={(e) => handleChange(index, 'question', e.target.value)}
                      />
                    ) : (
                      entry.question
                    )}
                  </td>
                  <td>
                    {editingIndex === index ? (
                      <textarea
                        value={entry.answer}
                        onChange={(e) => handleChange(index, 'answer', e.target.value)}
                      />
                    ) : (
                      entry.answer
                    )}
                  </td>
                  <td>
                    {editingIndex === index ? (
                      <button onClick={() => handleSave(index)}>Save</button>
                    ) : (
                      <div className="action-buttons">
                        <button onClick={() => handleEdit(index)}>Edit</button>
                        <button 
                          onClick={() => handleDelete(index)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DatabaseManager; 