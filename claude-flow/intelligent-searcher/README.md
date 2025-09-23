# 🔍 Inteligentní vyhledávač v textových dokumentech

Webová aplikace pro inteligentní vyhledávání specifických informací v textových souborech pomocí Claude API s pokročilým liquid glass designem inspirovaným Porsche estetikou.

## 🚀 Rychlý start

### Požadavky
- Node.js 18+ (LTS doporučeno)
- npm 9+ nebo yarn

### Instalace

1. **Naklonování a instalace závislostí:**
```bash
git clone <repository-url>
cd intelligent-searcher
npm run install:all
```

2. **Konfigurace:**
```bash
# Vytvořte .env v kořeni projektu a nastavte klíč:
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

3. **Spuštění v development módu:**
```bash
npm run dev
```

4. **Přístup k aplikaci:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🏗️ Architektura

### Frontend (React + TypeScript)
- **Framework:** React 18 s TypeScript
- **Styling:** CSS Modules s liquid glass efekty
- **State Management:** React Context API
- **Design:** 40/60 split-screen layout s Porsche color scheme

### Backend (Node.js + Express)
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Session:** In-memory store (express-session)
- **AI Integration:** Claude API (Anthropic)
- **Security:** Helmet, CORS, session-only data

## 🎨 Design Features

### Liquid Glass × Porsche Design
- **Glassmorphism efekty** s blur a transparency
- **Porsche color palette** - černá, šedá, stříbrná s oranžovými akcenty
- **Premium animace** a smooth transitions
- **Responzivní design** pro desktop i mobile

### UI Komponenty
- Drag & drop file upload panel
- Real-time search s AI-powered výsledky
- Interactive document viewer s highlighting
- Split-screen layout (40% search / 60% document)

## 🤖 Claude API Integration

### Pokročilé prompt engineering
- **Specializované prompty** pro různé typy vyhledávání
- **Fuzzy matching** pro rodná čísla, telefony, jména
- **Chunk processing** pro velké dokumenty (100+ stran)
- **High accuracy** s minimálními false positive

### Podporované vyhledávání
- 🆔 **Rodná čísla** - různé formáty (s/bez lomítka)
- 📞 **Telefonní čísla** - české i mezinárodní formáty  
- 👤 **Jména osob** - různé pořadí, tituly, skloňování
- 📄 **Dokumenty/smlouvy** - čísla, reference, datumy
- 🔍 **Obecné vyhledávání** - fuzzy matching

## 🔒 Bezpečnost & GDPR

### Session-only data policy
- Veškerá data pouze v session memory
- Žádné soubory na disku
- Automatické mazání po 30 minutách
- Žádné tracking nebo analytics

### Security features
- Helmet.js security headers
- CORS konfigurace
- Input validation a sanitization
- Rate limiting na API endpoints

## 📊 API Endpoints

```
POST /api/upload          - Nahrání .txt souboru
POST /api/search          - Vyhledávání pomocí Claude API
GET  /api/session/status  - Status aktuální session
DELETE /api/session/clear - Vyčištění session dat
GET  /api/health          - Health check
```

## 🧪 Testování

### Test data
```bash
# Testovací dokumenty jsou v test-data/
- test-document-czech.txt    # České testovací data
- test-document-english.txt  # Anglické testovací data
```

### Manuální testing
1. Nahrajte testovací soubor
2. Zkuste různé vyhledávací dotazy:
   - "rodné číslo" 
   - "Jan Novák"
   - "telefon"
   - "smlouva 2024"

## 🚀 Deployment

### Development
```bash
npm run dev  # Spustí frontend i backend současně
```

### Production build
```bash
npm run build        # Build React aplikace
npm start           # Spustí production server
```

### Docker (volitelné)
```bash
docker build -t intelligent-searcher .
docker run -p 5000:5000 intelligent-searcher
```

## 📈 Performance

### Optimalizace
- Chunk processing pro velké dokumenty
- Debounced search input
- Lazy loading komponent
- Optimalizované Claude API calls

### Limity
- Maximální velikost souboru: 10MB (~100 stran)
- Session timeout: 30 minut
- Podporované formáty: pouze .txt
- Jazyky: čeština, angličtina

## 🛠️ Development

### Struktura projektu
```
intelligent-searcher/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React komponenty
│   │   ├── contexts/       # Context API
│   │   ├── styles/         # CSS styly
│   │   └── utils/          # Utility funkce
├── server/                 # Node.js backend
│   ├── routes/             # API routes
│   ├── utils/              # Server utilities
│   └── server.js           # Main server file
├── test-data/              # Testovací dokumenty
└── README.md
```

### Scripts
```bash
npm run dev            # Development mode
npm run build          # Production build  
npm run start          # Production server
npm run install:all    # Install all dependencies
```

## 🎯 Použití

1. **Nahrajte soubor** - přetáhněte .txt soubor nebo klikněte pro výběr
2. **Zadejte dotaz** - popište přirozeným jazykem co hledáte
3. **Prohlížejte výsledky** - klikněte na výsledek pro přeskok v dokumentu
4. **Exportujte** - zkopírujte výsledky nebo vyčistěte session

## 🐛 Troubleshooting

### Časté problémy
- **"Claude API error"** - zkontrolujte API klíč
- **"Soubor příliš velký"** - maximálně 10MB
- **"Žádné výsledky"** - zkuste jiné klíčové slovo
- **"Session expired"** - nahrajte soubor znovu

### Debug mode
```bash
NODE_ENV=development npm start  # Verbose logging
```

## 📝 Licence

MIT License - viz LICENSE soubor

## 🤝 Contribution

Tento projekt byl vytvořen Claude Flow Hivemind týmem s využitím AI orchestrace.

---

**Vytvořeno s ❤️ pomocí Claude Flow Hivemind**
*Liquid Glass Design × Porsche Aesthetics*