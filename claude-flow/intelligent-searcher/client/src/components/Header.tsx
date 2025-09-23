import React from 'react';

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

interface HeaderProps {
  onClearSession: () => void;
  uploadedFile: UploadedFile | null;
}

export function Header({ onClearSession, uploadedFile }: HeaderProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const estimatePages = (textLength: number): number => {
    return Math.ceil(textLength / 2500); // ~2500 znaků na stránku
  };

  return (
    <header className="header">
      <div className="header-title">
        🔍 Inteligentní vyhledávač
      </div>
      
      <div className="header-status">
        {uploadedFile ? (
          <>
            <div className="status-indicator"></div>
            <span>
              {uploadedFile.name} • {formatFileSize(uploadedFile.size)} • ~{estimatePages(uploadedFile.content.length)} stran
            </span>
            <button 
              onClick={onClearSession}
              className="clear-session-btn"
              title="Vymazat session a začít znovu"
            >
              🗑️ Vymazat
            </button>
          </>
        ) : (
          <span>Žádný soubor není nahrán</span>
        )}
      </div>
    </header>
  );
}