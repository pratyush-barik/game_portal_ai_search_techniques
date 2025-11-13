document.addEventListener('DOMContentLoaded', () => {

    const boardElement = document.getElementById('sudoku-board');
    const newGameBtn = document.getElementById('new-game-btn');
    const solveBtn = document.getElementById('solve-btn');
    const checkBtn = document.getElementById('check-btn');
    const statusMsg = document.getElementById('status-message');

    let currentPuzzle = [];
    let currentSolution = [];

    /**
     * Renders the Sudoku board from a 2D array
     * @param {Array<Array<number>>} puzzle - The puzzle state
     */
    function renderBoard(puzzle) {
        boardElement.innerHTML = '';
        statusMsg.textContent = '';
        
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('input');
                cell.type = 'number';
                cell.min = 1;
                cell.max = 9;
                cell.classList.add('sudoku-cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                
                const value = puzzle[r][c];
                if (value !== 0) {
                    cell.value = value;
                    cell.readOnly = true;
                    cell.classList.add('given');
                } else {
                    cell.addEventListener('input', handleCellInput);
                }
                
                // Add classes for 3x3 box borders
                if (r % 3 === 0 && r !== 0) cell.classList.add('row-start');
                if (c % 3 === 0 && c !== 0) cell.classList.add('col-start');
                
                boardElement.appendChild(cell);
            }
        }
    }
    
    /**
     * Validates cell input (only 1-9)
     */
    function handleCellInput(e) {
        if (e.target.value.length > 1) {
            e.target.value = e.target.value.slice(0, 1);
        }
        if (e.target.value === '0') {
            e.target.value = '';
        }
    }
    
    /**
     * Reads the current values from the DOM into a 2D array
     * @returns {Array<Array<number>>} The current board state
     */
    function getBoardFromDOM() {
        const board = Array.from({ length: 9 }, () => Array(9).fill(0));
        const cells = boardElement.querySelectorAll('.sudoku-cell');
        cells.forEach(cell => {
            const r = cell.dataset.row;
            const c = cell.dataset.col;
            board[r][c] = parseInt(cell.value) || 0;
        });
        return board;
    }

    /**
     * Fills the DOM board with the solution
     * @param {Array<Array<number>>} solution - The solved 2D array
     */
    function showSolution(solution) {
        const cells = boardElement.querySelectorAll('.sudoku-cell');
        cells.forEach(cell => {
            const r = cell.dataset.row;
            const c = cell.dataset.col;
            if (!cell.classList.contains('given')) {
                cell.value = solution[r][c];
                cell.style.color = '#28a745'; // Highlight solved cells
            }
        });
    }

    /**
     * Fetches a new puzzle from the backend
     */
    async function startNewGame() {
        statusMsg.textContent = 'Generating new puzzle...';
        try {
            const response = await fetch('/sudoku/api/generate');
            const data = await response.json();
            currentPuzzle = data.puzzle;
            currentSolution = data.solution;
            renderBoard(currentPuzzle);
        } catch (error) {
            console.error('Error fetching new game:', error);
            statusMsg.textContent = 'Error: Could not load game.';
            statusMsg.style.color = 'red';
        }
    }

    /**
     * Asks the backend to solve the current puzzle
     */
    async function solveWithAI() {
        statusMsg.textContent = 'AI is solving...';
        
        // We can either use the known solution or ask the server to solve
        // Using the known solution is faster!
        if (currentSolution) {
            showSolution(currentSolution);
            statusMsg.textContent = 'AI Solution shown!';
            statusMsg.style.color = '#28a745';
        } else {
            // Fallback if we don't have the solution
            try {
                const response = await fetch('/sudoku/api/solve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ puzzle: currentPuzzle })
                });
                const data = await response.json();
                if (data.solution) {
                    showSolution(data.solution);
                    statusMsg.textContent = 'AI Solution shown!';
                    statusMsg.style.color = '#28a745';
                } else {
                    statusMsg.textContent = data.error || 'AI could not solve.';
                    statusMsg.style.color = 'red';
                }
            } catch (error) {
                console.error('Error solving puzzle:', error);
            }
        }
    }
    
    /**
     * Checks the user's solution against the known solution
     */
    function checkUserSolution() {
        const userBoard = getBoardFromDOM();
        const userSolution = JSON.stringify(userBoard);
        const correctSolution = JSON.stringify(currentSolution);

        if (userSolution === correctSolution) {
            statusMsg.textContent = 'Victory! You solved it correctly!';
            statusMsg.style.color = '#28a745';
        } else {
            statusMsg.textContent = 'Fail. That is not the correct solution.';
            statusMsg.style.color = 'red';
        }
    }

    // --- Event Listeners ---
    newGameBtn.addEventListener('click', startNewGame);
    solveBtn.addEventListener('click', solveWithAI);
    checkBtn.addEventListener('click', checkUserSolution);

    // Load the first game
    startNewGame();
});