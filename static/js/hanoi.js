document.addEventListener('DOMContentLoaded', () => {

    const towerA = document.getElementById('tower-A');
    const towerB = document.getElementById('tower-B');
    const towerC = document.getElementById('tower-C');
    const slider = document.getElementById('disk-slider');
    const diskCountSpan = document.getElementById('disk-count');
    const startBtn = document.getElementById('start-btn');
    const solveBtn = document.getElementById('solve-btn');
    const statusMsg = document.getElementById('status-message');

    let numDisks = 4;
    let isSolving = false;
    let userMoves = 0;

    /**
     * Creates the initial stack of disks
     */
    function createDisks() {
        towerA.innerHTML = '<div class="peg"></div>'; // Clear towers
        towerB.innerHTML = '<div class="peg"></div>';
        towerC.innerHTML = '<div class="peg"></div>';
        statusMsg.textContent = '';
        isSolving = false;
        solveBtn.disabled = false;
        userMoves = 0;
        
        numDisks = parseInt(slider.value);
        diskCountSpan.textContent = numDisks;

        for (let i = numDisks; i >= 1; i--) {
            const disk = document.createElement('div');
            disk.classList.add('disk');
            disk.dataset.disk = i;
            towerA.appendChild(disk);
        }
        
        // Add drag-and-drop for user interaction
        makeDraggable();
    }

    /**
     * Asks the backend for the solution and animates it
     */
    async function showAiSolution() {
        if (isSolving) return;
        
        isSolving = true;
        solveBtn.disabled = true;
        statusMsg.textContent = 'AI is calculating moves...';
        
        // Ensure board is in start state before solving
        createDisks(); 

        try {
            const response = await fetch('/hanoi/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ n_disks: numDisks })
            });
            const data = await response.json();
            
            if (data.moves) {
                statusMsg.textContent = 'AI Solution:';
                animateSolution(data.moves);
            } else {
                throw new Error(data.error || 'Unknown solver error');
            }
            
        } catch (error) {
            console.error('Error solving puzzle:', error);
            statusMsg.textContent = 'Error: Could not find solution.';
            isSolving = false;
            solveBtn.disabled = false;
        }
    }

    /**
     * Animates the solution path returned by the AI
     * @param {Array<object>} moves - An array of move objects
     */
    function animateSolution(moves) {
        let step = 0;
        
        const interval = setInterval(() => {
            if (step < moves.length) {
                const move = moves[step];
                const fromTower = document.getElementById(`tower-${move.from}`);
                const toTower = document.getElementById(`tower-${move.to}`);
                
                // Find the specific disk (it will be the last child)
                const disk = fromTower.querySelector(`.disk[data-disk="${move.disk}"]`);
                
                if (disk) {
                    toTower.appendChild(disk); // Move the disk
                    statusMsg.textContent = `AI Solution: Move ${step + 1} / ${moves.length} (Disk ${move.disk}: ${move.from} to ${move.to})`;
                }
                step++;
            } else {
                clearInterval(interval);
                statusMsg.textContent = `AI Solution complete in ${moves.length} moves!`;
                statusMsg.style.color = '#28a745';
                checkVictory(); // Should be victory
            }
        }, 500); // 500ms per step
    }

    // --- User Interaction (Drag and Drop) ---
    // This is complex, so here's a simplified version
    let draggedDisk = null;

    function makeDraggable() {
        const disks = document.querySelectorAll('.disk');
        disks.forEach(disk => {
            disk.draggable = true;
            disk.addEventListener('dragstart', dragStart);
        });
        
        const towers = document.querySelectorAll('.tower');
        towers.forEach(tower => {
            tower.addEventListener('dragover', dragOver);
            tower.addEventListener('drop', drop);
        });
    }

    function dragStart(e) {
        // Can only drag the top disk
        const topDisk = e.target.parentElement.lastElementChild;
        if (e.target === topDisk && !isSolving) {
            draggedDisk = e.target;
        } else {
            e.preventDefault();
        }
    }

    function dragOver(e) {
        e.preventDefault(); // Allow dropping
    }

    function drop(e) {
        e.preventDefault();
        if (!draggedDisk) return;

        const targetTower = e.target.closest('.tower');
        if (!targetTower) return;
        
        const topDiskEl = targetTower.lastElementChild;
        // Check if tower is empty (only has .peg) or if disk is smaller
        const topDiskSize = (topDiskEl && topDiskEl.classList.contains('disk')) ? parseInt(topDiskEl.dataset.disk) : 0;
        const droppedDiskSize = parseInt(draggedDisk.dataset.disk);

        if (topDiskSize === 0 || droppedDiskSize < topDiskSize) {
            // Valid move
            targetTower.appendChild(draggedDisk);
            userMoves++;
            statusMsg.textContent = `User Moves: ${userMoves}`;
            checkVictory();
        }
        
        draggedDisk = null;
    }

    function checkVictory() {
        // Victory is when Tower C has all disks
        if (towerC.querySelectorAll('.disk').length === numDisks) {
            statusMsg.textContent = `Victory! You solved it in ${userMoves} moves!`;
            statusMsg.style.color = '#28a745';
        }
    }

    // --- Event Listeners ---
    slider.addEventListener('input', createDisks);
    startBtn.addEventListener('click', createDisks);
    solveBtn.addEventListener('click', showAiSolution);

    // Load the first game
    createDisks();
});