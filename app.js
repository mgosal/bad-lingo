(function() {
    let _currentRound = 1;
    let _wordLength = 4;
    let _targetWord = "";
    let _currentGuess = "";
    let _currentAttempt = 0;
    let _isGameOver = false;
    let _gameMode = 'classic';
    let _cockneyHint = null;
    let _sessionId = btoa(Math.random()).substring(0, 12);
    let _initials = localStorage.getItem('lingo-initials') || "";

    async function trackEvent(event, data = {}) {
        try {
            await fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: _sessionId,
                    event,
                    mode: _gameMode,
                    round: _currentRound,
                    wordLength: _wordLength,
                    targetWord: _targetWord,
                    ...data
                })
            });
        } catch (err) {
            console.error("Log failed", err);
        }
    }

    const board = document.getElementById('board');
    const roundNumDisplay = document.getElementById('round-num');
    const letterCountDisplay = document.getElementById('letter-count');
    const kbdContainer = document.getElementById('keyboard');
    const modal = document.getElementById('modal-overlay');
    const nextBtn = document.getElementById('next-round-btn');

    const ROWS_COUNT = 5;

    async function initGame(mode) {
        if (mode) _gameMode = mode;
        _isGameOver = false;
        _currentAttempt = 0;
        _currentGuess = "";

        // Clear any lingering confetti from previous win
        const confCanvas = document.getElementById('confetti');
        if (confCanvas) {
            const confCtx = confCanvas.getContext('2d');
            confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
        }
        
        document.getElementById('menu-view').classList.add('hidden');
        document.getElementById('game-view').classList.remove('hidden');

        let url = `/api/game/word?mode=${_gameMode}&sessionId=${_sessionId}`;
        if (_gameMode === 'classic') {
            let desiredLen = 4;
            if (_currentRound === 1) desiredLen = 4;
            else if (_currentRound === 2) desiredLen = 5;
            else if (_currentRound === 3) desiredLen = 6;
            else if (_currentRound === 4) desiredLen = 7;
            else if (_currentRound === 5) desiredLen = 8;
            else if (_currentRound === 6) desiredLen = 9;
            else {
                const lengths = [4, 5, 6, 7, 8, 9, 10];
                desiredLen = lengths[Math.floor(Math.random() * lengths.length)];
            }
            url += `&length=${desiredLen}`;
        }

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (!data || !data.token) {
                console.error("Server Error Response:", data);
                throw new Error(data.error || "Failed to fetch word from server");
            }

            // Decode the obfuscated word and normalize (remove apostrophes)
            _targetWord = atob(data.token).toUpperCase().replace(/'/g, "");
            _wordLength = _targetWord.length;

            if (_gameMode === 'classic') {
                document.getElementById('cockney-hint-container').classList.add('hidden');
                const hintEl = document.getElementById('urban-hint');
                const adultEl = document.getElementById('adult-hint');
                
                if (data.isUrban) hintEl.classList.remove('hidden');
                else hintEl.classList.add('hidden');

                if (data.isUrban || data.isAdult) adultEl.classList.remove('hidden');
                else adultEl.classList.add('hidden');
            } else {
                document.getElementById('urban-hint').classList.add('hidden');
                document.getElementById('cockney-hint-container').classList.remove('hidden'); // Fix: Show the Cockney UI
                _cockneyHint = data.hint;
                document.getElementById('hint-clue').innerText = _cockneyHint;
                document.getElementById('rhyme-target').innerText = data.answer;
                
                document.getElementById('show-hint-btn').classList.remove('hidden');
                document.getElementById('show-rhyme-btn').classList.add('hidden');
                document.getElementById('hint-text').classList.add('hidden');
                document.getElementById('rhyme-text').classList.add('hidden');
            }

            trackEvent('START', { sessionId: _sessionId });

            roundNumDisplay.innerText = _currentRound;
            letterCountDisplay.innerText = _wordLength;

            createBoard();
            createKeyboard();
            revealFirstLetter();
        } catch (err) {
            console.error("Failed to load game", err);
            showModal("CONNECTION ERROR", "Failed to reach servers.");
        }
    }

    function createBoard() {
        board.innerHTML = "";
        board.style.setProperty('--cols', _wordLength);
        
        if (_wordLength > 12) {
            board.style.maxWidth = "100%";
            board.classList.add('grid-xl');
            board.classList.remove('grid-long');
        } else if (_wordLength >= 8) {
            board.style.maxWidth = "100%";
            board.classList.add('grid-long');
            board.classList.remove('grid-xl');
        } else {
            board.style.maxWidth = "320px";
            board.classList.remove('grid-long', 'grid-xl');
        }

        for (let i = 0; i < ROWS_COUNT; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            for (let j = 0; j < _wordLength; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                if (_targetWord[j] === " ") {
                    cell.classList.add('cell-space');
                }
                row.appendChild(cell);
            }
            board.appendChild(row);
        }
    }

    function revealFirstLetter() {
        const firstCell = board.children[0].children[0];
        if (_targetWord[0] === " ") {
             _currentGuess = " ";
        } else {
            firstCell.innerText = _targetWord[0];
            firstCell.classList.add('correct', 'hint');
            _currentGuess = _targetWord[0];
        }
        updateBoard(); // Ensure focus glow appears on the second square immediately
    }

    function createKeyboard() {
        const layout = ["QWERTYUIOP", "ASDFGHJKL", "BACK ZCVBNM ENTER"];
        kbdContainer.innerHTML = "";
        layout.forEach(rowStr => {
            const row = document.createElement('div');
            row.className = 'kbd-row';
            const keysArray = rowStr.split(/(\s+)/).filter(e => e.trim().length > 0);
            if (rowStr === "QWERTYUIOP" || rowStr === "ASDFGHJKL") {
                rowStr.split('').forEach(k => row.appendChild(createKey(k)));
            } else {
                row.appendChild(createKey("BACK", true));
                "ZXCVBNM".split('').forEach(k => row.appendChild(createKey(k)));
                row.appendChild(createKey("ENTER", true));
            }
            kbdContainer.appendChild(row);
        });
    }

    function createKey(label, isLarge = false) {
        const key = document.createElement('div');
        key.className = `key ${isLarge ? 'key-large' : ''}`;
        key.innerText = label;
        key.addEventListener('click', () => handleInput(label));
        return key;
    }

    function handleInput(key) {
        if (_isGameOver) return;
        if (key === "ENTER") {
            submitGuess();
        } else if (key === "BACK" || key === "BACKSPACE") {
            // Find which positions have been marked correct in previous rows
            // plus the mandatory first initial.
            const confirmedIndices = new Set([0]);
            for (let rIdx = 0; rIdx < _currentAttempt; rIdx++) {
                const prevRow = board.children[rIdx];
                for (let i = 0; i < _wordLength; i++) {
                    if (prevRow.children[i].classList.contains('correct')) {
                        confirmedIndices.add(i);
                    }
                }
            }

            // Find the furthest locked position (including spaces)
            let minLen = 1;
            for (let i = 0; i < _wordLength; i++) {
                if (confirmedIndices.has(i) || _targetWord[i] === " ") {
                    minLen = i + 1;
                } else {
                    break;
                }
            }

            if (_currentGuess.length > minLen) {
                let newGuess = _currentGuess.slice(0, -1);
                // Automatically skip over spaces/completed words when backspacing
                while (newGuess.length > minLen && _targetWord[newGuess.length-1] === " ") {
                    newGuess = newGuess.slice(0, -1);
                }
                _currentGuess = newGuess;
                updateBoard();
            }
        } else if (/^[A-Z]$/.test(key)) {
            if (_currentGuess.length < _wordLength) {
                let tempGuess = _currentGuess + key;
                while(_targetWord[tempGuess.length] === " " && tempGuess.length < _wordLength) tempGuess += " ";
                _currentGuess = tempGuess;
                updateBoard();
            }
        }
    }

    function updateBoard() {
        const row = board.children[_currentAttempt];
        
        // Find which positions have been marked correct in ANY previous row
        const confirmedPositions = [];
        for (let rIdx = 0; rIdx < _currentAttempt; rIdx++) {
            const prevRow = board.children[rIdx];
            for (let i = 0; i < _wordLength; i++) {
                if (prevRow.children[i].classList.contains('correct')) {
                    confirmedPositions[i] = true;
                }
            }
        }

        for (let i = 0; i < _wordLength; i++) {
            const cell = row.children[i];
            if (_targetWord[i] === " ") {
                cell.innerText = "";
                cell.classList.remove('correct', 'pop');
                continue;
            }

            const char = _currentGuess[i] || "";
            cell.innerText = char;
            
            // Apply correct class if this character matches the target AND it's a confirmed position 
            // OR if it's the first letter (always revealed in Lingo)
            if (char === _targetWord[i] && (confirmedPositions[i] || i === 0)) {
                cell.classList.add('correct');
            } else {
                cell.classList.remove('correct');
            }

            if (char) cell.classList.add('pop');
            else cell.classList.remove('pop');

            // Apply focus glow to the CURRENT square being populated
            // Only if game is active AND this is the next position to type
            if (!_isGameOver && i === _currentGuess.length) {
                cell.classList.add('focus-glow');
            } else {
                cell.classList.remove('focus-glow');
            }
        }
    }

    async function submitGuess() {
        if (_currentGuess.length < _wordLength) {
            board.children[_currentAttempt].classList.add('shake');
            setTimeout(() => board.children[_currentAttempt].classList.remove('shake'), 500);
            return;
        }

        const row = board.children[_currentAttempt];
        const guessArr = _currentGuess.split('');
        const targetArr = _targetWord.split('');

        const boundaries = [];
        let start = 0;
        for(let i=0; i<=_wordLength; i++) {
            if (i === _wordLength || _targetWord[i] === " ") {
                if (i > start) boundaries.push({start, end: i-1});
                start = i + 1;
            }
        }

        boundaries.forEach(b => {
            const counts = {};
            for(let i=b.start; i<=b.end; i++) counts[_targetWord[i]] = (counts[_targetWord[i]]||0)+1;
            for(let i=b.start; i<=b.end; i++) {
                if (guessArr[i] === targetArr[i]) {
                    row.children[i].classList.add('correct');
                    counts[guessArr[i]]--;
                }
            }
            for(let i=b.start; i<=b.end; i++) {
                if (guessArr[i] !== targetArr[i]) {
                    if (counts[guessArr[i]] > 0) {
                        row.children[i].classList.add('misplaced');
                        counts[guessArr[i]]--;
                    } else row.children[i].classList.add('absent');
                }
            }
        });

        if (_currentGuess === _targetWord) {
            await trackEvent('GUESS', { guess: _currentGuess, result: 'CORRECT' });
            handleWin();
        } else {
            trackEvent('GUESS', { guess: _currentGuess, result: 'INCORRECT' });
            _currentAttempt++;
            if (_currentAttempt >= ROWS_COUNT) {
                handleLoss();
            } else {
                let nextGuess = "";
                for (let i = 0; i < _wordLength; i++) {
                    if (_targetWord[i] === " ") { nextGuess += " "; continue; }
                    const isCorrect = Array.from(board.children).some((r, idx) => idx <= _currentAttempt && r.children[i].classList.contains('correct'));
                    if (isCorrect || i === 0) nextGuess += _targetWord[i];
                    else break;
                }
                _currentGuess = nextGuess;
                updateBoard();
            }
        }
    }

    function handleWin() {
        _isGameOver = true;
        startConfetti();
        trackEvent('WIN');
        
        const title = "GOAL!";
        const message = `You found the word: ${_targetWord}`;
        
        if (_gameMode === 'cockney') {
            fetch(`/api/admin/word-info?word=${_targetWord}`)
                .then(r => r.json())
                .then(slang => {
                    const extra = slang && slang.explanation ? `<br><br><i>"${slang.hint}"</i><br>${slang.explanation}` : "";
                    showModal(title, message + extra, true);
                });
        } else {
            showModal(title, message, true);
        }
    }

    function handleLoss() {
        _isGameOver = true;
        trackEvent('LOSS');
        showModal("GAME OVER", `The word was: ${_targetWord}`, false);
    }

    function showModal(title, message, isWin = false) {
        document.getElementById('modal-title').innerHTML = title;
        document.getElementById('modal-message').innerHTML = message;
        
        const container = document.getElementById('modal-word-reveal');
        container.innerHTML = "";
        
        if (isWin) {
            const arcadeDiv = document.createElement('div');
            arcadeDiv.className = 'arcade-submit';
            arcadeDiv.innerHTML = `
                <div class="initials-box">
                    <p>REGISTER YOUR LEGACY</p>
                    <input type="text" id="player-initials" maxlength="3" placeholder="---" value="${_initials}">
                    <button id="submit-leaderboard-btn">SUBMIT TO LEADERBOARD</button>
                </div>
                <div id="adult-hint" class="adult-badge hidden">🔞 ADULT CONTENT</div>
                <div id="neighborhood-container" class="hidden">
                    <div class="neighborhood-warning">🔞 ADULTS ONLY CONTENT AHEAD</div>
                    <div id="neighborhood-list"></div>
                </div>
            `;
            container.appendChild(arcadeDiv);
            
            const input = document.getElementById('player-initials');
            const submitBtn = document.getElementById('submit-leaderboard-btn');
            
            input.addEventListener('input', () => {
                input.value = input.value.toUpperCase();
                _initials = input.value;
                localStorage.setItem('lingo-initials', _initials);
            });

            submitBtn.addEventListener('click', async () => {
                if (!_initials || _initials.length < 1) return;
                submitBtn.disabled = true;
                submitBtn.innerText = "SUBMITTING...";
                
                try {
                    const res = await fetch('/api/game/complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: _sessionId,
                            name: _initials,
                            attempts: _currentAttempt + 1,
                            mode: _gameMode,
                            word: _targetWord
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        renderNeighborhood(data.rank, data.neighborhood);
                    }
                } catch (e) { console.error(e); }
            });
        }

        modal.classList.remove('hidden');
    }

    function renderNeighborhood(rank, list) {
        document.querySelector('.initials-box').classList.add('hidden');
        const container = document.getElementById('neighborhood-container');
        const listDiv = document.getElementById('neighborhood-list');
        container.classList.remove('hidden');
        listDiv.innerHTML = `<div class="rank-title">GLOBAL RANK: #${rank}</div>`;
        
        list.forEach(item => {
            const row = document.createElement('div');
            row.className = `rank-row ${item.name === _initials.toUpperCase() ? 'rank-row-me' : ''}`;
            row.innerHTML = `
                <span class="rank-pos">#${item.rank}</span>
                <span class="rank-name">${item.name}</span>
                <span class="rank-val">${item.attempts} ATTEMPTS</span>
            `;
            listDiv.appendChild(row);
        });
    }

    // UI Events
    document.getElementById('btn-classic').addEventListener('click', () => initGame('classic'));
    document.getElementById('btn-cockney').addEventListener('click', () => initGame('cockney'));
    nextBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        _currentRound++;
        initGame();
    });

    document.getElementById('back-to-menu-btn').addEventListener('click', () => {
        document.getElementById('game-view').classList.add('hidden');
        document.getElementById('menu-view').classList.remove('hidden');
        _currentRound = 1;
    });

    document.getElementById('show-hint-btn').addEventListener('click', () => {
        document.getElementById('hint-text').classList.remove('hidden');
        document.getElementById('show-hint-btn').classList.add('hidden');
        document.getElementById('show-rhyme-btn').classList.remove('hidden');
        trackEvent('HINT_USED');
    });

    document.getElementById('show-rhyme-btn').addEventListener('click', () => {
        document.getElementById('rhyme-text').classList.remove('hidden');
        document.getElementById('show-rhyme-btn').classList.add('hidden');
        trackEvent('RHYME_USED');
    });

    window.addEventListener('keydown', (e) => {
        if (document.getElementById('game-view').classList.contains('hidden')) return;
        const key = e.key.toUpperCase();
        if (key === "ENTER") handleInput("ENTER");
        else if (key === "BACKSPACE") handleInput("BACK");
        else if (/^[A-Z]$/.test(key)) handleInput(key);
    });

    function startConfetti() {
        const canvas = document.getElementById('confetti');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let particles = Array.from({ length: 150 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            r: Math.random() * 4 + 2,
            vx: Math.random() * 2 - 1,
            vy: Math.random() * 3 + 2
        }));
        function frame() {
            if (!_isGameOver) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.y > canvas.height) p.y = -10;
                ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            });
            requestAnimationFrame(frame);
        }
        frame();
        setTimeout(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); }, 3000);
    }
})();
