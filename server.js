const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const morgan = require('morgan');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const getDbPath = (defaultPath, localFallback) => {
    try {
        const dir = path.dirname(defaultPath);
        if (fs.existsSync(dir)) return defaultPath;
        return localFallback;
    } catch (e) {
        return localFallback;
    }
};

const DB_PATH = process.env.DB_PATH || getDbPath('/data/logs.db', './data/logs.db');
const WORDS_DB_PATH = process.env.WORDS_DB_PATH || getDbPath('/data/words.db', './data/words.db');

// Ensure data directory exists
const ensureDir = (filePath) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch (err) {
            console.warn(`Could not create ${dir}, using current directory for fallback`);
        }
    }
};

ensureDir(DB_PATH);
ensureDir(WORDS_DB_PATH);

// Database Setup (Logs)
const db = new Database(DB_PATH);
// Database Setup (Words)
const wordsDb = new Database(WORDS_DB_PATH);

// --- OBFUSCATED SEED DATA (Sanitized Fallbacks) ---
const SFW_CORE = "eyI0IjpbIkhFTEwiLCJEQU1OIiwiU1RBWSIsIlBMQVkiLCJXT1JLIl0sIjUiOlsiU1RBUkUiLCJMSUdIVCIsIkJSQVZFIiwiU01BUlQiLCJHUkVFTiJdLCI2IjpbIkJSRUVaRSIsIlNVTU1FUiIsIldJTlRFUiIsIlNUUkVFVCIsIkZMT1dFUiJdLCI3IjpbIkpPVVJORVkiLCJTSUxFTkNFIiwiTU9STklORyIsIkZSRUVET00iLCJCQUxBTkNFIl0sIjgiOlsiTU9VTlRBSU4iLCJQUkFDVElDRSIsIlVOSVZFUlNFIiwiU1RBTkRBUkQiLCJTT0xVVElPTiJdLCI5IjpbIkNIQUxMRU5HRSIsIkRJVkVSU0lUWSIsIkVEVUNBVElPTiIsIkZSQU1FV09SSyIsIktOT1dMRURHRSJdLCIxMCI6WyJFWFBFUklFTkNFIiwiR0VORVJBVElPTiIsIkxFQURFUlNISVAiLCJNQU5BR0VNRU5UIiwiVEVDSE5PTE9HWSJdfQ==";
const SFW_URBAN = "WyJIRUxMIiwiREFNTiJd";
const SFW_RHYME = "W3sicGhyYXNlIjoiQVBQTEUgQU5EIFBFQVJTIiwiaGludCI6IlNUQUlSUyIsIm1lYW5pbmciOiJTdGVwcyBvciBTdGFpcnMifSx7InBocmFzZSI6IkxBRFkgR09ESVZBIiwiaGludCI6IkZJVkVSIiwibWVhbmluZyI6IkZpdmUgUG91bmQgTm90ZSJ9LHsicGhyYXNlIjoiQURBTSBBTkQgRVZFIiwiaGludCI6IkJFTElFVkUiLCJtZWFuaW5nIjoiVG8gSGF2ZSBGYWl0aCJ9LHsicGhyYXNlIjoiQkFSTkVUIEZBSVIiLCJoaW50IjoiSEFJUiIsIm1lYW5pbmciOiJUaGUgU3R1ZmYgb24gWW91ciBIZWFkIn0seyJwaHJhc2UiOiJCT0FUIFJBQ0UiLCJoaW50IjoiRkFDRSIsIm1lYW5pbmciOiJZb3VyIENvdW50ZW5hbmNlIn0seyJwaHJhc2UiOiJCUkVBRCBBTkQgSE9ORVkiLCJoaW50IjoiTU9ORVkiLCJtZWFuaW5nIjoiQ2FzaCwgTG9vdCwgRG91Z2gifV0=";

const SEED_CORE = process.env.SEED_CORE || SFW_CORE;
const SEED_URBAN = process.env.SEED_URBAN || SFW_URBAN;
const SEED_RHYME = process.env.SEED_RHYME || SFW_RHYME;

