document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('start-btn');
    const solveBtn = document.getElementById('solve-btn');
    const autoBtn = document.getElementById('auto-btn');
    const statusMsg = document.getElementById('status-message');

    // Game settings
    const gridSize = 20; // 20x20 grid
    const tileSize = canvas.width / gridSize; // 400 / 20 = 20px per tile

    // Game state
    let snake, food, score, direction, gameLoop, aiPath, aiMode;

    function initGame() {
        // Reset game state
        snake = [
            { x: 10, y: 10 }, // Head
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        food = spawnFood();
        score = 0;
        direction = 'RIGHT';
        aiPath = []; // Clear AI path
        aiMode = false;
        
        statusMsg.textContent = `Score: ${score}`;
        
        if (gameLoop) clearInterval(gameLoop);
        draw(); // Initial draw
    }

    function startGameLoop(speed = 150) {
        if (gameLoop) clearInterval(gameLoop);
        gameLoop = setInterval(update, speed);
    }
    
    function draw() {
        // Clear canvas
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw snake
        snake.forEach((segment, index) => {
            ctx.fillStyle = (index === 0) ? '#00ff00' : '#00aa00';
            ctx.fillRect(segment.x * tileSize, segment.y * tileSize, tileSize, tileSize);
            ctx.strokeStyle = '#222';
            ctx.strokeRect(segment.x * tileSize, segment.y * tileSize, tileSize, tileSize);
        });
        
        // Draw food
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(food.x * tileSize, food.y * tileSize, tileSize, tileSize);
        
        // Draw AI path (if it exists)
        if (aiPath.length > 0) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            aiPath.forEach(step => {
                ctx.fillRect(step[0] * tileSize, step[1] * tileSize, tileSize, tileSize);
            });
        }
    }

    function update() {
        if (aiMode && aiPath.length > 0) {
            // AI Mode: Follow the A* path
            const nextStep = aiPath.shift(); // Get the next step from the path
            // Update direction based on nextStep
            const head = snake[0];
            if (nextStep[0] > head.x) direction = 'RIGHT';
            else if (nextStep[0] < head.x) direction = 'LEFT';
            else if (nextStep[1] > head.y) direction = 'DOWN';
            else if (nextStep[1] < head.y) direction = 'UP';
            
        } else if (aiMode && aiPath.length === 0) {
            // AI Mode: Path is empty, find a new one
            findAiPath(true); // 'true' means re-run game loop if path found
            // If findAiPath fails, AI will just move in current direction
        }
        
        // Get current head
        const head = { ...snake[0] };
        
        // Move head based on direction
        if (direction === 'RIGHT') head.x++;
        if (direction === 'LEFT') head.x--;
        if (direction === 'UP') head.y--;
        if (direction === 'DOWN') head.y++;
        
        // Check for game over (wall collision)
        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            return gameOver();
        }
        
        // Check for game over (self-collision)
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                return gameOver();
            }
        }

        // Add new head
        snake.unshift(head);
        
        // Check for food collision
        if (head.x === food.x && head.y === food.y) {
            score++;
            statusMsg.textContent = `Score: ${score}`;
            food = spawnFood();
            
            if (aiMode) { // In AI mode, find path to new food
                findAiPath(false);
            }
        } else {
            // Remove tail
            snake.pop();
        }
        
        draw();
    }
    
    function spawnFood() {
        let newFood;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * gridSize),
                y: Math.floor(Math.random() * gridSize)
            };
            // Ensure food doesn't spawn on the snake
            let onSnake = snake.some(seg => seg.x === newFood.x && seg.y === newFood.y);
            if (!onSnake) return newFood;
        }
    }

    function gameOver() {
        clearInterval(gameLoop);
        statusMsg.textContent = `Game Over! Final Score: ${score}`;
        aiMode = false;
    }

    /**
     * Calls the backend to find the A* path
     * @param {boolean} restartLoop - Restart game loop after finding path
     */
    async function findAiPath(restartLoop = false) {
        statusMsg.textContent = 'AI (A*) is thinking...';
        
        // Prep data for API
        const headPos = [snake[0].x, snake[0].y];
        const foodPos = [food.x, food.y];
        // Body (obstacles) must NOT include the head
        const bodyPos = snake.slice(1).map(seg => [seg.x, seg.y]);
        
        try {
            const response = await fetch('/snake/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grid_size: [gridSize, gridSize],
                    head: headPos,
                    food: foodPos,
                    body: bodyPos
                })
            });
            const data = await response.json();
            
            if (data.path && data.path.length > 0) {
                aiPath = data.path;
                statusMsg.textContent = 'AI found a path!';
                draw(); // Redraw to show the path
                if (restartLoop) startGameLoop(100); // Start fast for AI
            } else {
                statusMsg.textContent = 'AI could not find a path!';
                aiPath = [];
                if (aiMode) {
                    // No path found, just continue in current direction
                    if (restartLoop) startGameLoop(100);
                }
            }
        } catch (error) {
            console.error('Error solving snake path:', error);
            statusMsg.textContent = 'Error calling A* solver.';
        }
    }

    // --- Event Listeners ---
    
    // User control
    document.addEventListener('keydown', e => {
        if (aiMode) return; // Ignore user input in AI mode
        
        if (e.key === 'ArrowUp' && direction !== 'DOWN') direction = 'UP';
        if (e.key === 'ArrowDown' && direction !== 'UP') direction = 'DOWN';
        if (e.key === 'ArrowLeft' && direction !== 'RIGHT') direction = 'LEFT';
        if (e.key === 'ArrowRight' && direction !== 'LEFT') direction = 'RIGHT';
    });

    startBtn.addEventListener('click', () => {
        aiMode = false;
        initGame();
        startGameLoop(150); // Normal user speed
    });
    
    solveBtn.addEventListener('click', () => {
        // Just finds and draws the path, doesn't run it
        aiMode = false;
        clearInterval(gameLoop);
        findAiPath(false);
    });
    
    autoBtn.addEventListener('click', () => {
        aiMode = true;
        initGame();
        findAiPath(true); // Find path and start the loop
    });

    // Initial game setup
    initGame();
});