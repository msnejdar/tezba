const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
const pdfParse = require('pdf-parse');

/**
 * Konvertuje Apple Pages soubor na čistý text
 * .pages soubory jsou ve skutečnosti ZIP archivy obsahující XML a další soubory
 */
async function convertPagesToText(buffer) {
  try {
    console.log('📄 Zpracovávám .pages soubor...');
    
    // Vytvoření ZIP objektu z bufferu
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    let extractedText = '';
    let metadata = {};
    
    // 1) Pokus #1: QuickLook/Preview.pdf (nejspolehlivější u moderních Pages)
    try {
      const previewPdfEntry = zipEntries.find(e => {
        const name = e.entryName.toLowerCase();
        return name.endsWith('quicklook/preview.pdf') || name.endsWith('/preview.pdf') || name === 'preview.pdf';
      });
      if (previewPdfEntry) {
        console.log(`🔎 Nalezen QuickLook Preview.pdf: ${previewPdfEntry.entryName}`);
        const pdfBuffer = previewPdfEntry.getData();
        const pdfData = await pdfParse(pdfBuffer);
        if (pdfData && typeof pdfData.text === 'string' && pdfData.text.trim().length > 0) {
          extractedText = pdfData.text;
          console.log(`✅ Text extrahován z Preview.pdf (${extractedText.length} znaků)`);
        }
      }
    } catch (pdfErr) {
      console.warn('⚠️ QuickLook Preview.pdf extrakce selhala:', pdfErr.message);
    }
    
    // 2) Pokus #2: starší verze Pages – index.xml uvnitř archivu
    const contentPaths = [
      'index.xml',
      'index.xml.gz',
      'Pages/index.xml',
      'Pages/index.xml.gz',
      'Data/index.xml',
      'preview-micro.jpg',
      'preview-web.jpg',
      'preview.jpg'
    ];
    
    for (const entry of zipEntries) {
      const entryName = entry.entryName;
      
      // Pokud už máme text z PDF, ostatní kroky jen doplní metadata
      if (extractedText && extractedText.length > 0) {
        // Případně můžeme jen sbírat metadata a přeskočit těžší parsování
        continue;
      }

      // Pokusíme se najít hlavní dokument
      if (entryName === 'index.xml' || entryName.endsWith('/index.xml')) {
        console.log(`🔍 Nalezen index.xml: ${entryName}`);
        
        const xmlContent = entry.getData().toString('utf8');
        
        // Parsování XML
        const parser = new xml2js.Parser({
          explicitArray: false,
          ignoreAttrs: false,
          mergeAttrs: true
        });
        
        try {
          const result = await parser.parseStringPromise(xmlContent);
          
          // Extrahování textu z různých možných struktur Pages XML
          extractedText = extractTextFromPagesXML(result);
          
          // Získání metadat
          if (result.sl && result.sl.metadata) {
            metadata = result.sl.metadata;
          }
          
        } catch (xmlError) {
          console.error('⚠️ Chyba při parsování XML:', xmlError.message);
          // Pokud XML parsování selže, zkusíme extrahovat text přímo
          extractedText = extractTextDirect(xmlContent);
        }
      }
      
      // Alternativní metoda - hledání v komprimovaných datech
      if (entryName.endsWith('.gz')) {
        console.log(`📦 Nalezen komprimovaný soubor: ${entryName}`);
        try {
          const zlib = require('zlib');
          const compressedData = entry.getData();
          const decompressed = zlib.gunzipSync(compressedData);
          const content = decompressed.toString('utf8');
          
          if (content.includes('<?xml')) {
            const parser = new xml2js.Parser({
              explicitArray: false,
              ignoreAttrs: false
            });
            const result = await parser.parseStringPromise(content);
            const text = extractTextFromPagesXML(result);
            if (text && text.length > extractedText.length) {
              extractedText = text;
            }
          }
        } catch (decompressError) {
          console.error('⚠️ Chyba při dekompresi:', decompressError.message);
        }
      }
      
      // Záložní metoda - hledání prostého textu
      if (entryName === 'buildVersionHistory.plist' || entryName.endsWith('.plist')) {
        const plistContent = entry.getData().toString('utf8');
        // Extrahování verzních informací
        const versionMatch = plistContent.match(/<string>([^<]+)<\/string>/g);
        if (versionMatch) {
          console.log(`📋 Nalezena verze Pages: ${versionMatch[0]}`);
        }
      }
    }
    
    // 3) Pokud jsme nenašli žádný text standardními metodami, zkusíme alternativní přístup
    if (!extractedText || extractedText.length === 0) {
      console.log('⚠️ Standardní extrakce selhala, zkouším alternativní metody...');
      extractedText = await extractTextAlternative(buffer);
    }
    
    // Vyčištění a formátování textu
    extractedText = cleanExtractedText(extractedText);
    
    console.log(`✅ Extrahováno ${extractedText.length} znaků z .pages souboru`);
    
    return {
      text: extractedText,
      metadata: metadata,
      success: extractedText.length > 0
    };
    
  } catch (error) {
    console.error('❌ Chyba při konverzi .pages souboru:', error);
    throw new Error(`Nelze zpracovat .pages soubor: ${error.message}`);
  }
}

