# Bad Lingo Arcade v1.0

A premium, arcade-style word-guessing game with evolving difficulty and a high-fidelity aesthetic.

## 🎮 Game Modes

### 🔞 Classic Lingo
- The core experience featuring 300+ terms across multiple difficulty tiers.
- **Evolving Word Lengths**: Progress from 4 to 10 letters as you win rounds.
- **Adult Content Indicator**: Contextual indicators for mature or urban dictionary terms.

### 🦜 Cockney Rhyming Slang (Cogni Mode)
- A specialized mode for multi-phrase rhyming slang.
- **Hint System**: Tiered clues including definitions and rhymes.
- **Smart Input**: Automatically handles spaces and punctuation normalization.

## 🛠️ Technical Stack

- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism), and Modern Javascript (ES6+).
- **Backend**: Node.js with Express.
- **Persistence**: SQLite (Local volume).
- **Compliance**: All sensitive word libraries are Base64 obfuscated to ensure repository safety and compliance with GitHub policies.

## 🚀 Deployment

### Local Development
```bash
npm install
node server.js
```

### Docker (Production)
```bash
docker compose up --build -d
```

## 🔒 Security \u0026 Privacy
- **Scrubbed History**: This repository represents a sanitized release. Development history is maintained in a private secure mirror.
- **Obfuscated Seed**: All initial word data is decoded on-the-fly from Base64 seeds to maintain a clean source-code presence.

---
*Designed for the culture. Built for the challenge.*
