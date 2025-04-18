// Global Variables
let activeSection = 'shortest-route';

// Tab Navigation
document.querySelectorAll('nav button').forEach(button => {
    button.addEventListener('click', function() {
        const targetSection = this.id.replace('-btn', '');
        changeSection(targetSection);
    });
});

function changeSection(sectionId) {
    // Update active button
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(sectionId + '-btn').classList.add('active');
    
    // Update active section
    document.querySelectorAll('main section').forEach(section => {
        section.classList.remove('active-section');
    });
    document.getElementById(sectionId).classList.add('active-section');
    
    activeSection = sectionId;
    
    // Initialize the active section if needed
    if (sectionId === 'shortest-route' && !document.querySelector('.grid-cell')) {
        initializeGrid();
    } else if (sectionId === 'collision-prevention') {
        initializeCollisionPrevention();
    } else if (sectionId === 'traffic-simulation') {
        initializeTrafficSimulation();
    } else if (sectionId === 'traffic-light-management') {
        initializeTrafficLights();
    }
}

// ----------------- SHORTEST ROUTE SECTION -----------------
let grid = [];
let gridSize = 10;
let startNode = null;
let endNode = null;
let obstacles = [];
let currentPath = [];

function initializeGrid() {
    gridSize = parseInt(document.getElementById('grid-size').value);
    grid = [];
    startNode = null;
    endNode = null;
    obstacles = [];
    currentPath = [];
    
    const gridContainer = document.getElementById('grid-container');
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    
    for (let row = 0; row < gridSize; row++) {
        grid[row] = [];
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            cell.addEventListener('click', () => handleCellClick(row, col));
            
            gridContainer.appendChild(cell);
            grid[row][col] = {
                row,
                col,
                isStart: false,
                isEnd: false,
                isObstacle: false,
                isPath: false,
                g: 0,
                h: 0,
                f: 0,
                parent: null
            };
        }
    }
    
    document.getElementById('path-info').textContent = '';
}

function handleCellClick(row, col) { //to handle cell click
    // Clear previous path
    clearPath();
    
    if (!startNode) {
        // First click - place start node
        startNode = { row, col };
        grid[row][col].isStart = true;
        updateGridUI();
    } else if (!endNode) {
        // Second click - place end node (if not on start)
        if (!(row === startNode.row && col === startNode.col)) {
            endNode = { row, col };
            grid[row][col].isEnd = true;
            updateGridUI();
        }
    } else {
        // Additional clicks - toggle obstacles (if not on start/end)
        if (!(row === startNode.row && col === startNode.col) && 
            !(row === endNode.row && col === endNode.col)) {
            grid[row][col].isObstacle = !grid[row][col].isObstacle;
            
            // Update obstacles array
            const obstacleIndex = obstacles.findIndex(o => o.row === row && o.col === col);
            if (grid[row][col].isObstacle && obstacleIndex === -1) {
                obstacles.push({ row, col });
            } else if (!grid[row][col].isObstacle && obstacleIndex !== -1) {
                obstacles.splice(obstacleIndex, 1);
            }
            
            updateGridUI();
        }
    }
}

function updateGridUI() {
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
            cell.classList.remove('start', 'end', 'obstacle', 'path');
            
            if (grid[row][col].isStart) {
                cell.classList.add('start');
            } else if (grid[row][col].isEnd) {
                cell.classList.add('end');
            } else if (grid[row][col].isObstacle) {
                cell.classList.add('obstacle');
            } else if (grid[row][col].isPath) {
                cell.classList.add('path');
            }
        }
    }
}

