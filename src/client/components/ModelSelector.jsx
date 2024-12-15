import React from 'react';
import './ModelSelector.css';

const models = [
  { 
    id: 'machine_learning_6025', 
    name: 'Machine Learning (COMP6025)', 
    description: 'Specialized in Machine Learning concepts and course materials'
  },
  { 
    id: 'python_ml', 
    name: 'Python for ML', 
    description: 'Python programming with focus on ML implementations'
  },
  { 
    id: 'data_analysis', 
    name: 'Data Analysis', 
    description: 'Data preprocessing, analysis, and visualization'
  },
  { 
    id: 'neural_networks', 
    name: 'Neural Networks', 
    description: 'Deep learning concepts and architectures'
  },
  { 
    id: 'statistics', 
    name: 'Statistics for ML', 
    description: 'Statistical methods and probability theory'
  }
];

function ModelSelector({ selectedModel, onModelChange }) {
  return (
    <div className="model-selector">
      <select 
        value={selectedModel} 
        onChange={(e) => onModelChange(e.target.value)}
        className="model-select"
      >
        {models.map(model => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
      <div className="model-description">
        {models.find(m => m.id === selectedModel)?.description}
      </div>
    </div>
  );
}

export default ModelSelector; 