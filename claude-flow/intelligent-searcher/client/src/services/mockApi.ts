import { TikaApiService } from './tikaApi';

// Mock API service for when backend is not available
export const mockApi = {
  upload: async (file: File) => {
    try {
      // Use only Tika API for file processing
      if (TikaApiService.isAvailable()) {
        console.log('Using Tika API for file processing');
        const tikaResult = await TikaApiService.extractText(file);
        
        if (tikaResult.success && tikaResult.extractedText) {
          return {
            success: true,
            fileContent: tikaResult.extractedText,
            fileName: file.name,
            fileSize: file.size,
            metadata: tikaResult.metadata
          };
        } else {
          throw new Error(tikaResult.error || 'Apache Tika nedokázal zpracovat soubor');
        }
      } else {
        // Tika API is not available
        throw new Error(`Apache Tika služba není dostupná. 

Pro zpracování dokumentů je potřeba Apache Tika, která podporuje všechny formáty souborů včetně .pages, .docx, .pdf, .xlsx a dalších.

Možná řešení:
• Zkuste aplikaci znovu za chvíli
• Zkontrolujte internetové připojení
• Exportujte soubor do textového formátu (.txt)

Podporované formáty: .txt, .docx, .pdf, .pages, .xlsx, .pptx, .odt, .rtf a 1000+ dalších.`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },

  search: async (query: string, fileContent: string) => {
    // Simple mock search implementation
    interface SearchResult {
      match: string;
      context: string;
      position: number;
      confidence: number;
      type: string;
    }
    
    const results: SearchResult[] = [];
    const lines = fileContent.split('\n');
    
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          match: query,
          context: line,
          position: index,
          confidence: 0.8,
          type: 'exact'
        });
      }
    });

    return {
      success: true,
      results: results.slice(0, 10) // Return max 10 results
    };
  },

  clearSession: async () => {
    return { success: true };
  }
};

// Check if API is available
export const isApiAvailable = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  // In production on Vercel, we don't have backend API
  if (window.location.hostname.includes('vercel.app')) {
    return false;
  }
  
  try {
    const response = await fetch('/api/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(1000) // 1 second timeout
    }).catch(() => null);
    
    return response?.ok ?? false;
  } catch {
    return false;
  }
};