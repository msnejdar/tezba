import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Document parser service for various file formats
export class DocumentParser {
  
  // Parse DOCX files
  static async parseDocx(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Error parsing DOCX:', error);
      throw new Error('Nepodařilo se načíst DOCX soubor');
    }
  }

  // Parse PDF files (simplified - for complex PDFs use server-side processing)
  static async parsePdf(file: File): Promise<string> {
    try {
      // For now, return a message that PDF needs server processing
      // In production, you'd use pdf.js or server-side extraction
      console.warn('PDF parsing requires server-side processing for best results');
      return 'PDF soubory vyžadují serverové zpracování pro nejlepší výsledky. Prosím použijte textové soubory nebo DOCX.';
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Nepodařilo se načíst PDF soubor');
    }
  }

  // Parse Excel files
  static async parseExcel(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      let text = '';
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        // Convert to CSV format for text search
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        text += `\n=== List: ${sheetName} ===\n${csv}\n`;
      });
      
      return text;
    } catch (error) {
      console.error('Error parsing Excel:', error);
      throw new Error('Nepodařilo se načíst Excel soubor');
    }
  }

  // Parse RTF files (basic extraction)
  static async parseRtf(file: File): Promise<string> {
    try {
      const text = await file.text();
      // Basic RTF to text conversion (removes most RTF formatting)
      const plainText = text
        .replace(/\\par[\s]?/g, '\n')
        .replace(/\\tab/g, '\t')
        .replace(/\\'[0-9a-fA-F]{2}/g, '') // Remove hex codes
        .replace(/\\[a-z]+\d*\s?/gi, '') // Remove RTF commands
        .replace(/[{}]/g, '') // Remove braces
        .trim();
      
      return plainText;
    } catch (error) {
      console.error('Error parsing RTF:', error);
      throw new Error('Nepodařilo se načíst RTF soubor');
    }
  }

  // Parse Markdown files
  static async parseMarkdown(file: File): Promise<string> {
    try {
      return await file.text();
    } catch (error) {
      console.error('Error parsing Markdown:', error);
      throw new Error('Nepodařilo se načíst Markdown soubor');
    }
  }

  // Parse CSV files
  static async parseCsv(file: File): Promise<string> {
    try {
      return await file.text();
    } catch (error) {
      console.error('Error parsing CSV:', error);
      throw new Error('Nepodařilo se načíst CSV soubor');
    }
  }

  // Main parsing function
  static async parseFile(file: File): Promise<string> {
    const fileName = file.name.toLowerCase();
    
    try {
      if (fileName.endsWith('.docx')) {
        return await this.parseDocx(file);
      } else if (fileName.endsWith('.pdf')) {
        return await this.parsePdf(file);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        return await this.parseExcel(file);
      } else if (fileName.endsWith('.rtf')) {
        return await this.parseRtf(file);
      } else if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
        return await this.parseMarkdown(file);
      } else if (fileName.endsWith('.csv')) {
        return await this.parseCsv(file);
      } else if (fileName.endsWith('.txt')) {
        return await file.text();
      } else if (fileName.endsWith('.pages')) {
        // Pages format is proprietary Apple format
        throw new Error('Formát .pages vyžaduje konverzi na jiný formát (např. DOCX nebo TXT)');
      } else {
        // Try to read as text for unknown formats
        return await file.text();
      }
    } catch (error) {
      console.error(`Error parsing ${fileName}:`, error);
      if (error instanceof Error && error.message.includes('vyžaduje')) {
        throw error;
      }
      throw new Error(`Nepodařilo se načíst soubor: ${fileName}`);
    }
  }
}