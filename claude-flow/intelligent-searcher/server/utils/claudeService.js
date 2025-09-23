const Anthropic = require('@anthropic-ai/sdk');

// Inicializace Claude API klienta – klíč z ENV
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Konfigurace pro Claude API
const CLAUDE_CONFIG = {
  model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  max_tokens: 4000,
  temperature: 0.1, // Nízká teplota pro konzistentní výsledky
};

// Chunking velkých dokumentů (Claude má limit ~200k tokenů)
function chunkDocument(text, maxChunkSize = 15000) {
  const chunks = [];
  const sentences = text.split(/[.!?]+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    } else {
      currentChunk += sentence + '.';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Detekce typu vyhledávání pro optimální prompt
function detectSearchType(query) {
  const queryLower = query.toLowerCase();
  
  // Rodná čísla
  if (queryLower.includes('rodné číslo') || queryLower.includes('rodne cislo') || 
      queryLower.includes('rč') || /\d{6}\/?\d{4}/.test(query)) {
    return 'personal_id';
  }
  
  // Telefonní čísla
  if (queryLower.includes('telefon') || queryLower.includes('mobil') || 
      queryLower.includes('číslo') || /[\+]?[\d\s\-\(\)]{9,}/.test(query)) {
    return 'phone_number';
  }
  
  // Smlouvy a dokumenty
  if (queryLower.includes('smlouva') || queryLower.includes('dokument') || 
      queryLower.includes('číslo smlouvy') || queryLower.includes('reference')) {
    return 'contract_document';
  }
  
  // Jména osob
  if (queryLower.includes('jméno') || queryLower.includes('osoba') || 
      /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+ [A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+/.test(query)) {
    return 'person_name';
  }
  
  // Obecné vyhledávání
  return 'general';
}

// Specializované prompty pro různé typy vyhledávání
function createSearchPrompt(query, documentText, searchType) {
  const baseInstructions = `
Jsi odborný asistent pro vyhledávání v českých a anglických textech. 
Tvým úkolem je najít VŠECHNY relevantní výskyty zadaného dotazu v dokumentu.

KRITICKÉ POŽADAVKY:
- Vrať pouze 100% přesné a relevantní nálezy
- Žádné falešné pozitivy - raději méně nálezů, ale správných
- Zahrň různé formáty a varianty hledaného výrazu
- Pro každý nález poskytni přesný kontext (50-80 znaků před a po)
- Odpověz POUZE ve formátu JSON

Hledaný výraz: "${query}"
`;

  let specificInstructions = '';
  
  switch (searchType) {
    case 'personal_id':
      specificInstructions = `
SPECIFICKÉ INSTRUKCE PRO RODNÁ ČÍSLA:
- Hledej formáty: XXXXXX/XXXX, XXXXXX-XXXX, XXXXXXXXXX
- Zahrň varianty s lomítkem i bez lomítka
- Validuj české rodné číslo (6+4 cifry, možná lomítka/pomlčky)
- Rozpoznej také zmínky typu "rodné číslo:", "RČ:", "narození:"
`;
      break;
      
    case 'phone_number':
      specificInstructions = `
SPECIFICKÉ INSTRUKCE PRO TELEFONNÍ ČÍSLA:
- České formáty: +420 XXX XXX XXX, 420XXXXXXXXX, XXXXXXXXX
- Mezinárodní formáty: +XX XXX XXX XXX
- Varianty s pomlčkami, mezerami, závorkami
- Mobilní i pevné linky
- Zahrň zmínky typu "telefon:", "mobil:", "tel.:"
`;
      break;
      
    case 'contract_document':
      specificInstructions = `
SPECIFICKÉ INSTRUKCE PRO SMLOUVY/DOKUMENTY:
- Hledej čísla smluv, dokumentů, referenčních čísel
- Formáty: SM-2024-001, Smlouva č. 123/2024, DOC-XXXX
- Datumy ve formátech: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
- Zahrň zmínky typu "smlouva č.", "dokument č.", "ref.:"
`;
      break;
      
    case 'person_name':
      specificInstructions = `
SPECIFICKÉ INSTRUKCE PRO JMÉNA OSOB:
- Hledej celá jména i jejich části
- České i cizí jména s diakritikou
- Varianty: Jméno Příjmení, Příjmení Jméno
- Tituly před/za jménem: Ing., Ph.D., atd.
- Zahrň různé skloňování českých jmen
`;
      break;
      
    default:
      specificInstructions = `
SPECIFICKÉ INSTRUKCE PRO OBECNÉ VYHLEDÁVÁNÍ:
- Hledej přesné shody i podobné varianty
- Zahrň různé formáty psaní (velká/malá písmena)
- Rozpoznej synonyma a související výrazy
- Fuzzy matching pro překlepy a podobné tvary
`;
  }

  const outputFormat = `
FORMÁT ODPOVĚDI (JSON):
{
  "results": [
    {
      "match": "nalezený text",
      "context": "...kontext před...NALEZENÝ TEXT...kontext po...",
      "position": pozice_v_textu,
      "confidence": 0.95,
      "type": "typ_nálezu"
    }
  ],
  "summary": {
    "total_found": počet_nálezů,
    "search_type": "typ_vyhledávání",
    "confidence_avg": průměrná_jistota
  }
}
`;

  return `${baseInstructions}

${specificInstructions}

${outputFormat}

DOKUMENT K PROHLEDÁNÍ:
${documentText}

Nyní proveď vyhledávání a vrať výsledky v požadovaném JSON formátu.`;
}

// Hlavní funkce pro vyhledávání
async function searchInDocument(query, documentText) {
  try {
    console.log(`🔍 Spouštím vyhledávání pro: "${query}"`);
    console.log(`📄 Délka dokumentu: ${documentText.length} znaků`);
    
    const searchType = detectSearchType(query);
    console.log(`🎯 Detekovaný typ vyhledávání: ${searchType}`);
    
    // Pro velké dokumenty použijeme chunking
    const chunks = chunkDocument(documentText, 15000);
    console.log(`📝 Dokument rozdělen na ${chunks.length} částí`);
    
    let allResults = [];
    let positionOffset = 0;
    
    // Zpracování každého chunku
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`⚡ Zpracovávám část ${i + 1}/${chunks.length} (${chunk.length} znaků)`);
      
      const prompt = createSearchPrompt(query, chunk, searchType);
      
      try {
        const response = await anthropic.messages.create({
          ...CLAUDE_CONFIG,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });
        
        const responseText = response.content[0].text;
        console.log(`📥 Claude odpověď pro část ${i + 1}:`, responseText.substring(0, 200) + '...');
        
        // Parsing JSON odpovědi
        let parsedResponse;
        try {
          // Pokusíme se najít JSON v odpovědi
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[0]);
          } else {
            console.warn(`⚠️ Žádný JSON nenalezen v odpovědi pro část ${i + 1}`);
            continue;
          }
        } catch (parseError) {
          console.error(`❌ Chyba při parsování JSON pro část ${i + 1}:`, parseError);
          console.log('Raw response:', responseText);
          continue;
        }
        
        // Přidání výsledků s úpravou pozice
        if (parsedResponse.results && Array.isArray(parsedResponse.results)) {
          const resultsWithOffset = parsedResponse.results.map(result => ({
            ...result,
            position: (result.position || 0) + positionOffset,
            chunkIndex: i + 1
          }));
          
          allResults = allResults.concat(resultsWithOffset);
          console.log(`✅ Přidáno ${resultsWithOffset.length} výsledků z části ${i + 1}`);
        }
        
        // Malá pauza mezi dotazy
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (chunkError) {
        console.error(`❌ Chyba při zpracování části ${i + 1}:`, chunkError);
        // Pokračujeme s dalším chunkem
      }
      
      positionOffset += chunk.length;
    }
    
    // Deduplikace a řazení výsledků
    const uniqueResults = removeDuplicates(allResults);
    const sortedResults = uniqueResults.sort((a, b) => (a.position || 0) - (b.position || 0));
    
    console.log(`🎉 Vyhledávání dokončeno: ${sortedResults.length} unikátních výsledků`);
    
    return sortedResults;
    
  } catch (error) {
    console.error('❌ Chyba při vyhledávání:', error);
    throw new Error(`Claude API error: ${error.message}`);
  }
}

// Odstranění duplikátů na základě podobnosti
function removeDuplicates(results) {
  const unique = [];
  
  for (const result of results) {
    const isDuplicate = unique.some(existing => {
      // Kontrola podobnosti na základě match textu a pozice
      const matchSimilarity = result.match && existing.match && 
        result.match.toLowerCase().trim() === existing.match.toLowerCase().trim();
      
      const positionSimilarity = Math.abs((result.position || 0) - (existing.position || 0)) < 50;
      
      return matchSimilarity || positionSimilarity;
    });
    
    if (!isDuplicate) {
      unique.push(result);
    }
  }
  
  return unique;
}

// Rate limiting a retry mechanismus
async function callClaudeWithRetry(prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        ...CLAUDE_CONFIG,
        messages: [{ role: 'user', content: prompt }]
      });
      
      return response;
      
    } catch (error) {
      console.error(`❌ Claude API pokus ${attempt}/${retries} selhal:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Čekám ${delay}ms před dalším pokusem...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  searchInDocument,
  detectSearchType,
  chunkDocument
};