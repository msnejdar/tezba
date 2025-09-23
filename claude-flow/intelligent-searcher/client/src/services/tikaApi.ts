// Tika API service for document text extraction using Python serverless function
export class TikaApiService {
  
  // Check if Tika API is available (only in production on Vercel)
  static isAvailable(): boolean {
    // Tika API is available in production on Vercel
    return typeof window !== 'undefined' && 
           (window.location.hostname.includes('vercel.app') || 
            window.location.hostname === 'localhost');
  }

  // Extract text from file using Tika API
  static async extractText(file: File): Promise<{
    success: boolean;
    extractedText?: string;
    filename?: string;
    metadata?: any;
    error?: string;
  }> {
    try {
      // Convert file to base64
      const fileData = await this.fileToBase64(file);
      
      // Call Tika API
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: fileData,
          filename: file.name
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'API request failed');
      }
      
      return result;
      
    } catch (error) {
      console.error('Tika API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Neočekávaná chyba při zpracování souboru'
      };
    }
  }

  // Convert file to base64 string
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:mime/type;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Test Tika API availability
  static async testConnection(): Promise<boolean> {
    try {
      // Create a small test file
      const testText = 'test';
      const testFile = new Blob([testText], { type: 'text/plain' });
      const file = new File([testFile], 'test.txt', { type: 'text/plain' });
      
      const result = await this.extractText(file);
      return result.success;
    } catch {
      return false;
    }
  }
}