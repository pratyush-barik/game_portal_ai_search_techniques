document.addEventListener('DOMContentLoaded', () => {

    // These lines must match the IDs in your HTML file
    const boardElement = document.getElementById('puzzle-board');
    const newGameBtn = document.getElementById('new-game-btn');
    const solveBtn = document.getElementById('solve-btn');
    const statusMsg = document.getElementById('status-message');

    let currentBoard = [];
    let initialBoard = []; // To store the original puzzle for the solver
    const goalState = [[1, 2, 3], [4, 5, 6], [7, 8, 0]];
    let isSolving = false; // To prevent user clicks during AI animation

    // --- Core Game Functions ---

    /**
     * Renders the puzzle board based on the currentBoard state
     */
    function renderBoard() {
        boardElement.innerHTML = '';
        statusMsg.textContent = '';
        
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const tileValue = currentBoard[r][c];
                const tile = document.createElement('div');
                tile.classList.add('tile');
                
                if (tileValue === 0) {
                    tile.classList.add('empty');
                } else {
                    tile.textContent = tileValue;
                    // Add click event listener ONLY if not currently solving
                    if (!isSolving) {
                        tile.addEventListener('click', () => handleTileClick(r, c));
                    }
                }
                boardElement.appendChild(tile);
            }
        }
    }

    /**
     * Handles the user clicking on a tile
     */
    function handleTileClick(r, c) {
        if (isSolving) return; // Ignore clicks if AI is running

        // Find the blank tile
        let blankR, blankC;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (currentBoard[i][j] === 0) {
                    blankR = i;
                    blankC = j;
                    break;
                }
            }
        }

        // Check if the clicked tile is adjacent to the blank
        const isAdjacent = (Math.abs(r - blankR) + Math.abs(c - blankC)) === 1;

        if (isAdjacent) {
            // Swap tiles
            currentBoard[blankR][blankC] = currentBoard[r][c];
            currentBoard[r][c] = 0;
            renderBoard();
            
            // Check for victory
            if (checkVictory()) {
                statusMsg.textContent = 'Victory! You solved it!';
                statusMsg.style.color = '#28a745';
            }
        }
    }

    /**
     * Checks if the current board state matches the goal state
     */
    function checkVictory() {
        // A simple way to compare 2D arrays
        return JSON.stringify(currentBoard) === JSON.stringify(goalState);
    }

    // --- API Communication ---

    /**
     * Fetches a new puzzle from the backend
     */
    async function startNewGame() {
        isSolving = false;
        solveBtn.disabled = false;
        statusMsg.textContent = '';
        
        try {
            // This path must match your app.py route
            const response = await fetch('/8puzzle/api/generate');
            const data = await response.json();
            
            // Use JSON.parse(JSON.stringify(...)) for a deep copy
            currentBoard = JSON.parse(JSON.stringify(data.puzzle));
            initialBoard = JSON.parse(JSON.stringify(data.puzzle));
            
            renderBoard();
        } catch (error) {
            console.error('Error fetching new game:', error);
            statusMsg.textContent = 'Error: Could not load game.';
            statusMsg.style.color = 'red';
        }
    }

    /**
     * Asks the backend for the solution and animates it
     */
    async function showAiSolution() {
        if (isSolving) return; // Don't run if already running
        
        isSolving = true;
        solveBtn.disabled = true;
        statusMsg.textContent = 'AI is thinking...';
        statusMsg.style.color = '#007bff';
        
        try {
            // This path must match your app.py route
            const response = await fetch('/8puzzle/api/solve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ puzzle: initialBoard }) // Send the *original* puzzle
            });

            if (!response.ok) {
                throw new Error('Solver API failed');
            }

            const data = await response.json();
            
            if (data.solution) {
                statusMsg.textContent = 'AI solution:';
                animateSolution(data.solution);
            } else {
                throw new Error(data.error || 'Unknown solver error');
            }
            
        } catch (error) {
            console.error('Error solving puzzle:', error);
            statusMsg.textContent = 'Error: Could not find solution.';
            statusMsg.style.color = 'red';
            isSolving = false;
            solveBtn.disabled = false;
        }
    }

    /**
     * Animates the solution path returned by the AI
     * @param {Array<Array<Array<number>>>} solutionPath - An array of board states
     */
    function animateSolution(solutionPath) {
        let step = 0;
        
        // Add the initial state to the start of the path for animation
        const fullPath = [initialBoard, ...solutionPath];

        const interval = setInterval(() => {
            if (step < fullPath.length) {
                // Set and render the board for the current step
                currentBoard = fullPath[step];
                renderBoard();
                statusMsg.textContent = `AI Solution: Step ${step + 1} of ${solutionPath.length}`;
                step++;
            } else {
                // Animation finished
                clearInterval(interval);
                statusMsg.textContent = 'AI Solution complete! (Matches victory state)';
                statusMsg.style.color = '#28a745';
                isSolving = false;
                // Note: We don't re-enable the solve button, user must start a new game.
            }
        }, 500); // 500ms per step
    }

    // --- Event Listeners ---
    newGameBtn.addEventListener('click', startNewGame);
    solveBtn.addEventListener('click', showAiSolution);

    // Load the first game
    startNewGame();
});