function bootstrapWords() {
    console.log("Checking words database...");
    wordsDb.prepare(`CREATE TABLE IF NOT EXISTS classic_words (id INTEGER PRIMARY KEY AUTOINCREMENT, word TEXT, length INTEGER, is_urban BOOLEAN)`).run();
    wordsDb.prepare(`CREATE TABLE IF NOT EXISTS cockney_slang (id INTEGER PRIMARY KEY AUTOINCREMENT, phrase TEXT, hint TEXT, answer TEXT, explanation TEXT)`).run();

    // Check if we already have data
    const classicCount = wordsDb.prepare('SELECT COUNT(*) as count FROM classic_words').get().count;
    const cockneyCount = wordsDb.prepare('SELECT COUNT(*) as count FROM cockney_slang').get().count;

    if (classicCount > 0 && cockneyCount > 0) {
        console.log(`Database already contains ${classicCount} classic words and ${cockneyCount} cockney phrases. Skipping seed.`);
        return;
    }

    const SEED_DATA = JSON.parse(Buffer.from(SEED_CORE, 'base64').toString('utf-8'));
    const URBAN_WORDS = JSON.parse(Buffer.from(SEED_URBAN, 'base64').toString('utf-8'));
    const RHYME_DATA = JSON.parse(Buffer.from(SEED_RHYME, 'base64').toString('utf-8'));

    if (classicCount === 0) {
        console.log("Seeding Classic Words library...");
        const insertClassic = wordsDb.prepare('INSERT INTO classic_words (word, length, is_urban) VALUES (?, ?, ?)');
        for (const [len, words] of Object.entries(SEED_DATA)) {
            words.forEach(word => {
                insertClassic.run(word, parseInt(len), URBAN_WORDS.includes(word) ? 1 : 0);
            });
        }
    }

    if (cockneyCount === 0) {
        console.log("Seeding Cockney library...");
        const insertCockney = wordsDb.prepare('INSERT INTO cockney_slang (phrase, hint, answer, explanation) VALUES (?, ?, ?, ?)');
        RHYME_DATA.forEach(c => insertCockney.run(c.phrase, c.hint, c.phrase, c.meaning || 'Cockney Slang'));
    }
}


bootstrapWords();
db.pragma('journal_mode = WAL');
db.prepare(`
    CREATE TABLE IF NOT EXISTS game_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        event TEXT,
        mode TEXT,
        round INTEGER,
        word_length INTEGER,
        target_word TEXT,
        guess TEXT,
        result TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();
db.prepare(`
    CREATE TABLE IF NOT EXISTS high_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        name TEXT,
        mode TEXT,
        attempts INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// Migration: Check if 'mode' column exists, if not add it
try {
    db.prepare("ALTER TABLE game_logs ADD COLUMN mode TEXT").run();
} catch (e) {
    // Column already exists or table is new
}

app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '')));

