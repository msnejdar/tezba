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
      console.log('Parsing Pages file:', file.name, 'Size:', file.size);
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      console.log('ZIP loaded successfully. Files found:', Object.keys(zip.files));
      
      let extractedText = '';
      let debugInfo = `=== Pages soubor: ${file.name} ===\n\n`;
      
      // List all files in the archive for debugging
      const allFiles = Object.keys(zip.files);
      console.log('All files in Pages archive:', allFiles);
      
      
      // Also search for any .xml files
      const xmlFiles = allFiles.filter(name => name.endsWith('.xml'));
      const iwaFiles = allFiles.filter(name => name.endsWith('.iwa'));
      
      console.log('XML files found:', xmlFiles);
      console.log('IWA files found:', iwaFiles);
      
      // Try to extract from XML files first
      for (const xmlFile of xmlFiles) {
        try {
          const file = zip.file(xmlFile);
          if (file) {
            console.log(`Processing XML file: ${xmlFile}`);
            const content = await file.async('string');
            
            // Look for text content in various XML patterns
            const patterns = [
              /<sf:p[^>]*>(.*?)<\/sf:p>/gs,
              /<sf:span[^>]*>(.*?)<\/sf:span>/gs,
              /<sf:text-body[^>]*>(.*?)<\/sf:text-body>/gs,
              />([^<]{4,})</g  // Any text content between tags longer than 3 chars
            ];
            
            for (const pattern of patterns) {
              const matches = content.match(pattern);
              if (matches) {
                const text = matches
                  .map(match => match.replace(/<[^>]*>/g, '').trim())
                  .filter(text => text.length > 3 && !text.match(/^[0-9.]+$/))
                  .join(' ');
                if (text.length > extractedText.length) {
                  extractedText = text;
                  console.log(`Found text in ${xmlFile}:`, text.substring(0, 100));
                }
              }
            }
          }
        } catch (err) {
          console.warn(`Error processing ${xmlFile}:`, err);
          continue;
        }
      }
      
      // If still no text, try IWA files (binary format, limited extraction)
      if (!extractedText.trim() && iwaFiles.length > 0) {
        console.log('Trying IWA files...');
        for (const iwaFile of iwaFiles.slice(0, 5)) { // Try first 5 IWA files
          try {
            const file = zip.file(iwaFile);
            if (file) {
              const content = await file.async('string');
              // Look for readable text in binary data (very basic)
              const readableText = content.match(/[a-zA-ZáéíóúýčďěňřšťžůĚŮÁÉÍÓÚÝČĎŇŘŠŤŽ\s]{10,}/g);
              if (readableText) {
                const text = readableText.join(' ').trim();
                if (text.length > extractedText.length) {
                  extractedText = text;
                  console.log(`Found text in ${iwaFile}:`, text.substring(0, 100));
                }
              }
            }
          } catch (err) {
            continue;
          }
        }
      }
      
      // If still no text, provide helpful information
      if (!extractedText.trim()) {
        debugInfo += `Soubor obsahuje ${allFiles.length} souborů:\n`;
        debugInfo += allFiles.slice(0, 10).join('\n') + '\n';
        if (allFiles.length > 10) {
          debugInfo += `... a dalších ${allFiles.length - 10} souborů\n`;
        }
        debugInfo += '\nPro nejlepší výsledky exportujte Pages soubor jako:\n';
        debugInfo += '• Soubor → Exportovat do → Word (.docx)\n';
        debugInfo += '• Soubor → Exportovat do → Prostý text (.txt)\n';
        
        return debugInfo;
      }
      
      // Clean up extracted text
      extractedText = extractedText
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
      
      console.log('Successfully extracted text, length:', extractedText.length);
      return extractedText;
      
    } catch (error) {
      console.error('Error parsing Pages:', error);
      
      // Provide more helpful error message
      if (error instanceof Error) {
        if (error.message.includes('Invalid or unsupported zip file')) {
          throw new Error('Soubor není platný Pages dokument. Zkontrolujte, že soubor není poškozený.');
        }
        if (error.message.includes('End of central directory record signature not found')) {
          throw new Error('Soubor se nepodařilo načíst jako ZIP archiv. Možná je poškozený nebo není ve formátu Pages.');
        }
      }
      
      throw new Error(`Nepodařilo se načíst Pages soubor "${file.name}". Zkuste soubor exportovat jako DOCX nebo TXT pro nejlepší kompatibilitu.`);
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