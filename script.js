let board = [];
let allTiles = [];
let score = 0;
let highScore = localStorage.getItem('2048-best-score') || 0;
let isMoving = false;

const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('best-score');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const newGameBtn = document.getElementById('new-game-btn');

function initGame() {
    // Reset logical board
    board = [...Array(4)].map(() => Array(4).fill(null));
    
    // Clear DOM tiles
    allTiles.forEach(t => t.dom.remove());
    allTiles = [];
    
    // Reset Score
    score = 0;
    updateScore();
    
    // Hide game over screen
    gameOverScreen.classList.remove('visible');
    
    // Start with 2 tiles
    addRandomTile();
    addRandomTile();
}

function addRandomTile() {
    let emptyCells = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (!board[r][c]) {
                emptyCells.push({r, c});
            }
        }
    }
    
    if (emptyCells.length === 0) return;
    
    let {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    let value = Math.random() < 0.9 ? 2 : 4;
    
    let tile = {
        r, c, value,
        dom: document.createElement('div')
    };
    
    tile.dom.classList.add('tile', 'tile-new');
    tile.dom.dataset.value = value;
    tile.dom.textContent = value;
    tile.dom.style.top = `${10 + r * 100}px`;
    tile.dom.style.left = `${10 + c * 100}px`;
    
    board[r][c] = tile;
    allTiles.push(tile);
    gameBoard.appendChild(tile.dom);
}

function updateDOMPositions() {
    allTiles.forEach(tile => {
        tile.dom.style.top = `${10 + tile.r * 100}px`;
        tile.dom.style.left = `${10 + tile.c * 100}px`;
        tile.dom.classList.remove('tile-new'); // Remove appear animation class
    });
}

function updateScore() {
    scoreElement.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('2048-best-score', highScore);
    }
    bestScoreElement.textContent = highScore;
}

function cleanupMergedTiles() {
    allTiles = allTiles.filter(tile => {
        // If tile was merged into another, remove it from DOM
        if (tile.mergedInto) {
            tile.dom.remove();
            return false;
        }
        
        // If tile was the target of a merge, update its value
        if (tile.nextValue) {
            tile.value = tile.nextValue;
            tile.nextValue = null;
            tile.dom.dataset.value = tile.value;
            tile.dom.textContent = tile.value;
            
            // Retrigger the pop animation
            tile.dom.classList.remove('tile-merged');
            void tile.dom.offsetWidth; // Trigger DOM reflow to restart animation
            tile.dom.classList.add('tile-merged');
        }
        return true;
    });
}

function checkGameOver() {
    // Check if there are any empty cells
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (!board[r][c]) return;
        }
    }
    
    // Check if any adjacent tiles can be merged
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            let val = board[r][c].value;
            if (r < 3 && board[r+1][c] && board[r+1][c].value === val) return;
            if (c < 3 && board[r][c+1] && board[r][c+1].value === val) return;
        }
    }
    
    // If we reach here, no moves are possible
    gameOverScreen.classList.add('visible');
}

function move(direction) {
    if (isMoving) return;
    
    let hasMoved = false;
    let scoreIncrease = 0;
    
    // Clear flags
    allTiles.forEach(t => {
        t.nextValue = null;
        t.mergedInto = null;
    });

    for (let i = 0; i < 4; i++) {
        let line = [];
        // Extract line based on direction
        for (let j = 0; j < 4; j++) {
            let r = i, c = j;
            if (direction === 'ArrowUp') { c = i; r = j; }
            else if (direction === 'ArrowDown') { c = i; r = 3 - j; }
            else if (direction === 'ArrowLeft') { r = i; c = j; }
            else if (direction === 'ArrowRight') { r = i; c = 3 - j; }
            
            if (board[r][c]) {
                line.push(board[r][c]);
            }
        }

        // Merge identical adjacent tiles in the line
        let mergedLine = [];
        let k = 0;
        while (k < line.length) {
            // Check if current tile can merge with next tile
            if (k < line.length - 1 && 
                line[k].value === line[k+1].value && 
                !line[k].nextValue && 
                !line[k+1].nextValue) {
                
                let target = line[k];
                let source = line[k+1];
                
                target.nextValue = target.value * 2;
                source.mergedInto = target;
                
                mergedLine.push(target);
                scoreIncrease += target.nextValue;
                hasMoved = true;
                k += 2; // Skip next tile since it merged
            } else {
                mergedLine.push(line[k]);
                k++;
            }
        }

        // Put line back into board
        for (let j = 0; j < 4; j++) {
            let r = i, c = j;
            if (direction === 'ArrowUp') { c = i; r = j; }
            else if (direction === 'ArrowDown') { c = i; r = 3 - j; }
            else if (direction === 'ArrowLeft') { r = i; c = j; }
            else if (direction === 'ArrowRight') { r = i; c = 3 - j; }
            
            let tile = mergedLine[j] || null;
            board[r][c] = tile;
            
            if (tile) {
                if (tile.r !== r || tile.c !== c) {
                    hasMoved = true;
                    tile.r = r;
                    tile.c = c;
                }
            }
        }
        
        // Update logical positions for tiles that merged, so they animate to the target
        for (let t of line) {
            if (t.mergedInto) {
                t.r = t.mergedInto.r;
                t.c = t.mergedInto.c;
            }
        }
    }

    if (hasMoved) {
        isMoving = true;
        updateDOMPositions();
        
        score += scoreIncrease;
        updateScore();
        
        // Wait for CSS transition to finish before cleanup and adding new tile
        setTimeout(() => {
            cleanupMergedTiles();
            addRandomTile();
            checkGameOver();
            isMoving = false;
        }, 150); 
    }
}

// Event Listeners
document.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault(); // Prevent scrolling
        
        let dir = e.key;
        if(dir === 'w') dir = 'ArrowUp';
        if(dir === 's') dir = 'ArrowDown';
        if(dir === 'a') dir = 'ArrowLeft';
        if(dir === 'd') dir = 'ArrowRight';
        
        move(dir);
    }
});

// Touch controls for mobile
let touchStartX = 0;
let touchStartY = 0;
document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, {passive: false});

document.addEventListener('touchend', e => {
    if(e.target.closest('#restart-btn') || e.target.closest('#new-game-btn')) return;
    
    let touchEndX = e.changedTouches[0].clientX;
    let touchEndY = e.changedTouches[0].clientY;
    
    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) {
            if (dx > 0) move('ArrowRight');
            else move('ArrowLeft');
        }
    } else {
        if (Math.abs(dy) > 30) {
            if (dy > 0) move('ArrowDown');
            else move('ArrowUp');
        }
    }
}, {passive: false});

restartBtn.addEventListener('click', initGame);
newGameBtn.addEventListener('click', initGame);

// Start game
initGame();