// API: Log Game Event
app.post('/api/log', (req, res) => {
    const { sessionId, event, mode, round, wordLength, targetWord, guess, result } = req.body;
    const userAgent = req.headers['user-agent'];

    try {
        const stmt = db.prepare(`
            INSERT INTO game_logs (session_id, event, mode, round, word_length, target_word, guess, result, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(sessionId, event, mode || 'classic', round, wordLength, targetWord, guess, result, userAgent);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ error: "Failed to log event" });
    }
});

// API: Get Random Word (Obfuscated)
app.get('/api/game/word', (req, res) => {
    const { mode, length, sessionId } = req.query;

    try {
        let wordData;
        if (mode === 'cockney') {
            const row = wordsDb.prepare('SELECT * FROM cockney_slang ORDER BY RANDOM() LIMIT 1').get();
            wordData = { phrase: row.phrase, hint: row.hint, answer: row.answer, explanation: row.explanation };
        } else {
            const len = parseInt(length) || 5;
            let row = wordsDb.prepare('SELECT * FROM classic_words WHERE length = ? ORDER BY RANDOM() LIMIT 1').get(len);
            if (!row) {
                row = wordsDb.prepare('SELECT * FROM classic_words ORDER BY RANDOM() LIMIT 1').get();
            }
            wordData = { word: row.word, isUrban: !!row.is_urban };
        }

        // Base64 Obfuscation + Apostrophe Normalization
        const target = mode === 'cockney' ? wordData.phrase.replace(/'/g, '') : wordData.word;
        const obfuscated = Buffer.from(target).toString('base64');

        // Log the 'PICK' event for server-side verification later
        if (sessionId) {
            const stmt = db.prepare(`
                INSERT INTO game_logs (session_id, event, mode, target_word)
                VALUES (?, 'SERVER_PICK', ?, ?)
            `);
            stmt.run(sessionId, mode || 'classic', target);
        }

        if (mode === 'cockney') {
            res.json({ token: obfuscated, hint: wordData.hint, answer: wordData.answer, explanation: wordData.explanation });
        } else {
            res.json({ token: obfuscated, isUrban: wordData.isUrban });
        }
    } catch (err) {
        console.error("Words DB Error:", err);
        res.status(500).json({ error: "Failed to fetch word" });
    }
});

// API: Complete Game & Submit Score
app.post('/api/game/complete', (req, res) => {
    const { sessionId, name, attempts, mode, word } = req.body;

    try {
        // 1. Verify the win - Check if this session was assigned this word
        const pick = db.prepare('SELECT target_word FROM game_logs WHERE session_id = ? AND event = "SERVER_PICK" ORDER BY timestamp DESC LIMIT 1').get(sessionId);
        
        if (!pick || pick.target_word.toUpperCase() !== word.toUpperCase()) {
            return res.status(403).json({ error: "Invalid win verification (Word mismatch)" });
        }

        // 2. Proof of Play - Check if a 'CORRECT' guess was logged for this session
        const proof = db.prepare(`
            SELECT id FROM game_logs 
            WHERE session_id = ? AND event = "GUESS" AND result = "CORRECT" AND guess = ?
            LIMIT 1
        `).get(sessionId, word.toUpperCase());

        if (!proof) {
            return res.status(403).json({ error: "Invalid win verification (No proof of play)" });
        }

        // 3. Insert into high scores
        const insert = db.prepare('INSERT INTO high_scores (session_id, name, mode, attempts) VALUES (?, ?, ?, ?)');
        insert.run(sessionId, (name || '???').toUpperCase().substring(0, 3), mode || 'classic', attempts);

        // 3. Get Rank and Neighborhood
        // SQLite 3.25+ supports Window Functions (RANK)
        const allScores = db.prepare(`
            SELECT name, attempts, timestamp,
            RANK() OVER (PARTITION BY mode ORDER BY attempts ASC, timestamp ASC) as rank
            FROM high_scores
            WHERE mode = ?
        `).all(mode || 'classic');

        const myEntry = allScores.find(s => s.timestamp === allScores.filter(x => x.name === name.toUpperCase().substring(0, 3)).pop()?.timestamp); // Simplistic match
        const myRank = allScores.findIndex(s => s.timestamp === myEntry?.timestamp) + 1;
        
        // Neighborhood: 2 above, 2 below
        const neighborhood = allScores.slice(Math.max(0, myRank - 3), Math.min(allScores.length, myRank + 2));

        res.json({
            success: true,
            rank: myRank,
            neighborhood: neighborhood
        });
    } catch (err) {
        console.error("Leaderboard Error:", err);
        res.status(500).json({ error: "Failed to submit score" });
    }
});

// API: Get Top 10 Leaderboard
app.get('/api/leaderboard', (req, res) => {
    const { mode } = req.query;
    try {
        const top = db.prepare(`
            SELECT name, attempts, timestamp
            FROM high_scores
            WHERE mode = ?
            ORDER BY attempts ASC, timestamp ASC
            LIMIT 10
        `).all(mode || 'classic');
        res.json(top);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});

// API: Word Info (for Admin Tooltips)
app.get('/api/admin/word-info', (req, res) => {
    const { word, secret } = req.query;
    if (secret !== process.env.ADMIN_SECRET) return res.status(403).send("Unauthorized");

    try {
        // Check Cockney first
        const cockney = wordsDb.prepare('SELECT * FROM cockney_slang WHERE phrase = ?').get((word || '').toUpperCase());
        if (cockney) {
            return res.json({ mode: 'cockney', ...cockney });
        }
        // Check Classic
        const classic = wordsDb.prepare('SELECT * FROM classic_words WHERE word = ?').get((word || '').toUpperCase());
        if (classic) {
            return res.json({ mode: 'classic', isUrban: !!classic.is_urban });
        }
        res.json({ error: "Not found" });
    } catch (err) {
        res.status(500).json({ error: "DB Error" });
    }
});

// API: Get Logs (for Admin Dashboard)
app.get('/api/admin/logs', (req, res) => {
    // Simple secret check
    const secret = req.query.secret;
    if (secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
        const logs = db.prepare('SELECT * FROM game_logs ORDER BY timestamp DESC LIMIT 200').all();
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

// Admin Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Root Route (Fixed 404)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bad Lingo Server running on port ${PORT}`);
});

