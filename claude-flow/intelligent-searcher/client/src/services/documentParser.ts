import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

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

  // Parse Apple Pages files (basic extraction)
  static async parsePages(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Pages files contain a preview.pdf usually
      let extractedText = '';
      
      // Try to extract text from preview.pdf if available
      const previewPdf = zip.file('preview.pdf');
      if (previewPdf) {
        // For now, we can't easily extract text from PDF in browser
        extractedText += '[Soubor Pages obsahuje PDF náhled - plný text není dostupný]\n\n';
      }
      
      // Try to find text in index.xml or other XML files
      const indexXml = zip.file('index.xml');
      if (indexXml) {
        const xmlContent = await indexXml.async('string');
        // Extract text content from XML (basic approach)
        const textMatches = xmlContent.match(/>([^<]+)</g);
        if (textMatches) {
          const xmlText = textMatches
            .map(match => match.slice(1, -1).trim())
            .filter(text => text.length > 2 && !text.match(/^[0-9.]+$/))
            .join(' ');
          extractedText += xmlText;
        }
      }
      
      // If no text found, try other XML files
      if (!extractedText.trim()) {
        const xmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.xml'));
        for (const xmlFile of xmlFiles) {
          try {
            const file = zip.file(xmlFile);
            if (file) {
              const content = await file.async('string');
              const textMatches = content.match(/>([^<]+)</g);
              if (textMatches) {
                const text = textMatches
                  .map(match => match.slice(1, -1).trim())
                  .filter(text => text.length > 3)
                  .join(' ');
                if (text.length > extractedText.length) {
                  extractedText = text;
                }
              }
            }
          } catch (err) {
            // Ignore errors for individual files
            continue;
          }
        }
      }
      
      if (!extractedText.trim()) {
        throw new Error('Nepodařilo se extrahovat text z Pages souboru. Zkuste soubor exportovat jako DOCX nebo TXT.');
      }
      
      return extractedText;
    } catch (error) {
      console.error('Error parsing Pages:', error);
      if (error instanceof Error && error.message.includes('Nepodařilo se extrahovat')) {
        throw error;
      }
      throw new Error('Nepodařilo se načíst Pages soubor. Zkuste soubor exportovat jako DOCX nebo TXT.');
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
        return await this.parsePages(file);
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