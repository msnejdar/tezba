import React, { useState, useCallback } from 'react';
import { SearchProvider } from './contexts/SearchContext';
import { FileUploadPanel } from './components/FileUploadPanel';
import { SearchPanel } from './components/SearchPanel';
import { DocumentViewer } from './components/DocumentViewer';
import { Header } from './components/Header';
import HiveMindDashboard from './components/HiveMindDashboard';
import './styles/App.css';

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

interface SearchResult {
  match: string;
  context: string;
  position: number;
  confidence: number;
  type: string;
}

function App() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHiveMind, setShowHiveMind] = useState(false);

  const handleFileUpload = useCallback((file: UploadedFile) => {
    setUploadedFile(file);
    setSearchResults([]);
    setCurrentQuery('');
    setSelectedResult(null);
  }, []);

  const handleSearch = useCallback((query: string, results: SearchResult[]) => {
    setCurrentQuery(query);
    setSearchResults(results);
    setSelectedResult(null);
  }, []);

  const handleResultSelect = useCallback((result: SearchResult) => {
    setSelectedResult(result);
  }, []);

  const handleClearSession = useCallback(() => {
    setUploadedFile(null);
    setSearchResults([]);
    setCurrentQuery('');
    setSelectedResult(null);
  }, []);

  if (showHiveMind) {
    return (
      <div>
        <div style={{padding: '1rem', background: '#f0f0f0', borderBottom: '1px solid #ddd'}}>
          <button 
            onClick={() => setShowHiveMind(false)}
            style={{padding: '0.5rem 1rem', marginRight: '1rem', borderRadius: '4px', border: '1px solid #ccc', background: 'white'}}
          >
            ← Back to Document Processor
          </button>
          <span style={{color: '#666'}}>Claude Flow Hive Mind Dashboard</span>
        </div>
        <HiveMindDashboard />
      </div>
    );
  }

  return (
    <SearchProvider>
      <div className="app">
        <Header 
          onClearSession={handleClearSession}
          uploadedFile={uploadedFile}
        />
        
        <div className="app-nav" style={{padding: '1rem', background: '#f8f9fa', borderBottom: '1px solid #dee2e6'}}>
          <button 
            onClick={() => setShowHiveMind(true)}
            className="hive-mind-button"
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            🧠 Open Hive Mind Dashboard
          </button>
        </div>
        
        <main className="app-main">
          {!uploadedFile ? (
            <div className="upload-container">
              <FileUploadPanel onFileUpload={handleFileUpload} />
            </div>
          ) : (
            <div className="split-view">
              <div className="left-panel">
                <SearchPanel 
                  onSearch={handleSearch}
                  results={searchResults}
                  currentQuery={currentQuery}
                  onResultSelect={handleResultSelect}
                  selectedResult={selectedResult}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              </div>
              
              <div className="right-panel">
                <DocumentViewer 
                  content={uploadedFile.content}
                  fileName={uploadedFile.name}
                  searchResults={searchResults}
                  selectedResult={selectedResult}
                  currentQuery={currentQuery}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </SearchProvider>
  );
}

export default App;
