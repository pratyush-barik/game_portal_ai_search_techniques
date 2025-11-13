import os
from flask import Flask, render_template, request, jsonify
from collections import deque
import random
import copy
import heapq 

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/8puzzle')
def puzzle_page():
    return render_template('8puzzle.html')

@app.route('/sudoku')
def sudoku_page():
    return render_template('sudoku.html')

@app.route('/snake')
def snake_page():
    return render_template('snake.html')

@app.route('/hanoi')
def hanoi_page():
    return render_template('hanoi.html')

GOAL_STATE = [[1, 2, 3], [4, 5, 6], [7, 8, 0]]
GOAL_TUPLE = tuple(tuple(row) for row in GOAL_STATE)

def find_blank(state):
    for r in range(3):
        for c in range(3):
            if state[r][c] == 0:
                return r, c
    return None

def get_neighbors(state):
    neighbors = []
    r, c = find_blank(state)
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    for dr, dc in directions:
        nr, nc = r + dr, c + dc
        if 0 <= nr < 3 and 0 <= nc < 3:
            new_state = [list(row) for row in state]
            new_state[r][c], new_state[nr][nc] = new_state[nr][nc], new_state[r][c]
            neighbors.append(new_state)
    return neighbors

def solve_puzzle_bfs(initial_state):
    start_tuple = tuple(tuple(row) for row in initial_state)
    if start_tuple == GOAL_TUPLE:
        return []
    queue = deque([(start_tuple, [])])
    visited = {start_tuple}
    while queue:
        current_state_tuple, path = queue.popleft()
        current_state_list = [list(row) for row in current_state_tuple]
        for neighbor_list in get_neighbors(current_state_list):
            neighbor_tuple = tuple(tuple(row) for row in neighbor_list)
            if neighbor_tuple not in visited:
                new_path = path + [neighbor_list]
                if neighbor_tuple == GOAL_TUPLE:
                    return new_path
                visited.add(neighbor_tuple)
                queue.append((neighbor_tuple, new_path))
    return None

def generate_puzzle_8():
    state = copy.deepcopy(GOAL_STATE)
    for _ in range(50):
        neighbors = get_neighbors(state)
        state = random.choice(neighbors)
    if state == GOAL_STATE:
        return generate_puzzle_8()
    return state

@app.route('/8puzzle/api/generate', methods=['GET'])
def get_new_puzzle():
    puzzle = generate_puzzle_8()
    return jsonify({'puzzle': puzzle})

@app.route('/8puzzle/api/solve', methods=['POST'])
def get_solution():
    data = request.json
    initial_state = data.get('puzzle')
    solution_path = solve_puzzle_bfs(initial_state)
    if solution_path is not None:
        return jsonify({'solution': solution_path})
    else:
        return jsonify({'error': 'Puzzle is unsolvable'}), 500
    
def find_empty_cell(board):
    for r in range(9):
        for c in range(9):
            if board[r][c] == 0:
                return r, c
    return None

