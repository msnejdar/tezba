import React, { useCallback, useState, useRef } from 'react';

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

interface FileUploadPanelProps {
  onFileUpload: (file: UploadedFile) => void;
}

export function FileUploadPanel({ onFileUpload }: FileUploadPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    const allowedExtensions = ['.txt', '.pages', '.docx', '.pdf', '.rtf', '.xlsx', '.xls', '.csv', '.md', '.markdown'];
    const fileExt = file.name.toLowerCase();
    const isSupported = allowedExtensions.some(ext => fileExt.endsWith(ext));
    
    if (!isSupported) {
      setError('Podporované formáty: .txt, .pages, .docx, .pdf, .rtf, .xlsx, .xls, .csv, .md');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('Soubor je příliš velký (maximum 10MB)');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('textFile', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Chyba při nahrávání souboru');
      }

      // Server zpracuje všechny typy souborů a pošle nám extrahovaný text
      let text = data.extractedText || '';
      
      // Fallback pro .txt soubory - pokud server nepošle text, čteme lokálně
      if (!text && file.name.toLowerCase().endsWith('.txt')) {
        text = await file.text();
      }
      
      if (!text) {
        throw new Error('Server nevrátil žádný text ze souboru');
      }
      
      const uploadedFile: UploadedFile = {
        name: file.name,
        content: text,
        size: text.length,
      };

      onFileUpload(uploadedFile);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Neočekávaná chyba při nahrávání');
    } finally {
      setIsUploading(false);
    }
  }, [onFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div 
      className={`file-upload-panel ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleButtonClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pages,.docx,.pdf,.rtf,.xlsx,.xls,.csv,.md,.markdown"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      
      <div className="upload-icon">
        {isUploading ? '⏳' : '📄🍎'}
      </div>
      
      <h2 className="upload-title">
        {isUploading ? 'Nahrávání...' : 'Nahrajte dokument'}
      </h2>
      
      <p className="upload-subtitle">
        {isUploading 
          ? 'Zpracovávám váš soubor...'
          : 'Přetáhněte dokument sem nebo klikněte pro výběr'
        }
      </p>
      
      {!isUploading && (
        <button className="upload-button" disabled={isUploading}>
          {isUploading ? 'Nahrávání...' : 'Vybrat soubor'}
        </button>
      )}
      
      {error && (
        <div className="error">
          {error}
        </div>
      )}
      
      <div className="upload-info">
        <small>
          • Podporované formáty: .txt, .pages, .docx, .pdf, .rtf, .xlsx, .xls, .csv, .md<br/>
          • Maximální velikost: 10MB (přibližně 100 stran)<br/>
          • Podporované jazyky: čeština, angličtina<br/>
          • Automatická konverze všech formátů na text
        </small>
      </div>
    </div>
  );
}