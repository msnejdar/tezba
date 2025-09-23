const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const yauzl = require('yauzl');
const xlsx = require('xlsx');
const iconv = require('iconv-lite');
const jschardet = require('jschardet');
const { convertPagesToText } = require('./pagesConverter');

/**
 * Utility funkce pro detekci a dekódování textu
 */
function detectAndDecodeText(buffer) {
  try {
    const detected = jschardet.detect(buffer);
    const encoding = detected.encoding || 'utf-8';
    
    console.log(`Detekované kódování: ${encoding} (confidence: ${detected.confidence})`);
    
    if (encoding.toLowerCase().includes('windows-1250') || 
        encoding.toLowerCase().includes('cp1250')) {
      return iconv.decode(buffer, 'cp1250');
    } else if (encoding.toLowerCase().includes('iso-8859-2')) {
      return iconv.decode(buffer, 'iso-8859-2');
    } else {
      return iconv.decode(buffer, 'utf-8');
    }
  } catch (error) {
    console.error('Chyba při dekódování textu:', error);
    return buffer.toString('utf-8');
  }
}

/**
 * Parser pro Microsoft Word dokumenty (.docx)
 */
async function parseDocx(buffer) {
  try {
    console.log('📄 Zpracovávám DOCX soubor...');
    
    const result = await mammoth.extractRawText({ buffer });
    
    if (!result.text || result.text.trim().length === 0) {
      throw new Error('Dokument neobsahuje žádný čitelný text');
    }
    
    console.log(`✅ Extrahováno ${result.text.length} znaků z DOCX`);
    
    return {
      success: true,
      text: result.text.trim(),
      metadata: {
        format: 'docx',
        length: result.text.length
      }
    };
  } catch (error) {
    console.error('Chyba při zpracování DOCX:', error);
    return {
      success: false,
      error: `Chyba při čtení DOCX souboru: ${error.message}`,
      text: null
    };
  }
}

/**
 * Parser pro PDF dokumenty (.pdf)
 */
async function parsePdf(buffer) {
  try {
    console.log('📄 Zpracovávám PDF soubor...');
    
    const data = await pdf(buffer, {
      // Optimalizace pro rychlejší zpracování
      max: 0, // neomezeně stran
      version: 'v1.10.100'
    });
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF neobsahuje žádný extraktovatelný text nebo je šifrovaný');
    }
    
    // Čištění textu od nadbytečných mezer a zalomení
    const cleanText = data.text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
    
    console.log(`✅ Extrahováno ${cleanText.length} znaků z PDF (${data.numpages} stran)`);
    
    return {
      success: true,
      text: cleanText,
      metadata: {
        format: 'pdf',
        pages: data.numpages,
        length: cleanText.length,
        info: data.info
      }
    };
  } catch (error) {
    console.error('Chyba při zpracování PDF:', error);
    return {
      success: false,
      error: `Chyba při čtení PDF souboru: ${error.message}`,
      text: null
    };
  }
}

/**
 * Parser pro RTF dokumenty (.rtf)
 */
async function parseRtf(buffer) {
  try {
    console.log('📄 Zpracovávám RTF soubor...');
    
    // RTF je textový formát, nejprve dekódujeme
    const rtfContent = detectAndDecodeText(buffer);
    
    // Jednoduchý RTF parser pomocí regex
    let text = rtfContent;
    
    // Odstraníme RTF control codes
    text = text.replace(/\\[a-z]+\d*\s?/gi, ' '); // RTF control words
    text = text.replace(/\{[^{}]*\}/g, ''); // RTF groups
    text = text.replace(/\\'/g, "'"); // Escaped quotes
    text = text.replace(/\\"/g, '"'); // Escaped quotes
    text = text.replace(/\\\\/g, '\\'); // Escaped backslashes
    text = text.replace(/\s+/g, ' '); // Multiple spaces
    text = text.trim();
    
    if (!text || text.length === 0) {
      throw new Error('RTF soubor neobsahuje žádný čitelný text');
    }
    
    console.log(`✅ Extrahováno ${text.length} znaků z RTF`);
    
    return {
      success: true,
      text: text,
      metadata: {
        format: 'rtf',
        length: text.length
      }
    };
  } catch (error) {
    console.error('Chyba při zpracování RTF:', error);
    
    return {
      success: false,
      error: `Chyba při čtení RTF souboru: ${error.message}`,
      text: null
    };
  }
}

/**
 * Parser pro Excel soubory (.xlsx, .xls)
 */
async function parseExcel(buffer) {
  try {
    console.log('📊 Zpracovávám Excel soubor...');
    
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    let allText = '';
    
    // Projdeme všechny worksheety
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetText = xlsx.utils.sheet_to_txt(worksheet);
      
      if (sheetText.trim().length > 0) {
        allText += `\n=== ${sheetName} ===\n${sheetText}\n`;
      }
    });
    
    if (!allText || allText.trim().length === 0) {
      throw new Error('Excel soubor neobsahuje žádný čitelný text');
    }
    
    console.log(`✅ Extrahováno ${allText.length} znaků z Excel (${workbook.SheetNames.length} listů)`);
    
    return {
      success: true,
      text: allText.trim(),
      metadata: {
        format: 'excel',
        sheets: workbook.SheetNames,
        length: allText.length
      }
    };
  } catch (error) {
    console.error('Chyba při zpracování Excel:', error);
    return {
      success: false,
      error: `Chyba při čtení Excel souboru: ${error.message}`,
      text: null
    };
  }
}

/**
 * Parser pro CSV soubory (.csv)
 */