def is_valid_move(board, row, col, num):
    if num in board[row]:
        return False
    if num in [board[r][col] for r in range(9)]:
        return False
    start_row, start_col = 3 * (row // 3), 3 * (col // 3)
    for r in range(start_row, start_row + 3):
        for c in range(start_col, start_col + 3):
            if board[r][c] == num:
                return False
    return True

def solve_sudoku_dfs(board):
    empty_cell = find_empty_cell(board)
    if not empty_cell:
        return True  
    row, col = empty_cell

    for num in range(1, 10):  
        if is_valid_move(board, row, col, num):
            board[row][col] = num  

            if solve_sudoku_dfs(board):
                return True 
            board[row][col] = 0
    
    return False  

def generate_sudoku_puzzle(difficulty=40):
    board = [[0 for _ in range(9)] for _ in range(9)]

    def fill_board(board):
        empty = find_empty_cell(board)
        if not empty:
            return True
        row, col = empty
        
        nums = list(range(1, 10))
        random.shuffle(nums) 
        
        for num in nums:
            if is_valid_move(board, row, col, num):
                board[row][col] = num
                if fill_board(board):
                    return True
                board[row][col] = 0
        return False

    fill_board(board)
    
    solution = [row[:] for row in board] 
    
    cells = list(range(81))
    random.shuffle(cells)
    for i in range(difficulty):
        row = cells[i] // 9
        col = cells[i] % 9
        board[row][col] = 0
        
    return board, solution


@app.route('/sudoku/api/generate', methods=['GET'])
def get_new_sudoku():
    puzzle, solution = generate_sudoku_puzzle(difficulty=40)
    return jsonify({'puzzle': puzzle, 'solution': solution})

@app.route('/sudoku/api/solve', methods=['POST'])
def solve_sudoku():
    data = request.json
    puzzle = data.get('puzzle')
    
    if not puzzle:
        return jsonify({'error': 'No puzzle provided'}), 400
    
    board_to_solve = [row[:] for row in puzzle]
    
    if solve_sudoku_dfs(board_to_solve):
        return jsonify({'solution': board_to_solve})
    else:
        return jsonify({'error': 'This puzzle has no solution'}), 500

def solve_hanoi_dfs(n_disks, source, target, auxiliary):
    moves = []
    
    def hanoi_recursive(n, src, tgt, aux):
        if n > 0:
            hanoi_recursive(n - 1, src, aux, tgt)
            
            moves.append({'disk': n, 'from': src, 'to': tgt})
            
            hanoi_recursive(n - 1, aux, tgt, src)

    hanoi_recursive(n_disks, source, target, auxiliary)
    return moves

@app.route('/hanoi/api/solve', methods=['POST'])
def solve_hanoi():
    data = request.json
    n_disks = data.get('n_disks', 3) 
    
    moves = solve_hanoi_dfs(n_disks, 'A', 'C', 'B')
    
    return jsonify({'moves': moves, 'n_disks': n_disks})

def heuristic_manhattan(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def solve_snake_astar(grid_size, head, food, body):

    width, height = grid_size
    start = tuple(head)
    goal = tuple(food)
    
    obstacles = set(tuple(cell) for cell in body)
    
    open_set = []
    heapq.heappush(open_set, (0, start))
    
    came_from = {} 
    
    g_score = { (x,y): float('inf') for x in range(width) for y in range(height) }
    g_score[start] = 0
    
    f_score = { (x,y): float('inf') for x in range(width) for y in range(height) }
    f_score[start] = heuristic_manhattan(start, goal)

    while open_set:
        _, current = heapq.heappop(open_set)

        if current == goal:
            
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            return path[::-1] 

        cx, cy = current
        neighbors = [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]
        
        for neighbor in neighbors:
            nx, ny = neighbor
            
            if not (0 <= nx < width and 0 <= ny < height):
                continue
                
            if neighbor in obstacles:
                continue
                
            tentative_g_score = g_score[current] + 1
            
            if tentative_g_score < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g_score
                f_score[neighbor] = tentative_g_score + heuristic_manhattan(neighbor, goal)
                
                if neighbor not in [i[1] for i in open_set]:
                    heapq.heappush(open_set, (f_score[neighbor], neighbor))
                    
    return None 

@app.route('/snake/api/solve', methods=['POST'])
def solve_snake():
    data = request.json
    grid_size = data.get('grid_size') 
    head = data.get('head')        
    food = data.get('food')       
    body = data.get('body')      
    
    if not all([grid_size, head, food, body]):
        return jsonify({'error': 'Incomplete game state provided'}), 400

    path = solve_snake_astar(grid_size, head, food, body)
    
    if path:
        return jsonify({'path': path})
    else:
        return jsonify({'error': 'No path found!', 'path': []})

if __name__ == '__main__':
    app.secret_key = os.urandom(24)
    app.run(debug=True, port=5000)