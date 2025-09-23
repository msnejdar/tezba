import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { mockApi, isApiAvailable } from '../services/mockApi';

interface SearchResult {
  match: string;
  context: string;
  position: number;
  confidence: number;
  type: string;
}

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

interface SearchState {
  uploadedFile: UploadedFile | null;
  searchResults: SearchResult[];
  currentQuery: string;
  selectedResult: SearchResult | null;
  isLoading: boolean;
  searchHistory: string[];
  error: string | null;
}

type SearchAction =
  | { type: 'SET_UPLOADED_FILE'; payload: UploadedFile }
  | { type: 'SET_SEARCH_RESULTS'; payload: { query: string; results: SearchResult[] } }
  | { type: 'SET_SELECTED_RESULT'; payload: SearchResult | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_SESSION' }
  | { type: 'ADD_TO_HISTORY'; payload: string };

const initialState: SearchState = {
  uploadedFile: null,
  searchResults: [],
  currentQuery: '',
  selectedResult: null,
  isLoading: false,
  searchHistory: [],
  error: null,
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_UPLOADED_FILE':
      return {
        ...state,
        uploadedFile: action.payload,
        searchResults: [],
        currentQuery: '',
        selectedResult: null,
        error: null,
      };

    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        searchResults: action.payload.results,
        currentQuery: action.payload.query,
        selectedResult: null,
        error: null,
      };

    case 'SET_SELECTED_RESULT':
      return {
        ...state,
        selectedResult: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: action.payload ? null : state.error,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'ADD_TO_HISTORY':
      const newHistory = [action.payload, ...state.searchHistory.filter(q => q !== action.payload)];
      return {
        ...state,
        searchHistory: newHistory.slice(0, 10), // Keep only last 10 searches
      };

    case 'CLEAR_SESSION':
      return initialState;

    default:
      return state;
  }
}

interface SearchContextType {
  state: SearchState;
  dispatch: React.Dispatch<SearchAction>;
  // Helper functions
  uploadFile: (file: UploadedFile) => void;
  searchInDocument: (query: string) => Promise<void>;
  selectResult: (result: SearchResult | null) => void;
  clearSession: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(searchReducer, initialState);
  const [useBackend, setUseBackend] = useState(false);

  useEffect(() => {
    isApiAvailable().then(setUseBackend);
  }, []);

  const uploadFile = (file: UploadedFile) => {
    dispatch({ type: 'SET_UPLOADED_FILE', payload: file });
  };

  const searchInDocument = async (query: string) => {
    if (!state.uploadedFile || !query.trim()) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'ADD_TO_HISTORY', payload: query });

    try {
      let results = [];
      
      if (useBackend) {
        // Use real API if available
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ query: query.trim() }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Chyba při vyhledávání');
        }
        
        results = data.results || [];
      } else {
        // Use mock API for Vercel deployment
        const result = await mockApi.search(query.trim(), state.uploadedFile.content);
        results = result.results || [];
      }

      dispatch({
        type: 'SET_SEARCH_RESULTS',
        payload: {
          query: query.trim(),
          results: results,
        },
      });

    } catch (error) {
      console.error('Search error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Neočekávaná chyba při vyhledávání',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const selectResult = (result: SearchResult | null) => {
    dispatch({ type: 'SET_SELECTED_RESULT', payload: result });
  };

  const clearSession = async () => {
    try {
      if (useBackend) {
        await fetch('/api/session/clear', {
          method: 'DELETE',
          credentials: 'include',
        });
      } else {
        await mockApi.clearSession();
      }
    } catch (error) {
      console.error('Error clearing session:', error);
    }
    
    dispatch({ type: 'CLEAR_SESSION' });
  };

  const contextValue: SearchContextType = {
    state,
    dispatch,
    uploadFile,
    searchInDocument,
    selectResult,
    clearSession,
  };

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}