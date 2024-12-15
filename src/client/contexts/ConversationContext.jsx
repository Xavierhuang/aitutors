import React, { createContext, useContext, useReducer } from 'react';

const ConversationContext = createContext();

const conversationReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        history: [...state.history, action.payload]
      };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        history: state.history.map((msg, i) => 
          i === action.payload.index 
            ? { ...msg, content: action.payload.content }
            : msg
        )
      };
    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: []
      };
    default:
      return state;
  }
};

export function ConversationProvider({ children }) {
  const [state, dispatch] = useReducer(conversationReducer, {
    history: []
  });

  return (
    <ConversationContext.Provider value={{ state, dispatch }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}