function findShortestPath() { // find the shortest path
    // Check if start and end nodes are set
    if (!startNode || !endNode) {
        document.getElementById('path-info').textContent = 'Please set both start and end points';
        return;
    }
    
    // Clear previous path
    clearPath();
    
    // A* algorithm
    const openSet = [];
    const closedSet = [];
    
    // Reset grid nodes
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            grid[row][col].g = 0;
            grid[row][col].h = 0;
            grid[row][col].f = 0;
            grid[row][col].parent = null;
        }
    }
    
    const startGridNode = grid[startNode.row][startNode.col];
    startGridNode.g = 0;
    startGridNode.h = heuristic(startNode, endNode);
    startGridNode.f = startGridNode.h;
    
    openSet.push(startGridNode);
    
    while (openSet.length > 0) {
        // Find node with lowest f value
        let lowestIndex = 0;
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }
        
        const current = openSet[lowestIndex];
        
        // Check if we reached the end
        if (current.row === endNode.row && current.col === endNode.col) {
            let path = [];
            let temp = current;
            path.push(temp);
            
            while (temp.parent) {
                path.push(temp.parent);
                temp = temp.parent;
            }
            
            // Remove start and end nodes from path
            path = path.filter(node => 
                !(node.row === startNode.row && node.col === startNode.col) && 
                !(node.row === endNode.row && node.col === endNode.col));
            
            // Update path in grid
            for (const node of path) {
                grid[node.row][node.col].isPath = true;
            }
            
            currentPath = path;
            updateGridUI();
            
            document.getElementById('path-info').textContent = 
                `Shortest path found! Length: ${path.length + 1} steps.`;
            
            return;
        }
        
        // Remove current from open set
        openSet.splice(lowestIndex, 1);
        closedSet.push(current);
        
        // Check neighbors
        const neighbors = getNeighbors(current);
        
        for (const neighbor of neighbors) {
            // Skip if in closed set or is obstacle
            if (closedSet.includes(neighbor) || neighbor.isObstacle) {
                continue;
            }
            
            const tentativeG = current.g + 1;
            
            let newPath = false;
            if (openSet.includes(neighbor)) {
                if (tentativeG < neighbor.g) {
                    neighbor.g = tentativeG;
                    newPath = true;
                }
            } else {
                neighbor.g = tentativeG;
                newPath = true;
                openSet.push(neighbor);
            }
            
            if (newPath) {
                neighbor.h = heuristic({ row: neighbor.row, col: neighbor.col }, endNode);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = current;
            }
        }
    }
    
    document.getElementById('path-info').textContent = 'No path found!';
}

function heuristic(a, b) {
    // Manhattan distance
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function getNeighbors(node) {
    const neighbors = [];
    const { row, col } = node;
    
    // Check all 4 adjacent cells
    const directions = [
        { row: -1, col: 0 }, // Up
        { row: 1, col: 0 },  // Down
        { row: 0, col: -1 }, // Left
        { row: 0, col: 1 }   // Right
    ];
    
    for (const dir of directions) {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        
        // Check if valid cell
        if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
            neighbors.push(grid[newRow][newCol]);
        }
    }
    
    return neighbors;
}

function clearPath() {
    // Clear current path
    for (const node of currentPath) {
        grid[node.row][node.col].isPath = false;
    }
    currentPath = [];
    updateGridUI();
    document.getElementById('path-info').textContent = '';
}

// Event listeners for shortest path section
document.getElementById('grid-size').addEventListener('change', initializeGrid);
document.getElementById('reset-grid').addEventListener('click', initializeGrid);
document.getElementById('find-path').addEventListener('click', findShortestPath);

// ----------------- COLLISION PREVENTION SECTION -----------------
// Collision Prevention System for Traffic Management
// This code simulates vehicles and implements collision detection and prevention

// Enhanced Collision Prevention System for Traffic Management
// Traffic Map Environment with Road Network and Random Car Spawning