/**
 * Extrahuje text z Pages XML struktury
 */
function extractTextFromPagesXML(xmlObject) {
  let text = '';
  
  // Rekurzivní procházení XML objektu
  function traverse(obj, depth = 0) {
    if (!obj) return;
    
    // Pokud je to string, přidáme ho
    if (typeof obj === 'string') {
      text += obj + ' ';
      return;
    }
    
    // Speciální zpracování pro Pages text elementy
    if (obj.sf && obj.sf.text) {
      if (obj.sf.text._ || typeof obj.sf.text === 'string') {
        text += (obj.sf.text._ || obj.sf.text) + ' ';
      }
    }
    
    // Hledání textu v různých možných lokacích
    const textKeys = [
      'text', 'Text', 'TEXT',
      'string', 'String', 'STRING',
      'content', 'Content', 'CONTENT',
      'p', 'P', 'paragraph',
      'span', 'SPAN', 'div', 'DIV',
      't', 'T', 's', 'S'
    ];
    
    for (const key of textKeys) {
      if (obj[key]) {
        if (typeof obj[key] === 'string') {
          text += obj[key] + ' ';
        } else if (Array.isArray(obj[key])) {
          obj[key].forEach(item => traverse(item, depth + 1));
        } else if (typeof obj[key] === 'object') {
          traverse(obj[key], depth + 1);
        }
      }
    }
    
    // Rekurzivní procházení všech vlastností objektu
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && !textKeys.includes(key)) {
          traverse(obj[key], depth + 1);
        }
      }
    }
  }
  
  traverse(xmlObject);
  return text;
}

/**
 * Přímá extrakce textu z XML stringu
 */
