import React, { useState, useCallback } from 'react';
import { SearchProvider } from './contexts/SearchContext';
import { FileUploadPanel } from './components/FileUploadPanel';
import { SearchPanel } from './components/SearchPanel';
import { DocumentViewer } from './components/DocumentViewer';
import { Header } from './components/Header';
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

  return (
    <SearchProvider>
      <div className="app">
        <Header 
          onClearSession={handleClearSession}
          uploadedFile={uploadedFile}
        />
        
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
