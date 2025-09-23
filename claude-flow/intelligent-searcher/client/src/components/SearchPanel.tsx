import React, { useState, useCallback, useRef, useEffect } from 'react';

interface SearchResult {
  match: string;
  context: string;
  position: number;
  confidence: number;
  type: string;
}

interface SearchPanelProps {
  onSearch: (query: string, results: SearchResult[]) => void;
  results: SearchResult[];
  currentQuery: string;
  onResultSelect: (result: SearchResult) => void;
  selectedResult: SearchResult | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function SearchPanel({ 
  onSearch, 
  results, 
  currentQuery, 
  onResultSelect, 
  selectedResult,
  isLoading,
  setIsLoading
}: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus na search input při prvním načtení
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleSearch = useCallback(async () => {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      setError('Zadejte vyhledávací dotaz');
      return;
    }

    if (trimmedQuery.length < 2) {
      setError('Vyhledávací dotaz musí mít alespoň 2 znaky');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ query: trimmedQuery }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Chyba při vyhledávání');
      }

      onSearch(trimmedQuery, data.results || []);

    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Neočekávaná chyba při vyhledávání');
    } finally {
      setIsLoading(false);
    }
  }, [query, onSearch, setIsLoading]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  }, [handleSearch, isLoading]);

  const handleResultClick = useCallback((result: SearchResult) => {
    onResultSelect(result);
  }, [onResultSelect]);

  // Highlighting funkcí pro kontext
  const highlightText = useCallback((text: string, searchTerm: string): React.ReactElement => {
    if (!searchTerm) return <span>{text}</span>;

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    
    return (
      <span>
        {parts.map((part, index) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <span key={index} className="highlight">{part}</span>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    );
  }, []);

  const formatConfidence = useCallback((confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  }, []);

  const getSearchTypeIcon = useCallback((type: string): string => {
    switch (type) {
      case 'personal_id': return '🆔';
      case 'phone_number': return '📞';
      case 'contract_document': return '📄';
      case 'person_name': return '👤';
      case 'general': return '🔍';
      default: return '📝';
    }
  }, []);

  const getSearchTypeLabel = useCallback((type: string): string => {
    switch (type) {
      case 'personal_id': return 'Rodné číslo';
      case 'phone_number': return 'Telefonní číslo';
      case 'contract_document': return 'Dokument/Smlouva';
      case 'person_name': return 'Jméno osoby';
      case 'general': return 'Obecné';
      default: return 'Neznámý';
    }
  }, []);

  return (
    <div className="search-panel">
      <div className="search-input-container">
        <input
          ref={searchInputRef}
          type="text"
          className="search-input"
          placeholder="Co chcete najít? (např. 'rodné číslo', 'Jan Novák', 'smlouva 2024')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button 
          className="search-button"
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <>
              <div className="loading-spinner"></div>
              Hledám...
            </>
          ) : (
            '🔍 Hledat'
          )}
        </button>
      </div>

      {error && (
        <div className="error">
          ❌ {error}
        </div>
      )}

      <div className="search-results">
        {currentQuery && !isLoading && (
          <div className="results-header">
            <div className="results-count">
              {results.length === 0 
                ? 'Žádné výsledky nenalezeny'
                : `${results.length} ${results.length === 1 ? 'výsledek' : results.length < 5 ? 'výsledky' : 'výsledků'}`
              }
            </div>
            <div className="results-query">
              Hledáno: "{currentQuery}"
            </div>
          </div>
        )}

        {isLoading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <span className="loading-text">Prohledávám dokument pomocí AI...</span>
          </div>
        )}

        {!isLoading && results.length === 0 && currentQuery && (
          <div className="no-results">
            <p>🔍 Žádné výsledky nenalezeny</p>
            <p>Zkuste:</p>
            <ul>
              <li>Jiné klíčové slovo</li>
              <li>Zkrácený dotaz</li>
              <li>Synonyma nebo alternativní výrazy</li>
            </ul>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="results-list">
            {results.map((result, index) => (
              <div
                key={index}
                className={`result-card ${selectedResult === result ? 'selected' : ''}`}
                onClick={() => handleResultClick(result)}
              >
                <div className="result-match">
                  {getSearchTypeIcon(result.type)} {highlightText(result.match, currentQuery)}
                </div>
                
                <div className="result-context">
                  {highlightText(result.context, currentQuery)}
                </div>
                
                <div className="result-metadata">
                  <span className="result-type">
                    {getSearchTypeLabel(result.type)}
                  </span>
                  <span className="result-confidence">
                    {formatConfidence(result.confidence || 0.9)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!currentQuery && !isLoading && (
        <div className="search-suggestions">
          <h3>💡 Příklady vyhledávání:</h3>
          <div className="suggestion-chips">
            <button 
              className="suggestion-chip"
              onClick={() => setQuery('rodné číslo')}
            >
              🆔 rodné číslo
            </button>
            <button 
              className="suggestion-chip"
              onClick={() => setQuery('telefon')}
            >
              📞 telefon
            </button>
            <button 
              className="suggestion-chip"
              onClick={() => setQuery('smlouva 2024')}
            >
              📄 smlouva 2024
            </button>
            <button 
              className="suggestion-chip"
              onClick={() => setQuery('Jan Novák')}
            >
              👤 Jan Novák
            </button>
          </div>
          
          <div className="search-tips">
            <h4>🎯 Tipy pro vyhledávání:</h4>
            <ul>
              <li><strong>Přesné výrazy:</strong> "smlouva č. 123"</li>
              <li><strong>Obecné kategorie:</strong> rodné číslo, telefon</li>
              <li><strong>Jména osob:</strong> Jan Novák, Novák Jan</li>
              <li><strong>Čísla dokumentů:</strong> smlouva 2024, DOC-001</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}