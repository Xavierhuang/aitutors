import React, { useState, useEffect } from 'react';
import TextSelectionMenu from './TextSelectionMenu';
import './App.css';
import { OpenAI } from 'openai';
import * as XLSX from 'xlsx';
import { useConversation } from './contexts/ConversationContext';
import LanguageSelector from './components/LanguageSelector';
import FlashcardPopup from './components/FlashcardPopup';
import { materials } from './data/materials';
import ModelSelector from './components/ModelSelector';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';

// Move OpenAI client outside component
const openai = new OpenAI({
  apiKey: "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", // Your API key here
  dangerouslyAllowBrowser: true
});

// Move API call function outside component
async function callFineTunedModel(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: "ft:gpt-4o-2024-08-06:personal:machinelearning:Ae6x9peP",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error calling fine-tuned model:', error);
    throw error;
  }
}

// Move loadQuestions outside component
async function loadQuestions() {
  try {
    const response = await fetch('/Combined_QA_Dataset.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log('Loaded Excel data:', data); // Debug log
    const questions = data.map(row => {
      console.log('Row data:', row);
      const question = row.question || row.Question;
      if (question && question.includes('time series')) {
        console.log('Found time series question:', question);
      }
      return question;
    });
    console.log('Total questions loaded:', questions.length);
    return questions;
  } catch (error) {
    console.error('Error loading questions:', error);
    return [];
  }
}

// Add this new function to store question-answer pairs
async function loadQuestionsAndAnswers() {
  try {
    const response = await fetch('/Combined_QA_Dataset.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    // Create a map of questions to answers
    const qaMap = new Map(data.map(row => [
      row.question || row.Question,
      row.answer || row.Answer
    ]));
    return {
      questions: Array.from(qaMap.keys()),
      qaMap: qaMap
    };
  } catch (error) {
    console.error('Error loading Q&A:', error);
    return { questions: [], qaMap: new Map() };
  }
}

// Add this near the top of your file after OpenAI initialization
console.log('OpenAI client initialized with key:', !!openai.apiKey);

// Update the API endpoint
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://theaitutors.com' 
  : 'http://localhost:3001';

// Add this function to check if it's a material request
const isMaterialRequest = (text) => {
  const materialKeywords = ['material', 'materials', 'ppt', 'slides', 'presentation', 'content', 'pdf'];
  return materialKeywords.some(keyword => text.toLowerCase().includes(keyword));
};

// Add this helper function at the top level
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [allQuestions, setAllQuestions] = useState([]);
  const [qaMap, setQaMap] = useState(new Map());
  const { state: { history }, dispatch } = useConversation();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState({ x: 0, y: 0 });
  const [flashcard, setFlashcard] = useState(null);
  const [selectedModel, setSelectedModel] = useState('machine_learning_6025');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCorrections, setAdminCorrections] = useState({});
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [materials, setMaterials] = useState(null);
  const [loadingStates, setLoadingStates] = useState({
    translate: false,
    summarize: false,
    rephrase: false,
    flashcard: false,
    quiz: false,
    elaborate: false,
    generateImage: false
  });

  useEffect(() => {
    // Load questions when component mounts
    const fetchQA = async () => {
      const { questions, qaMap } = await loadQuestionsAndAnswers();
      setAllQuestions(questions);
      setQaMap(qaMap);
    };
    fetchQA();
  }, []);

  useEffect(() => {
    if (question.length >= 3) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [question]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch('/api/chat/history');
        const history = await response.json();
        
        // Convert history to the format your app uses
        history.forEach(entry => {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: 'user',
              content: entry.question,
              timestamp: entry.timestamp
            }
          });
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: 'assistant',
              content: entry.answer,
              timestamp: entry.timestamp
            }
          });
        });
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadHistory();
  }, []);

  const fetchSuggestions = () => {
    if (!question || question.length < 3) {
      setSuggestions([]);
      return;
    }

    console.log('Current search:', question);

    // Add materials request as a suggestion if it matches
    const materialsSuggestion = "can you send me all the materials";
    const suggestions = [];
    
    if (materialsSuggestion.includes(question.toLowerCase())) {
      suggestions.push(materialsSuggestion);
    }

    // Add other matching questions from history
    const questionMatches = allQuestions
      .filter(q => {
        if (!q) return false;
        const match = q.toLowerCase().includes(question.toLowerCase());
        if (match) {
          console.log('Found matching question:', q);
        }
        return match;
      })
      .slice(0, 4); // Limit to 4 since we might have materials suggestion

    suggestions.push(...questionMatches);
    
    console.log('Found suggestions:', suggestions);
    setSuggestions(suggestions);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion) => {
    // Just set the question and close suggestions
    setQuestion(suggestion);
    setShowSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted with question:', question);
    
    // Add user's question to chat history first
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        role: 'user',
        content: question,
        timestamp: new Date().toISOString()
      }
    });

    handleAIReply();
    setQuestion('');
  };

  const withLoading = async (operation, action) => {
    setLoadingStates(prev => ({ ...prev, [operation]: true }));
    try {
      await action();
    } finally {
      setLoadingStates(prev => ({ ...prev, [operation]: false }));
    }
  };

  const handleTranslate = async () => {
    await withLoading('translate', async () => {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedPosition({
        x: window.innerWidth / 2,
        y: rect.top + window.scrollY
      });
      setShowLanguageSelector(true);
    });
  };

  const handleLanguageSelect = async (languageCode) => {
    const selectedText = window.getSelection().toString();
    setShowLanguageSelector(false);
    
    const languageNames = {
      zh: 'Chinese',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      ja: 'Japanese',
      ko: 'Korean',
      ru: 'Russian',
      ar: 'Arabic'
    };

    try {
      const response = await callFineTunedModel(
        `Translate the following text to ${languageNames[languageCode]}. 
         Only provide the translation, no explanations:
         "${selectedText}"`
      );
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content: `Translation (${languageNames[languageCode]}):\n${response}`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      setError('Translation failed');
    }
  };

  const handleSummarize = async () => {
    await withLoading('summarize', async () => {
      const selectedText = window.getSelection().toString();
      try {
        const response = await callFineTunedModel(
          `Summarize this text concisely while maintaining key points: ${selectedText}`
        );
        
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            role: 'assistant',
            content: `📝 Summary:\n${response}`,
            timestamp: new Date().toISOString()
          }
        });
      } catch (err) {
        setError('Summarization failed');
      }
    });
  };

  const handleAIReply = async () => {
    const userQuestion = question.trim().toLowerCase();
    
    if (userQuestion === "can you send me all the materials") {
      try {
        const response = await fetch('/api/materials');
        const data = await response.json();

        if (!data || !data.files || !Array.isArray(data.files)) {
          console.error('Invalid materials data:', data);
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: 'assistant',
              content: "I'm having trouble accessing the materials. Please try again later.",
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        // Create formatted message content with clickable links
        let messageContent = '📚 Machine Learning Course Materials\n\n';

        // Add files with clickable links
        data.files.forEach(file => {
          messageContent += `• <a href="${file.path}" target="_blank" download>${file.displayName}</a>\n`;
        });

        messageContent += '\n💡 Click any file name to download the materials.';

        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            role: 'assistant',
            content: messageContent,
            timestamp: new Date().toISOString()
          }
        });
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to access materials');
      }
    } else {
      // Look for matching questions in QA map
      const matchingQuestion = Array.from(qaMap.keys()).find(key => 
        key.toLowerCase().includes(userQuestion) || 
        userQuestion.includes(key.toLowerCase())
      );
      
      if (matchingQuestion) {
        const answer = qaMap.get(matchingQuestion);
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            role: 'assistant',
            content: answer,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        // If no match found, use the fine-tuned model
        try {
          const response = await callFineTunedModel(
            `Question: ${userQuestion}\nProvide a detailed answer about this machine learning concept.`
          );
          
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: 'assistant',
              content: response,
              timestamp: new Date().toISOString()
            }
          });
        } catch (err) {
          console.error('Error calling fine-tuned model:', err);
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: 'assistant',
              content: "I can help you find specific materials or answer questions about the course content. Try asking 'Can you send me all the materials' to see everything available.",
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    }
  };

  const handleCopy = () => {
    const selectedText = window.getSelection().toString();
    navigator.clipboard.writeText(selectedText);
  };

  const handleRephrase = async () => {
    await withLoading('rephrase', async () => {
      const selectedText = window.getSelection().toString();
      try {
        const response = await callFineTunedModel(
          `Rephrase this text in a different way: ${selectedText}`
        );
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            role: 'assistant',
            content: response,
            timestamp: new Date().toISOString()
          }
        });
      } catch (err) {
        setError('Rephrasing failed');
      }
    });
  };

  const handleFlashcard = async () => {
    // Get the last question and answer from chat history
    const lastQuestion = history
      .filter(msg => msg.role === 'user')
      .slice(-1)[0]?.content;
    
    const lastAnswer = history
      .filter(msg => msg.role === 'assistant')
      .slice(-1)[0]?.content;

    if (!lastQuestion || !lastAnswer) {
      setError('Please ask a question first before creating a flashcard');
      return;
    }

    try {
      const response = await callFineTunedModel(
        `Create a flashcard based on this Q&A:
         Question: ${lastQuestion}
         Answer: ${lastAnswer}
         Format the response as: Question|||Answer`
      );
      
      const [question, answer] = response.split('|||');
      
      // Show flashcard popup
      setFlashcard({
        question: question.trim(),
        answer: answer.trim()
      });
    } catch (err) {
      setError('Flashcard creation failed');
    }
  };

  console.log('API Key exists:', !!import.meta.env.VITE_OPENAI_API_KEY);

  const renderConversationHistory = () => (
    <div className="conversation-history">
      {history.map((message, index) => (
        <div 
          key={index} 
          className={`message ${message.role}`}
        >
          <div 
            className="message-content"
            dangerouslySetInnerHTML={{ 
              __html: message.content
                .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '<img src="$2" alt="$1" />')
                .replace(
                  /<a href="([^"]+)" download>([^<]+)<\/a>/g,
                  (match, path, name) => `<a href="${path}" class="file-link" download>${name}</a>`
                )
            }} 
          />
          <div className="message-timestamp">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );

  // Add this helper function for file size formatting
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    // Update the model in the OpenAI client
    if (modelId === 'machine_learning_6025') {
      // Use your fine-tuned model
      callFineTunedModel.model = "ft:gpt-4o-2024-08-06:personal:machinelearning:Ae6x9peP";
    } else {
      // Use appropriate model for other selections
      callFineTunedModel.model = "gpt-4";
    }
  };

  const handleAdminCorrection = (conversationIndex, correction) => {
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: {
        index: conversationIndex * 2 + 1, // Target assistant message
        content: correction
      }
    });
    
    // Store correction for training data
    setAdminCorrections(prev => ({
      ...prev,
      [conversationIndex]: {
        original: history[conversationIndex * 2 + 1].content,
        correction
      }
    }));
  };

  const handleAdminLogin = (success) => {
    if (success) {
      setIsAdmin(true);
      setShowAdminLogin(false);
    }
  };

  const handleElaborate = async () => {
    await withLoading('elaborate', async () => {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        try {
          const response = await callFineTunedModel(
            `Please provide a detailed explanation of this concept, including: 
            1. Detailed definition
            2. Key components or principles
            3. Real-world examples
            4. Common applications
            5. Related concepts
            Text to elaborate on: ${selectedText}`
          );
          
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: 'assistant',
              content: `🔍 Detailed Explanation:\n${response}`,
              timestamp: new Date().toISOString()
            }
          });
        } catch (err) {
          setError('Elaboration failed');
        }
      }
    });
  };

  const handleQuiz = async () => {
    await withLoading('quiz', async () => {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        try {
          const response = await callFineTunedModel(
            `Based on this text, generate a mini quiz with 3 questions. Include:
            1. Multiple choice questions
            2. The correct answer for each
            3. A brief explanation for each answer
            Format as:
            Q1: [question]
            A) [option]
            B) [option]
            C) [option]
            D) [option]
            Correct: [letter]
            Explanation: [why]
            
            Text to generate quiz from: ${selectedText}`
          );
          
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: 'assistant',
              content: `📝 Quiz Time!\n\n${response}`,
              timestamp: new Date().toISOString()
            }
          });
        } catch (err) {
          setError('Quiz generation failed');
        }
      }
    });
  };

  const handleGenerateImage = async () => {
    await withLoading('generateImage', async () => {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        try {
          const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: selectedText,
            n: 1,
            size: "1024x1024",
          });

          const imageUrl = response.data[0].url;
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: 'assistant',
              content: `🎨 Generated Image:\n![Generated Image](${imageUrl})`,
              timestamp: new Date().toISOString()
            }
          });
        } catch (err) {
          console.error('Image generation failed:', err);
          setError('Image generation failed');
        }
      }
    });
  };

  return (
    <div className="app-container">
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationalApplication",
          "name": "The AI Tutors",
          "description": "Your personal AI tutor for learning and understanding complex topics.",
          "applicationCategory": "EducationalApplication",
          "offers": {
            "@type": "Offer",
            "availability": "https://schema.org/InStock"
          }
        })}
      </script>
      <ModelSelector 
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />
      <TextSelectionMenu
        onTranslate={handleTranslate}
        onSummarize={handleSummarize}
        onRephrase={handleRephrase}
        onFlashcard={handleFlashcard}
        onAIReply={handleGenerateImage}
        onElaborate={handleElaborate}
        onQuiz={handleQuiz}
        loadingStates={loadingStates}
      />
      <h1>AI Learning Assistant</h1>
      <p className="description">
        Your personal tutor for learning and understanding complex topics. 
        Ask questions, get detailed explanations, and enhance your knowledge.
      </p>
      
      <div className="chat-container">
        {history.length > 0 && renderConversationHistory()}
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="search-container">
          <form onSubmit={handleSubmit} className="question-form">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question here..."
              disabled={isLoading}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            <button type="submit" disabled={isLoading || !question.trim()}>
              {isLoading ? 'Thinking...' : 'Send'}
            </button>
          </form>
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showLanguageSelector && (
        <LanguageSelector
          position={selectedPosition}
          onSelect={handleLanguageSelect}
          onClose={() => setShowLanguageSelector(false)}
        />
      )}
      {flashcard && (
        <FlashcardPopup
          question={flashcard.question}
          answer={flashcard.answer}
          onClose={() => setFlashcard(null)}
        />
      )}
      {isAdmin ? (
        <AdminPanel
          conversations={history.reduce((acc, msg, i) => {
            if (i % 2 === 0) {
              acc.push({
                question: msg.content,
                answer: history[i + 1]?.content
              });
            }
            return acc;
          }, [])}
          onCorrectAnswer={handleAdminCorrection}
          onLogout={() => setIsAdmin(false)}
        />
      ) : (
        <button 
          onClick={() => setShowAdminLogin(true)} 
          className="professor-login-button"
        >
          Professor Login
        </button>
      )}

      {showAdminLogin && <AdminLogin onLogin={handleAdminLogin} />}
    </div>
  );
}

export default App; 