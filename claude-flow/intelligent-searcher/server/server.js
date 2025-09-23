const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const iconv = require('iconv-lite');
const jschardet = require('jschardet');

const claudeService = require('./utils/claudeService');
const { parseDocument, getSupportedFormats } = require('./utils/documentParsers');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware pro bezpečnost
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session konfigurace - pouze v paměti, bez persistance
app.use(session({
  secret: process.env.SESSION_SECRET || 'claude-flow-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 60 * 1000, // 30 minut timeout
    sameSite: 'lax'
  },
  name: 'intelligent-searcher-session'
}));

// Multer konfigurace pro upload souborů (pouze do paměti)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const supportedFormats = getSupportedFormats();
    const fileExt = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    
    // Kontrola přípony souboru
    const isExtensionSupported = supportedFormats.extensions.includes(fileExt);
    
    // Kontrola MIME typu
    const isMimeTypeSupported = supportedFormats.mimeTypes.includes(mimeType);
    
    if (isExtensionSupported || isMimeTypeSupported) {
      cb(null, true);
    } else {
      const supportedExts = supportedFormats.extensions.join(', ');
      cb(new Error(`Podporované formáty: ${supportedExts}`), false);
    }
  }
});

// Utility funkce pro detekci kódování
function detectAndDecodeText(buffer) {
  try {
    // Detekce kódování
    const detected = jschardet.detect(buffer);
    const encoding = detected.encoding || 'utf-8';
    
    console.log(`Detekované kódování: ${encoding} (confidence: ${detected.confidence})`);
    
    // Dekódování textu
    let text;
    if (encoding.toLowerCase().includes('windows-1250') || 
        encoding.toLowerCase().includes('cp1250')) {
      text = iconv.decode(buffer, 'cp1250');
    } else if (encoding.toLowerCase().includes('iso-8859-2')) {
      text = iconv.decode(buffer, 'iso-8859-2');
    } else {
      text = iconv.decode(buffer, 'utf-8');
    }
    
    return text;
  } catch (error) {
    console.error('Chyba při dekódování textu:', error);
    // Fallback na UTF-8
    return buffer.toString('utf-8');
  }
}

// Routes

// Upload endpoint
app.post('/api/upload', upload.single('textFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Žádný soubor nebyl nahrán' 
      });
    }

    const fileName = req.file.originalname;
    const fileExt = path.extname(fileName).toLowerCase();
    const mimeType = req.file.mimetype;
    
    console.log(`🔍 Zpracovávám soubor: ${fileName} (${fileExt}, ${mimeType})`);
    
    // Použijeme nový univerzální parser pro VŠECHNY formáty včetně .pages
    const parseResult = await parseDocument(req.file.buffer, fileName, mimeType);
    
    if (!parseResult.success || !parseResult.text) {
      return res.status(400).json({
        error: parseResult.error || 'Nelze extrahovat text ze souboru'
      });
    }
    
    const text = parseResult.text;
    console.log(`✅ Zpracován ${parseResult.metadata?.format || fileExt} soubor: ${text.length} znaků`);
    
    // Validace délky textu (přibližně 100 stran = ~250,000 znaků)
    if (text.length > 250000) {
      return res.status(400).json({ 
        error: 'Soubor je příliš velký. Maximum je 100 stran textu.' 
      });
    }
    
    if (text.length === 0) {
      return res.status(400).json({
        error: 'Soubor neobsahuje žádný text nebo není podporován formát'
      });
    }

    // Uložení do session
    req.session.uploadedFile = {
      originalName: req.file.originalname,
      text: text,
      uploadTime: new Date(),
      size: text.length
    };

    console.log(`Soubor nahrán: ${req.file.originalname} (${text.length} znaků)`);

    res.json({
      success: true,
      message: 'Soubor byl úspěšně nahrán',
      fileName: req.file.originalname,
      textLength: text.length,
      estimatedPages: Math.ceil(text.length / 2500), // ~2500 znaků na stránku
      extractedText: text // Pošleme extrahovaný text pro všechny typy souborů
    });

  } catch (error) {
    console.error('Chyba při uploadu:', error);
    res.status(500).json({ 
      error: 'Chyba při zpracování souboru: ' + error.message 
    });
  }
});

// Search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Vyhledávací dotaz je povinný' 
      });
    }

    if (!req.session.uploadedFile) {
      return res.status(400).json({ 
        error: 'Nejprve musíte nahrát textový soubor' 
      });
    }

    const searchQuery = query.trim();
    const documentText = req.session.uploadedFile.text;

    console.log(`Vyhledávání: "${searchQuery}" v dokumentu ${req.session.uploadedFile.originalName}`);

    // Volání Claude API přes servisní vrstvu
    const searchResults = await claudeService.searchInDocument(searchQuery, documentText);

    // Uložení historie vyhledávání do session
    if (!req.session.searchHistory) {
      req.session.searchHistory = [];
    }
    
    req.session.searchHistory.push({
      query: searchQuery,
      timestamp: new Date(),
      resultCount: searchResults.length
    });

    // Limit historie na posledních 20 vyhledávání
    if (req.session.searchHistory.length > 20) {
      req.session.searchHistory = req.session.searchHistory.slice(-20);
    }

    res.json({
      success: true,
      query: searchQuery,
      results: searchResults,
      totalFound: searchResults.length,
      documentName: req.session.uploadedFile.originalName
    });

  } catch (error) {
    console.error('Chyba při vyhledávání:', error);
    res.status(500).json({ 
      error: 'Chyba při vyhledávání: ' + error.message 
    });
  }
});

// Session status endpoint
app.get('/api/session/status', (req, res) => {
  const hasFile = !!req.session.uploadedFile;
  const searchHistory = req.session.searchHistory || [];
  
  res.json({
    hasUploadedFile: hasFile,
    fileName: hasFile ? req.session.uploadedFile.originalName : null,
    uploadTime: hasFile ? req.session.uploadedFile.uploadTime : null,
    textLength: hasFile ? req.session.uploadedFile.size : 0,
    searchHistoryCount: searchHistory.length,
    sessionId: req.sessionID
  });
});

// Clear session endpoint
app.delete('/api/session/clear', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Chyba při mazání session:', err);
      return res.status(500).json({ error: 'Chyba při mazání session' });
    }
    
    res.clearCookie('intelligent-searcher-session');
    res.json({ 
      success: true, 
      message: 'Session byla vymazána' 
    });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Soubor je příliš velký (max 10MB)' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Neočekávaný soubor' });
    }
  }
  
  res.status(500).json({ 
    error: 'Interní chyba serveru',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint nenalezen' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`
🚀 Intelligent Text Searcher Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server běží na portu: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔒 Session timeout: 30 minut
📁 Upload limit: 10MB / 100 stran
🤖 Claude API: Připraveno k použití
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});