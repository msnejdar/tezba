# Technická architektura - Inteligentní vyhledávač

## 🏗️ Celková architektura

### Frontend (React.js)
- **Framework:** React 18 s hooks
- **Styling:** CSS Modules + CSS-in-JS pro glassmorphism
- **State Management:** React Context API
- **Build Tool:** Create React App (CRA)
- **Layout:** 40/60 split-screen design

### Backend (Node.js/Express)
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Session Management:** express-session (in-memory store)
- **File Upload:** Multer middleware
- **Security:** Helmet, CORS
- **API Integration:** Anthropic Claude SDK

### Claude API Strategy
- **Model:** Claude-3.5-sonnet (optimální pro český text)
- **Prompt Engineering:** Specializované prompty pro různé typy vyhledávání
- **Rate Limiting:** Implementováno na backend úrovni
- **Error Handling:** Retry mechanismus s exponential backoff

## 📡 API Endpoints

### Backend Routes
```
POST /api/upload          - Nahrání textového souboru
POST /api/search          - Vyhledávání pomocí Claude API
GET  /api/session/status  - Status aktuální session
DELETE /api/session/clear - Vyčištění session dat
```

### Data Flow
1. Frontend → Nahrání souboru → Backend (multer)
2. Backend → Uložení do session memory
3. Frontend → Vyhledávací dotaz → Backend
4. Backend → Claude API prompt → Anthropic
5. Anthropic → Strukturovaná odpověď → Backend
6. Backend → Formátované výsledky → Frontend
7. Frontend → Zobrazení s highlighting

## 🔒 Bezpečnostní model

### Session-Only Data
- Veškerá data pouze v express-session
- Žádné soubory na disku
- Automatické mazání po timeout (30 min)
- Memory-based storage bez persistance

### GDPR Compliance
- Žádné ukládání osobních dat
- Session expiry management
- Clear session endpoint
- No tracking/analytics

## 🎨 Claude API Prompt Strategy

### Optimalizované prompty pro:
1. **Rodná čísla** - různé formáty s/bez lomítka
2. **Jména osob** - různé pořadí, tituly
3. **Telefonní čísla** - české i mezinárodní formáty
4. **Smlouvy/dokumenty** - datum, číslo, reference
5. **Obecné vyhledávání** - fuzzy matching

### Prompt Template
```
Úkol: Najdi všechny výskyty "{search_query}" v následujícím textu.

Požadavky:
- Vrať pouze 100% přesné nálezy
- Zahrň různé formáty a varianty
- Pro každý nález uveď: pozici, kontext (50 znaků před/po)
- Odpověz ve formátu JSON

Text: {document_content}
```

## 🎯 Performance Strategy

### Optimalizace
- Chunking velkých dokumentů (max 4000 tokenů/chunk)
- Parallel processing pro více chunks
- Frontend lazy loading
- Debounced search input
- Caching Claude responses v session

### Scalability
- Horizontální škálování přes load balancer
- Session store migrace na Redis pro produkci
- Claude API rate limiting management
- Memory management pro velké soubory