// Collision Prevention System Code
document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const collisionBtn = document.getElementById('collision-btn');
  const collisionSection = document.getElementById('collision-prevention');
  const createNetworkBtn = document.getElementById('create-network');
  const startCollisionSimBtn = document.getElementById('start-collision-sim');
  const stopCollisionSimBtn = document.getElementById('stop-collision-sim');
  const addVehicleBtn = document.getElementById('add-vehicle');
  const algorithmSelect = document.getElementById('algorithm-select');
  const vehicleCountEl = document.getElementById('vehicle-count');
  const preventedCountEl = document.getElementById('prevented-count');
  const canvas = document.getElementById('collision-canvas');
  
  // Check if all elements exist
  if (!canvas) {
      console.error('Collision canvas not found');
      return;
  }
  
  const ctx = canvas.getContext('2d');

  // Navigation between sections - Fix section toggling
  collisionBtn.addEventListener('click', () => {
      // Hide all sections
      const allSections = document.querySelectorAll('section');
      allSections.forEach(section => {
          section.style.display = 'none';
          section.classList.remove('active-section');
      });
      
      // Remove active class from all nav buttons
      document.querySelectorAll('nav button').forEach(btn => {
          btn.classList.remove('active');
      });
      
      // Show collision section and set button as active
      collisionSection.style.display = 'block';
      collisionSection.classList.add('active-section');
      collisionBtn.classList.add('active');
  });

  // Simulation variables
  let isSimulating = false;
  let animationFrameId = null;
  let roadNetwork = null;
  let vehicles = [];
  let collisionPrevented = 0;
  
  // Quad-tree for spatial partitioning
  class QuadTree {
      constructor(boundary, capacity) {
          this.boundary = boundary;
          this.capacity = capacity;
          this.points = [];
          this.divided = false;
          this.northwest = null;
          this.northeast = null;
          this.southwest = null;
          this.southeast = null;
      }

      // Check if the boundary contains the point
      contains(point) {
          return (
              point.x >= this.boundary.x - this.boundary.w &&
              point.x <= this.boundary.x + this.boundary.w &&
              point.y >= this.boundary.y - this.boundary.h &&
              point.y <= this.boundary.y + this.boundary.h
          );
      }

      // Divide the quad tree into four quadrants
      subdivide() {
          const x = this.boundary.x;
          const y = this.boundary.y;
          const w = this.boundary.w / 2;
          const h = this.boundary.h / 2;

          const nw = { x: x - w, y: y - h, w, h };
          const ne = { x: x + w, y: y - h, w, h };
          const sw = { x: x - w, y: y + h, w, h };
          const se = { x: x + w, y: y + h, w, h };

          this.northwest = new QuadTree(nw, this.capacity);
          this.northeast = new QuadTree(ne, this.capacity);
          this.southwest = new QuadTree(sw, this.capacity);
          this.southeast = new QuadTree(se, this.capacity);

          this.divided = true;
      }

      // Insert a point into the quad tree
      insert(point) {
          if (!this.contains(point)) {
              return false;
          }

          if (this.points.length < this.capacity) {
              this.points.push(point);
              return true;
          }

          if (!this.divided) {
              this.subdivide();
          }

          return (
              this.northwest.insert(point) ||
              this.northeast.insert(point) ||
              this.southwest.insert(point) ||
              this.southeast.insert(point)
          );
      }

      // Query points in a range
      query(range, found = []) {
          if (!this.intersects(range)) {
              return found;
          }

          for (const point of this.points) {
              if (this.pointInRange(point, range)) {
                  found.push(point);
              }
          }

          if (this.divided) {
              this.northwest.query(range, found);
              this.northeast.query(range, found);
              this.southwest.query(range, found);
              this.southeast.query(range, found);
          }

          return found;
      }

      // Check if the boundary intersects with the range
      intersects(range) {
          return !(
              range.x - range.w > this.boundary.x + this.boundary.w ||
              range.x + range.w < this.boundary.x - this.boundary.w ||
              range.y - range.h > this.boundary.y + this.boundary.h ||
              range.y + range.h < this.boundary.y - this.boundary.h
          );
      }

      // Check if a point is in the range
      pointInRange(point, range) {
          return (
              point.x >= range.x - range.w &&
              point.x <= range.x + range.w &&
              point.y >= range.y - range.h &&
              point.y <= range.y + range.h
          );
      }
  }

  // DisjointSet class for managing lane merging conflicts
  class DisjointSet {
      constructor() {
          this.parent = new Map();
          this.rank = new Map();
      }

      makeSet(element) {
          this.parent.set(element, element);
          this.rank.set(element, 0);
      }

      find(element) {
          if (!this.parent.has(element)) {
              this.makeSet(element);
              return element;
          }

          if (element !== this.parent.get(element)) {
              this.parent.set(element, this.find(this.parent.get(element)));
          }
          
          return this.parent.get(element);
      }

      union(x, y) {
          const rootX = this.find(x);
          const rootY = this.find(y);

          if (rootX === rootY) return;

          if (this.rank.get(rootX) < this.rank.get(rootY)) {
              this.parent.set(rootX, rootY);
          } else if (this.rank.get(rootX) > this.rank.get(rootY)) {
              this.parent.set(rootY, rootX);
          } else {
              this.parent.set(rootY, rootX);
              this.rank.set(rootX, this.rank.get(rootX) + 1);
          }
      }
  }

  // Road Network Graph
  class RoadNetwork {
      constructor() {
          this.nodes = new Map();  // Intersections
          this.edges = new Map();  // Roads
          this.disjointSet = new DisjointSet();  // For lane merging
      }

      addNode(id, x, y) {
          this.nodes.set(id, { id, x, y, edges: [] });
          return this.nodes.get(id);
      }

      addEdge(fromId, toId, weight = 1) {
          if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
              return false;
          }

          const fromNode = this.nodes.get(fromId);
          const toNode = this.nodes.get(toId);

          // Add the edge to the from node's edge list
          fromNode.edges.push({ to: toId, weight });

          // Store the edge with a unique key
          const edgeKey = `${fromId}-${toId}`;
          this.edges.set(edgeKey, {
              from: fromId,
              to: toId,
              weight,
              traffic: 0  // Track traffic on this road
          });

          return true;
      }

      // Dijkstra's algorithm for finding shortest path
      dijkstra(startId, endId) {
          if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
              return null;
          }

          const distances = new Map();
          const previous = new Map();
          const unvisited = new Set();

          // Initialize distances and unvisited set
          for (const [nodeId] of this.nodes) {
              distances.set(nodeId, nodeId === startId ? 0 : Infinity);
              unvisited.add(nodeId);
          }

          while (unvisited.size > 0) {
              // Find the node with the smallest distance
              let current = null;
              let minDistance = Infinity;

              for (const nodeId of unvisited) {
                  const distance = distances.get(nodeId);
                  if (distance < minDistance) {
                      minDistance = distance;
                      current = nodeId;
                  }
              }

              // If we've reached the end or there's no path
              if (current === endId || minDistance === Infinity) {
                  break;
              }

              // Remove current from unvisited
              unvisited.delete(current);

              // Update distances to neighbors
              const node = this.nodes.get(current);
              for (const edge of node.edges) {
                  const neighbor = edge.to;
                  // Add traffic to the weight for more realistic routing
                  const edgeKey = `${current}-${neighbor}`;
                  const edgeData = this.edges.get(edgeKey);
                  const weight = edge.weight + (edgeData ? edgeData.traffic * 0.1 : 0);
                  
                  const totalDistance = distances.get(current) + weight;
                  
                  if (totalDistance < distances.get(neighbor)) {
                      distances.set(neighbor, totalDistance);
                      previous.set(neighbor, current);
                  }
              }
          }

          // Build the path
          const path = [];
          let current = endId;

          // If there's no path to the end
          if (previous.get(endId) === undefined && startId !== endId) {
              return null;
          }

          while (current !== undefined) {
              path.unshift(current);
              current = previous.get(current);
          }

          return path;
      }

      // A* algorithm for finding shortest path with heuristic
      aStar(startId, endId) {
          if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
              return null;
          }

          const openSet = new Set([startId]);
          const closedSet = new Set();
          const gScore = new Map();
          const fScore = new Map();
          const cameFrom = new Map();

          // Initialize scores
          for (const [nodeId] of this.nodes) {
              gScore.set(nodeId, nodeId === startId ? 0 : Infinity);
              fScore.set(nodeId, this.heuristic(nodeId, endId));
          }

          while (openSet.size > 0) {
              // Find node with lowest fScore
              let current = null;
              let lowestFScore = Infinity;

              for (const nodeId of openSet) {
                  const score = fScore.get(nodeId);
                  if (score < lowestFScore) {
                      lowestFScore = score;
                      current = nodeId;
                  }
              }

              // If we've reached the end
              if (current === endId) {
                  // Reconstruct path
                  const path = [];
                  let curr = current;
                  while (curr !== undefined) {
                      path.unshift(curr);
                      curr = cameFrom.get(curr);
                  }
                  return path;
              }

              // Move current from open to closed
              openSet.delete(current);
              closedSet.add(current);

              // Check neighbors
              const node = this.nodes.get(current);
              for (const edge of node.edges) {
                  const neighbor = edge.to;
                  
                  // Skip if in closed set
                  if (closedSet.has(neighbor)) {
                      continue;
                  }

                  // Add traffic to the weight
                  const edgeKey = `${current}-${neighbor}`;
                  const edgeData = this.edges.get(edgeKey);
                  const weight = edge.weight + (edgeData ? edgeData.traffic * 0.1 : 0);
                  
                  // Calculate tentative gScore
                  const tentativeGScore = gScore.get(current) + weight;
                  
                  // Add to open set if not there
                  if (!openSet.has(neighbor)) {
                      openSet.add(neighbor);
                  } else if (tentativeGScore >= gScore.get(neighbor)) {
                      continue; // Not a better path
                  }

                  // This path is the best so far
                  cameFrom.set(neighbor, current);
                  gScore.set(neighbor, tentativeGScore);
                  fScore.set(neighbor, gScore.get(neighbor) + this.heuristic(neighbor, endId));
              }
          }

          // No path found
          return null;
      }

      // Heuristic function for A* (Euclidean distance)
      heuristic(nodeId1, nodeId2) {
          const node1 = this.nodes.get(nodeId1);
          const node2 = this.nodes.get(nodeId2);
          
          return Math.sqrt(
              Math.pow(node2.x - node1.x, 2) + 
              Math.pow(node2.y - node1.y, 2)
          );
      }

      // Update traffic on a road
      updateTraffic(fromId, toId, value = 1) {
          const edgeKey = `${fromId}-${toId}`;
          if (this.edges.has(edgeKey)) {
              const edge = this.edges.get(edgeKey);
              edge.traffic += value;
              // Cap traffic to avoid extreme values
              edge.traffic = Math.min(edge.traffic, 10);
          }
      }

      // Decrease traffic (call periodically)
      decreaseTraffic() {
          for (const [key, edge] of this.edges) {
              if (edge.traffic > 0) {
                  edge.traffic -= 0.1;
                  edge.traffic = Math.max(0, edge.traffic);
              }
          }
      }

      // Draw the road network
      draw(ctx) {
          if (!ctx) return;
          
          // Draw roads
          ctx.strokeStyle = '#444';
          ctx.lineWidth = 4;
          
          for (const [key, edge] of this.edges) {
              const fromNode = this.nodes.get(edge.from);
              const toNode = this.nodes.get(edge.to);
              
              // Calculate traffic color (green to red)
              const trafficIntensity = Math.min(edge.traffic / 5, 1);
              const r = Math.floor(trafficIntensity * 255);
              const g = Math.floor((1 - trafficIntensity) * 255);
              ctx.strokeStyle = `rgb(${r}, ${g}, 0)`;
              
              ctx.beginPath();
              ctx.moveTo(fromNode.x, fromNode.y);
              ctx.lineTo(toNode.x, toNode.y);
              ctx.stroke();
          }
          
          // Draw intersections
          ctx.fillStyle = '#222';
          for (const [id, node] of this.nodes) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
              ctx.fill();
          }
      }
  }

  // Vehicle class
  class Vehicle {
      constructor(id, startNodeId, endNodeId, network, algorithm = 'dijkstra') {
          this.id = id;
          this.startNodeId = startNodeId;
          this.endNodeId = endNodeId;
          this.network = network;
          this.algorithm = algorithm;
          this.path = [];
          this.currentPathIndex = 0;
          this.x = 0;
          this.y = 0;
          this.speed = 1 + Math.random() * 1.5;  // Random speed between 1-2.5
          this.reached = false;
          this.color = this.getRandomColor();
          this.width = 10;
          this.height = 6;
          this.angle = 0;
          
          // Calculate path
          this.calculatePath();
          
          // Set initial position
          const startNode = this.network.nodes.get(this.startNodeId);
          if (startNode) {
              this.x = startNode.x;
              this.y = startNode.y;
          }
      }
      
      getRandomColor() {
          const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
          return colors[Math.floor(Math.random() * colors.length)];
      }
      
      calculatePath() {
          if (this.algorithm === 'astar') {
              this.path = this.network.aStar(this.startNodeId, this.endNodeId) || [];
          } else {
              this.path = this.network.dijkstra(this.startNodeId, this.endNodeId) || [];
          }
      }
      
      update() {
          if (this.reached || this.path.length === 0 || this.currentPathIndex >= this.path.length - 1) {
              this.reached = true;
              return;
          }
          
          const currentNodeId = this.path[this.currentPathIndex];
          const nextNodeId = this.path[this.currentPathIndex + 1];
          
          const currentNode = this.network.nodes.get(currentNodeId);
          const nextNode = this.network.nodes.get(nextNodeId);
          
          // Calculate direction vector
          const dx = nextNode.x - this.x;
          const dy = nextNode.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Update angle for drawing
          this.angle = Math.atan2(dy, dx);
          
          // Move vehicle
          if (distance < this.speed) {
              // Reached the next node
              this.x = nextNode.x;
              this.y = nextNode.y;
              this.currentPathIndex++;
              
              // Update traffic on the road segment we just traversed
              this.network.updateTraffic(currentNodeId, nextNodeId);
          } else {
              // Move toward next node
              this.x += (dx / distance) * this.speed;
              this.y += (dy / distance) * this.speed;
          }
      }
      
      draw(ctx) {
          if (!ctx) return;
          
          ctx.save();
          ctx.translate(this.x, this.y);
          ctx.rotate(this.angle);
          
          // Draw vehicle (simple rectangle)
          ctx.fillStyle = this.color;
          ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
          
          ctx.restore();
      }
      
      // Get bounding box for collision detection
      getBoundingBox() {
          // Calculate rotated corners of the vehicle
          const cos = Math.cos(this.angle);
          const sin = Math.sin(this.angle);
          
          const w2 = this.width / 2;
          const h2 = this.height / 2;
          
          // Calculate the four corners
          const corners = [
              {
                  x: this.x + cos * -w2 - sin * -h2,
                  y: this.y + sin * -w2 + cos * -h2
              },
              {
                  x: this.x + cos * w2 - sin * -h2,
                  y: this.y + sin * w2 + cos * -h2
              },
              {
                  x: this.x + cos * w2 - sin * h2,
                  y: this.y + sin * w2 + cos * h2
              },
              {
                  x: this.x + cos * -w2 - sin * h2,
                  y: this.y + sin * -w2 + cos * h2
              }
          ];
          
          // Find min and max x, y
          let minX = corners[0].x;
          let minY = corners[0].y;
          let maxX = corners[0].x;
          let maxY = corners[0].y;
          
          for (let i = 1; i < corners.length; i++) {
              minX = Math.min(minX, corners[i].x);
              minY = Math.min(minY, corners[i].y);
              maxX = Math.max(maxX, corners[i].x);
              maxY = Math.max(maxY, corners[i].y);
          }
          
          return {
              x: (minX + maxX) / 2,
              y: (minY + maxY) / 2,
              w: (maxX - minX) / 2,
              h: (maxY - minY) / 2
          };
      }
  }

  function createRoadNetwork() {
    // Make sure canvas exists
    if (!canvas || !ctx) {
        console.error('Canvas or context is not available');
        return;
    }
    
    roadNetwork = new RoadNetwork();
    
    // Define grid parameters
    const gridSize = 5; // Smaller grid for simplicity (5x5)
    const spacing = 100; // Spacing between nodes
    const startX = canvas.width / 2 - (gridSize - 1) * spacing / 2;
    const startY = canvas.height / 2 - (gridSize - 1) * spacing / 2;
    
    // Create grid nodes
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const nodeId = `${i}-${j}`;
            const x = startX + i * spacing;
            const y = startY + j * spacing;
            roadNetwork.addNode(nodeId, x, y);
        }
    }
    
    // Create basic grid edges (horizontal and vertical roads)
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            // Horizontal connections
            if (i < gridSize - 1) {
                roadNetwork.addEdge(`${i}-${j}`, `${i+1}-${j}`);
                roadNetwork.addEdge(`${i+1}-${j}`, `${i}-${j}`); // Bidirectional
            }
            // Vertical connections
            if (j < gridSize - 1) {
                roadNetwork.addEdge(`${i}-${j}`, `${i}-${j+1}`);
                roadNetwork.addEdge(`${i}-${j+1}`, `${i}-${j}`); // Bidirectional
            }
        }
    }
    
    // Add roundabouts at specific intersections (e.g., every other intersection)
    const roundaboutSize = 20; // Radius of roundabout nodes
    for (let i = 1; i < gridSize - 1; i += 2) {
        for (let j = 1; j < gridSize - 1; j += 2) {
            const centerId = `${i}-${j}`;
            const centerNode = roadNetwork.nodes.get(centerId);
            
            // Create roundabout nodes (4 points around the center)
            const roundaboutNodes = [
                `${centerId}-n`, // North
                `${centerId}-e`, // East
                `${centerId}-s`, // South
                `${centerId}-w`  // West
            ];
            
            // Add roundabout nodes to the network
            roadNetwork.addNode(roundaboutNodes[0], centerNode.x, centerNode.y - roundaboutSize); // North
            roadNetwork.addNode(roundaboutNodes[1], centerNode.x + roundaboutSize, centerNode.y); // East
            roadNetwork.addNode(roundaboutNodes[2], centerNode.x, centerNode.y + roundaboutSize); // South
            roadNetwork.addNode(roundaboutNodes[3], centerNode.x - roundaboutSize, centerNode.y); // West
            
            // Connect roundabout nodes in a circle (clockwise)
            roadNetwork.addEdge(roundaboutNodes[0], roundaboutNodes[1]); // N -> E
            roadNetwork.addEdge(roundaboutNodes[1], roundaboutNodes[2]); // E -> S
            roadNetwork.addEdge(roundaboutNodes[2], roundaboutNodes[3]); // S -> W
            roadNetwork.addEdge(roundaboutNodes[3], roundaboutNodes[0]); // W -> N
            
            // Connect roundabout to the grid
            roadNetwork.addEdge(`${i-1}-${j}`, roundaboutNodes[3]); // Left road to West
            roadNetwork.addEdge(roundaboutNodes[3], `${i-1}-${j}`); // West to left road
            roadNetwork.addEdge(`${i+1}-${j}`, roundaboutNodes[1]); // Right road to East
            roadNetwork.addEdge(roundaboutNodes[1], `${i+1}-${j}`); // East to right road
            roadNetwork.addEdge(`${i}-${j-1}`, roundaboutNodes[0]); // Top road to North
            roadNetwork.addEdge(roundaboutNodes[0], `${i}-${j-1}`); // North to top road
            roadNetwork.addEdge(`${i}-${j+1}`, roundaboutNodes[2]); // Bottom road to South
            roadNetwork.addEdge(roundaboutNodes[2], `${i}-${j+1}`); // South to bottom road
            
            // Remove the original intersection node from traffic flow (optional)
            // Alternatively, we could keep it as a visual marker but not connect it directly
        }
    }
    
    render();
    
    console.log('Simple grid road network with roundabouts created successfully');
}
  // Add a new vehicle to the simulation
  function addVehicle() {
      if (!roadNetwork) {
          console.error('Cannot add vehicle: Road network not created');
          return;
      }
      
      // Get random start and end nodes
      const nodeIds = Array.from(roadNetwork.nodes.keys());
      const startNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
      
      let endNodeId;
      do {
          endNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
      } while (endNodeId === startNodeId);
      
      // Create vehicle
      const vehicle = new Vehicle(
          vehicles.length, 
          startNodeId, 
          endNodeId, 
          roadNetwork,
          algorithmSelect.value
      );
      
      vehicles.push(vehicle);
      vehicleCountEl.textContent = vehicles.length;
      console.log(`Vehicle added: ${startNodeId} to ${endNodeId}`);
  }
  
  // Initialize collision prevention buttons
  if (createNetworkBtn) {
      createNetworkBtn.addEventListener('click', () => {
          console.log('Creating road network...');
          createRoadNetwork();
      });
  } else {
      console.error('Create Network button not found');
  }
  
  if (startCollisionSimBtn) {
      startCollisionSimBtn.addEventListener('click', () => {
          console.log('Starting simulation...');
          if (!roadNetwork) {
              console.log('No road network, creating one...');
              createRoadNetwork();
          }
          
          isSimulating = true;
          startSimulation();
      });
  } else {
      console.error('Start Simulation button not found');
  }
  
  if (stopCollisionSimBtn) {
      stopCollisionSimBtn.addEventListener('click', () => {
          console.log('Stopping simulation...');
          isSimulating = false;
          if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
          }
      });
  } else {
      console.error('Stop Simulation button not found');
  }
  
  if (addVehicleBtn) {
      addVehicleBtn.addEventListener('click', () => {
          console.log('Adding vehicle...');
          addVehicle();
      });
  } else {
      console.error('Add Vehicle button not found');
  }
  
  function detectAndPreventCollisions() {
      // Create a quad-tree for the entire canvas
      const boundary = {
          x: canvas.width / 2,
          y: canvas.height / 2,
          w: canvas.width / 2,
          h: canvas.height / 2
      };
      
      const quadTree = new QuadTree(boundary, 4);
      
      // Insert all vehicles into the quad-tree
      for (const vehicle of vehicles) {
          if (!vehicle.reached) {
              const box = vehicle.getBoundingBox();
              quadTree.insert({
                  x: box.x,
                  y: box.y,
                  w: box.w,
                  h: box.h,
                  vehicle
              });
          }
      }
      
      // Check for potential collisions
      for (const vehicle of vehicles) {
          if (vehicle.reached) continue;
          
          // Get the vehicle's bounding box
          const box = vehicle.getBoundingBox();
          
          // Create a slightly larger search range
          const range = {
              x: box.x,
              y: box.y,
              w: box.w + 10,  // Add safe distance
              h: box.h + 10   // Add safe distance
          };
          
          // Query the quad-tree for nearby vehicles
          const nearbyPoints = quadTree.query(range);
          
          // Check if other vehicles are too close
          for (const point of nearbyPoints) {
              if (point.vehicle.id !== vehicle.id) {
                  // Calculate if they're actually too close (check actual distance)
                  const dx = point.vehicle.x - vehicle.x;
                  const dy = point.vehicle.y - vehicle.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  
                  if (distance < 15) {  // Safe distance threshold
                      // Slow down one of the vehicles to avoid collision
                      vehicle.speed = Math.max(0.1, vehicle.speed * 0.7);
                      
                      // Count this as a prevented collision
                      collisionPrevented++;
                      preventedCountEl.textContent = collisionPrevented;
                      break;
                  }
              }
          }
      }
  }
  
  function render() {
      if (!ctx || !canvas) {
          console.error('Cannot render: Canvas context not available');
          return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw road network
      if (roadNetwork) {
          roadNetwork.draw(ctx);
      }
      
      // Draw vehicles
      for (const vehicle of vehicles) {
          vehicle.draw(ctx);
      }
  }
  
  function update() {
      // Update vehicles
      for (let i = vehicles.length - 1; i >= 0; i--) {
          vehicles[i].update();
          
          // Remove vehicles that have reached destination
          if (vehicles[i].reached) {
              vehicles.splice(i, 1);
              vehicleCountEl.textContent = vehicles.length;
          }
      }
      
      // Detect and prevent collisions
      detectAndPreventCollisions();
      
      // Periodically decrease traffic values
      if (roadNetwork && Math.random() < 0.05) {
          roadNetwork.decreaseTraffic();
      }
  }
  
  function startSimulation() {
      if (!isSimulating) return;
      
      update();
      render();
      
      animationFrameId = requestAnimationFrame(startSimulation);
  }
  
  // Resize canvas to fit container
  function resizeCanvas() {
      if (!canvas) return;
      
      canvas.width = canvas.parentElement.clientWidth || 800;
      canvas.height = 600;
      
      // Re-render if needed
      if (roadNetwork) {
          render();
      }
      
      console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
  }
  
  // Initialize
  try {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      console.log('Collision prevention system initialized');
  } catch (e) {
      console.error('Error initializing collision prevention system:', e);
  }
});
