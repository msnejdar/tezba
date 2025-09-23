import React, { useEffect, useRef, useCallback, useMemo } from 'react';

interface SearchResult {
  match: string;
  context: string;
  position: number;
  confidence: number;
  type: string;
}

interface DocumentViewerProps {
  content: string;
  fileName: string;
  searchResults: SearchResult[];
  selectedResult: SearchResult | null;
  currentQuery: string;
}

export function DocumentViewer({ 
  content, 
  fileName, 
  searchResults, 
  selectedResult,
  currentQuery 
}: DocumentViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightRefs = useRef<Map<number, HTMLSpanElement>>(new Map());

  // Scroll na vybraný výsledek
  useEffect(() => {
    if (selectedResult && contentRef.current) {
      const highlightElement = highlightRefs.current.get(selectedResult.position);
      if (highlightElement) {
        highlightElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // Dočasné zvýraznění
        highlightElement.classList.add('selected-highlight');
        setTimeout(() => {
          highlightElement.classList.remove('selected-highlight');
        }, 2000);
      }
    }
  }, [selectedResult]);

  // Vytvoření highlightovaného obsahu
  const highlightedContent = useMemo(() => {
    if (!currentQuery || searchResults.length === 0) {
      return content;
    }

    // Seřazení výsledků podle pozice
    const sortedResults = [...searchResults].sort((a, b) => a.position - b.position);
    
    let highlightedText = content;
    let offset = 0;

    // Postupné vkládání highlight značek
    for (let i = 0; i < sortedResults.length; i++) {
      const result = sortedResults[i];
      const position = result.position + offset;
      const matchText = result.match;
      
      // Najdeme přesnou pozici v textu
      const beforeText = highlightedText.substring(0, position);
      const afterText = highlightedText.substring(position + matchText.length);
      
      // Vytvořme unikátní ID pro tento highlight
      const highlightId = `highlight-${i}-${result.position}`;
      
      // Vložíme highlight značku
      const highlightHtml = `<span class="document-highlight" data-position="${result.position}" id="${highlightId}">${matchText}</span>`;
      
      highlightedText = beforeText + highlightHtml + afterText;
      offset += highlightHtml.length - matchText.length;
    }

    return highlightedText;
  }, [content, currentQuery, searchResults]);

  // Funkce pro vytvoření HTML elementů s event listenery
  const createContentWithListeners = useCallback(() => {
    if (!contentRef.current) return;

    contentRef.current.innerHTML = highlightedContent;

    // Přidání event listenerů na highlight elementy
    const highlights = contentRef.current.querySelectorAll('.document-highlight');
    highlights.forEach((highlight, index) => {
      const position = parseInt(highlight.getAttribute('data-position') || '0');
      const spanElement = highlight as HTMLSpanElement;
      
      // Uložení reference
      highlightRefs.current.set(position, spanElement);
      
      // Přidání click listeneru
      spanElement.addEventListener('click', () => {
        spanElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      });
    });
  }, [highlightedContent]);

  useEffect(() => {
    createContentWithListeners();
  }, [createContentWithListeners]);

  const formatFileSize = useCallback((text: string): string => {
    const bytes = new Blob([text]).size;
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const estimateReadingTime = useCallback((text: string): number => {
    const wordsPerMinute = 200; // Průměrná rychlost čtení
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }, []);

  const getLineCount = useCallback((text: string): number => {
    return text.split('\n').length;
  }, []);

  return (
    <div className="document-viewer">
      <div className="document-header">
        <div className="document-title">
          📄 {fileName}
        </div>
        <div className="document-info">
          {formatFileSize(content)} • {getLineCount(content).toLocaleString()} řádků • 
          ~{estimateReadingTime(content)} min čtení
          {searchResults.length > 0 && (
            <> • <span className="highlight-count">{searchResults.length} zvýrazněných výsledků</span></>
          )}
        </div>
      </div>

      <div className="document-content-wrapper">
        {searchResults.length > 0 && (
          <div className="document-navigation">
            <div className="nav-info">
              🔍 {searchResults.length} výsledků pro "{currentQuery}"
            </div>
            <div className="nav-tips">
              💡 Klikněte na výsledek vlevo pro přeskok na pozici
            </div>
          </div>
        )}

        <div 
          ref={contentRef}
          className="document-content"
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: '1.6'
          }}
        >
          {/* Obsah bude vložen přes innerHTML */}
        </div>
      </div>

      {content.length === 0 && (
        <div className="document-empty">
          <p>📄 Dokument je prázdný</p>
        </div>
      )}
    </div>
  );
}