async function parseCsv(buffer) {
  try {
    console.log('📊 Zpracovávám CSV soubor...');
    
    const csvContent = detectAndDecodeText(buffer);
    
    if (!csvContent || csvContent.trim().length === 0) {
      throw new Error('CSV soubor je prázdný');
    }
    
    // Jednoduchá konverze CSV na čitelný text
    const lines = csvContent.split('\n');
    const textOutput = lines
      .filter(line => line.trim().length > 0)
      .map((line, index) => {
        const columns = line.split(',');
        if (index === 0) {
          return `Záhlaví: ${columns.join(' | ')}`;
        } else {
          return `Řádek ${index}: ${columns.join(' | ')}`;
        }
      })
      .join('\n');
    
    console.log(`✅ Extrahováno ${textOutput.length} znaků z CSV (${lines.length} řádků)`);
    
    return {
      success: true,
      text: textOutput,
      metadata: {
        format: 'csv',
        rows: lines.length,
        length: textOutput.length
      }
    };
  } catch (error) {
    console.error('Chyba při zpracování CSV:', error);
    return {
      success: false,
      error: `Chyba při čtení CSV souboru: ${error.message}`,
      text: null
    };
  }
}

/**
 * Parser pro Markdown soubory (.md)
 */
async function parseMarkdown(buffer) {
  try {
    console.log('📝 Zpracovávám Markdown soubor...');
    
    const text = detectAndDecodeText(buffer);
    
    if (!text || text.trim().length === 0) {
      throw new Error('Markdown soubor je prázdný');
    }
    
    // Jednoduché čištění Markdown syntaxe pro lepší čitelnost
    const cleanText = text
      .replace(/^#{1,6}\s+/gm, '') // odstranění nadpisů #
      .replace(/\*\*(.*?)\*\*/g, '$1') // tučný text
      .replace(/\*(.*?)\*/g, '$1') // kurzíva
      .replace(/`(.*?)`/g, '$1') // inline kód
      .replace(/```[\s\S]*?```/g, '[KÓD]') // blokový kód
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // odkazy
      .trim();
    
    console.log(`✅ Zpracován Markdown (${cleanText.length} znaků)`);
    
    return {
      success: true,
      text: cleanText,
      metadata: {
        format: 'markdown',
        length: cleanText.length
      }
    };
  } catch (error) {
    console.error('Chyba při zpracování Markdown:', error);
    return {
      success: false,
      error: `Chyba při čtení Markdown souboru: ${error.message}`,
      text: null
    };
  }
}

/**
 * Parser pro obyčejné textové soubory (.txt)
 */
async function parseText(buffer) {
  try {
    console.log('📄 Zpracovávám textový soubor...');
    
    const text = detectAndDecodeText(buffer);
    
    if (!text || text.trim().length === 0) {
      throw new Error('Textový soubor je prázdný');
    }
    
    console.log(`✅ Načten textový soubor (${text.length} znaků)`);
    
    return {
      success: true,
      text: text.trim(),
      metadata: {
        format: 'text',
        length: text.length
      }
    };
  } catch (error) {
    console.error('Chyba při zpracování textového souboru:', error);
    return {
      success: false,
      error: `Chyba při čtení textového souboru: ${error.message}`,
      text: null
    };
  }
}

/**
 * Hlavní funkce pro detekci a parsování různých formátů dokumentů
 */
async function parseDocument(buffer, fileName, mimeType) {
  const fileExt = fileName.toLowerCase().split('.').pop();
  
  console.log(`🔍 Zpracovávám soubor: ${fileName} (${fileExt}, ${mimeType})`);
  
  try {
    // Podle přípony souboru volíme příslušný parser
    switch (fileExt) {
      case 'docx':
        return await parseDocx(buffer);
      
      case 'pdf':
        return await parsePdf(buffer);
        
      case 'pages':
        console.log('🍎 Zpracovávám Apple Pages soubor...');
        return await convertPagesToText(buffer);
      
      case 'rtf':
        return await parseRtf(buffer);
      
      case 'xlsx':
      case 'xls':
        return await parseExcel(buffer);
      
      case 'csv':
        return await parseCsv(buffer);
      
      case 'md':
      case 'markdown':
        return await parseMarkdown(buffer);
      
      case 'txt':
      case 'text':
        return await parseText(buffer);
      
      default:
        // Fallback na textový parser pro neznámé formáty
        console.log(`⚠️ Neznámý formát ${fileExt}, zkouším textový parser`);
        return await parseText(buffer);
    }
  } catch (error) {
    console.error(`Chyba při zpracování souboru ${fileName}:`, error);
    
    // Poslední pokus - fallback na prostý text
    try {
      console.log('🔄 Zkouším fallback na prostý text...');
      return await parseText(buffer);
    } catch (fallbackError) {
      return {
        success: false,
        error: `Nelze zpracovat soubor: ${error.message}`,
        text: null
      };
    }
  }
}

/**
 * Detekce podporovaných formátů podle MIME typu a přípony
 */
function getSupportedFormats() {
  return {
    extensions: ['.txt', '.pages', '.docx', '.pdf', '.rtf', '.xlsx', '.xls', '.csv', '.md', '.markdown'],
    mimeTypes: [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/pdf',
      'application/rtf',
      'text/rtf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
      'text/markdown',
      'application/octet-stream' // pro .pages a další
    ]
  };
}

module.exports = {
  parseDocument,
  parseDocx,
  parsePdf,
  parseRtf,
  parseExcel,
  parseCsv,
  parseMarkdown,
  parseText,
  getSupportedFormats,
  detectAndDecodeText
};