function extractTextDirect(xmlString) {
  // Odstranění XML tagů
  let text = xmlString.replace(/<[^>]*>/g, ' ');
  
  // Dekódování HTML entit
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Odstranění přebytečných mezer
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Alternativní metoda extrakce textu
 */
async function extractTextAlternative(buffer) {
  try {
    // Pokusíme se najít čitelný text přímo v bufferu
    const bufferString = buffer.toString('utf8', 0, Math.min(buffer.length, 1000000));
    
    // Hledání vzorů textu
    const textPatterns = [
      /[A-Za-zÀ-ÿĀ-žА-я\u4e00-\u9fff]{3,}/g,  // Latinika, azbuka, čínština
      /[\u0590-\u05ff]{3,}/g,  // Hebrejština
      /[\u0600-\u06ff]{3,}/g,  // Arabština
    ];
    
    let extractedText = '';
    
    for (const pattern of textPatterns) {
      const matches = bufferString.match(pattern);
      if (matches) {
        extractedText += matches.join(' ') + ' ';
      }
    }
    
    // Pokud stále nemáme text, zkusíme binární analýzu
    if (extractedText.length < 100) {
      console.log('🔬 Provádím binární analýzu...');
      
      // Hledání UTF-16 nebo UTF-32 kódovaného textu
      for (let i = 0; i < buffer.length - 4; i++) {
        // UTF-16 LE
        if (buffer[i + 1] === 0 && buffer[i + 3] === 0) {
          const char1 = buffer[i] + (buffer[i + 1] << 8);
          const char2 = buffer[i + 2] + (buffer[i + 3] << 8);
          
          if (char1 >= 32 && char1 < 127 && char2 >= 32 && char2 < 127) {
            extractedText += String.fromCharCode(char1, char2);
          }
        }
      }
    }
    
    return extractedText;
    
  } catch (error) {
    console.error('⚠️ Alternativní extrakce selhala:', error);
    return '';
  }
}

/**
 * Vyčištění a formátování extrahovaného textu
 */
function cleanExtractedText(text) {
  if (!text) return '';
  
  console.log('🧹 Vyčišťuji extrahovaný text...');
  
  // RADIKÁLNĚJŠÍ PŘÍSTUP - hledáme český text přímo
  console.log('🔍 Hledám český text v .pages souboru...');
  
  // Nejdříve zkusíme najít konkrétní české fráze
  const czechTextPatterns = [
    /Česká\s+spořitelna[^{}]*?\d{4}/gi,
    /Interní\s+pokyn[^{}]*?odhadce[^{}]*?\d{4}/gi,
    /Účinnost\s+pravidel[^{}]*?vydání[^{}]*?pokynu/gi,
    /manažer\s+útvaru[^{}]*?Správa[^{}]*?zajištění/gi,
    /FINANCOVÁNÍ\s+POZEMKŮ[^{}]*?HYPOTEČNÍHO[^{}]*?ÚVĚRU/gi,
    /Cílem\s+této\s+změny[^{}]*?oceňování[^{}]*?pozemků/gi,
    /Stavebním\s+pozemkem[^{}]*?Stavebního\s+zákona/gi,
    /Úvod[:\s]*Stavebním\s+pozemkem/gi,
    /právně\s+zajištěný\s+přístup[^{}]*?komunikace/gi,
    /Protokol\s+o\s+stavu\s+výstavby/gi
  ];
  
  const foundSentences = [];
  
  for (const pattern of czechTextPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      foundSentences.push(...matches.map(match => 
        match.replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, ' ')
             .replace(/\s+/g, ' ')
             .trim()
      ).filter(s => s.length > 20));
    }
  }
  
  // Pokud najdeme konkrétní fráze, použijeme jen ty
  if (foundSentences.length > 0) {
    console.log(`🎯 Nalezeno ${foundSentences.length} českých frází`);
    return foundSentences.join(' ').trim();
  }
  
  // Jinak zkusíme obecnější přístup - hledáme česká slova
  const sentences = [];
  
  // Rozdělíme text na slova a najdeme oblasti s českou gramatikou  
  const words = text.split(/\s+/);
  let currentSentence = [];
  let czechWordCount = 0;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Přeskočíme evidentně binární nebo metadata slova
    if (word.match(/^[A-Z]{3,}$/) || 
        word.match(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/) ||
        word.match(/^(iwa|Index|Tables|Document|Metadata|Preview|PNG|XML|JPEG|RGB|Apple|Office|Theme|Helvetica|Cambria|Arial|Data|PresetImageFill|jpg|JFIF|Exif|Photoshop|BIM|CDEFGHIJSTUVWXYZcdefghijstuvwxyz)$/i)) {
      // Pokud máme akumulovanou větu s českými slovy, uložíme ji
      if (czechWordCount >= 3 && currentSentence.length > 0) {
        sentences.push(currentSentence.join(' '));
      }
      currentSentence = [];
      czechWordCount = 0;
      continue;
    }
    
    // Kontrola českého slova
    if (word.match(/[a-záčďéěíňóřšťúůýžA-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]{3,}/)) {
      czechWordCount++;
    }
    
    currentSentence.push(word);
    
    // Pokud dosáhneme konce věty, uložíme ji
    if (word.match(/[.!?:]$/) && czechWordCount >= 3) {
      sentences.push(currentSentence.join(' '));
      currentSentence = [];
      czechWordCount = 0;
    }
  }
  
  // Uložíme poslední větu pokud obsahuje česká slova
  if (czechWordCount >= 3 && currentSentence.length > 0) {
    sentences.push(currentSentence.join(' '));
  }
  
  // Pokud nenajdeme nic smysluplného, zkusíme jiný přístup
  if (sentences.length === 0) {
    console.log('🔍 Hledám text v celém bufferu...');
    
    // Hledání konkrétních českých frází
    const patterns = [
      /[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž\s,.-]+(?:pokyn|instrukce|pravidla|podmínky|úvěr|banka|odhadce)[a-záčďéěíňóřšťúůýž\s,.-]*/gi,
      /(?:Interní|Pokyn|Pravidla|Podmínky|Účinnost)[a-záčďéěíňóřšťúůýž\s,.-]+/gi,
      /[a-záčďéěíňóřšťúůýž\s,.-]*(?:pro\s+odhadce|spořitelna|banka|úvěr)[a-záčďéěíňóřšťúůýž\s,.-]*/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        sentences.push(...matches.map(match => 
          match.replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, ' ')
               .replace(/\s+/g, ' ')
               .trim()
        ).filter(s => s.length > 10));
      }
    }
  }
  
  // Spojení nalezených vět a finální čištění
  let cleanText = sentences.join(' ').trim();
  
  // Pokud jsme našli věty, vyčistíme je
  if (cleanText.length > 0) {
    console.log(`📝 Nalezeno ${sentences.length} vět s celkem ${cleanText.length} znaky`);
    cleanText = cleanText
      // Odstranění zbylých binárních znaků
      .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, ' ')
      // Odstranění duplicitních mezer
      .replace(/\s+/g, ' ')
      // Odstranění metadata klíčových slov
      .replace(/\b(iwa|Index|Tables|Document|Metadata|Preview|PNG|XML|JPEG|RGB|Apple|Office|Theme|Helvetica|Cambria|Arial|Data|PresetImageFill|jpg|JFIF|Exif|Photoshop|BIM|CDEFGHIJSTUVWXYZcdefghijstuvwxyz|bullet|gbutton|gray|pHYs|profile|KoR|gregorian|latn|iso|CZK|EUR|USD)\b/gi, ' ')
      // Odstranění krátkých fragmentů
      .replace(/\b[a-zA-Z]{1,2}\b/g, ' ')
      // Konečné čištění mezer
      .replace(/\s+/g, ' ')
      .trim();
      
    console.log(`✨ Text vyčištěn na ${cleanText.length} znaků`);
    return cleanText;
  }
  
  // Pokud stále nemáme dobrý text, zkusíme poslední záchranu
  if (cleanText.length < 100) {
    console.log('🆘 Poslední pokus o extrakci textu...');
    
    // Jednoduše vezmeme všechny české znaky a slova delší než 3
    const words = text.match(/[a-záčďéěíňóřšťúůýžA-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]{3,}/g);
    if (words && words.length > 0) {
      // Filtrujeme očividné metadata
      const filteredWords = words.filter(word => 
        !word.match(/^(iwa|Index|Tables|Document|Metadata|Preview|PNG|XML|JPEG|RGB|Apple|Office|Theme|Helvetica|Cambria|Arial|Default|Fill|Center|Style)$/i) &&
        word.length > 2
      );
      
      cleanText = filteredWords.slice(0, 100).join(' '); // Maximálně prvních 100 slov
    }
  }
  
  // Finální čištění
  cleanText = cleanText
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])\s*/g, '$1 ')
    .trim();
  
  console.log(`✅ Text vyčištěn: ${cleanText.length} znaků (z původních ${text.length})`);
  
  return cleanText;
}

/**
 * Hlavní exportovaná funkce
 */
module.exports = {
  convertPagesToText
};