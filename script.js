// Global variables
let transactions = [];
let currentIndex = 0;
let nodes = new vis.DataSet();
let edges = new vis.DataSet();
let network = null;
let timeScale = null;  // For timestamp scaling

// Keep track of edges between node pairs
const edgeCount = new Map();

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the visualization
  initializeVisualization();
  
  // Initialize time scale with empty data initially
  timeScale = new TimeScale([]);
  timeScale.updateLabels();
  timeScale.updateCurrentTime(null);
  
  // Initialize the range slider
  initCustomRangeSlider();
  
  // Update the UI
  document.getElementById('tx-counter').textContent = `${currentIndex} / ${transactions.length}`;
  updateButtonStates();
  
  // Update status to indicate the app is ready
  updateStatus("App initialized. Ready to load transaction data.");
});

// Time scaling utility for slider
class TimeScale {
  constructor(transactions) {
    if (!transactions || transactions.length === 0) {
      this.startTime = 0;
      this.endTime = 100;
      this.range = 100;
      return;
    }
    
    // Extract timestamps and convert to Date objects
    const timestamps = transactions.map(tx => new Date(tx.timestamp).getTime());
    
    // Find min and max timestamps
    this.startTime = Math.min(...timestamps);
    this.endTime = Math.max(...timestamps);
    this.range = this.endTime - this.startTime;
    
    // Save full range information for filtering
    this.fullStartTime = this.startTime;
    this.fullEndTime = this.endTime;
    this.fullRange = this.range;
    
    // Build a sorted array of transaction indexes by timestamp
    this.sortedIndexes = transactions.map((tx, index) => ({
      index: index,
      time: new Date(tx.timestamp).getTime()
    })).sort((a, b) => a.time - b.time);
  }
  
  // Get all transactions within a time range
  getTransactionsInRange(transactions, minTime, maxTime) {
    if (!transactions || transactions.length === 0) return [];
    
    return transactions
      .map((tx, index) => ({
        index: index,
        time: new Date(tx.timestamp).getTime()
      }))
      .filter(item => item.time >= minTime && item.time <= maxTime)
      .map(item => item.index);
  }
  
  // Convert timestamp to slider value (0-100)
  timeToSlider(timestamp) {
    if (this.range === 0) return 0;
    const time = new Date(timestamp).getTime();
    return Math.round(((time - this.startTime) / this.range) * 100);
  }
  
  // Convert slider value to timestamp
  sliderToTimestamp(sliderValue) {
    if (sliderValue <= 0) return this.startTime;
    if (sliderValue >= 100) return this.endTime;
    
    return this.startTime + (sliderValue / 100) * this.range;
  }
  
  // Convert slider value to timestamp index
  sliderToIndex(sliderValue, transactions) {
    if (!transactions || transactions.length === 0) return 0;
    if (sliderValue <= 0) return 0;
    if (sliderValue >= 100) return transactions.length - 1;
    
    const targetTime = this.sliderToTimestamp(sliderValue);
    
    // Use the sorted indexes for more consistent navigation
    if (this.sortedIndexes) {
      // Binary search to find the closest timestamp
      let left = 0;
      let right = this.sortedIndexes.length - 1;
      
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const midTime = this.sortedIndexes[mid].time;
        
        if (midTime === targetTime) {
          return this.sortedIndexes[mid].index;
        }
        
        if (midTime < targetTime) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      
      // After binary search, left is the insertion point
      // Choose the closest index
      if (left === 0) {
        return this.sortedIndexes[0].index;
      }
      
      if (left >= this.sortedIndexes.length) {
        return this.sortedIndexes[this.sortedIndexes.length - 1].index;
      }
      
      const leftDiff = Math.abs(this.sortedIndexes[left - 1].time - targetTime);
      const rightDiff = Math.abs(this.sortedIndexes[left].time - targetTime);
      
      return leftDiff <= rightDiff 
        ? this.sortedIndexes[left - 1].index 
        : this.sortedIndexes[left].index;
    }
    
    // Fallback to linear search if sortedIndexes not available
    let closestIndex = 0;
    let closestDiff = Number.MAX_VALUE;
    
    transactions.forEach((tx, index) => {
      const txTime = new Date(tx.timestamp).getTime();
      const diff = Math.abs(txTime - targetTime);
      
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = index;
      }
    });
    
    return closestIndex;
  }
  
  // Format timestamp for display
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Format timestamp with date for current time display
  formatCurrentTime(timestamp) {
    if (!timestamp) return "No time";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    });
  }
  
  // Update slider labels
  updateLabels() {
    if (this.startTime === 0 && this.endTime === 100) {
      document.getElementById('range-min-value').textContent = '0';
      document.getElementById('range-max-value').textContent = '100';
      document.getElementById('current-time-display').textContent = 'No data';
      return;
    }
    
    document.getElementById('range-min-value').textContent = this.formatTimestamp(this.startTime);
    document.getElementById('range-max-value').textContent = this.formatTimestamp(this.endTime);
  }
  
  // Update current time display
  updateCurrentTime(timestamp) {
    if (!timestamp) {
      document.getElementById('current-time-display').textContent = 'No transaction';
      return;
    }
    document.getElementById('current-time-display').textContent = this.formatCurrentTime(timestamp);
  }
}

// Initialize time scale
function initTimeScale() {
  // Create timeScale with full range initially
  timeScale = new TimeScale(transactions);
  timeScale.updateLabels();
  
  // Update current time based on current transaction index
  if (currentIndex > 0 && transactions.length > 0) {
    timeScale.updateCurrentTime(transactions[currentIndex - 1].timestamp);
  } else {
    timeScale.updateCurrentTime(null);
  }
  
  // Initialize custom range slider
  initCustomRangeSlider();
}

// Initialize custom range slider
function initCustomRangeSlider() {
  const container = document.querySelector('.multi-range-slider .slider-container');
  const leftHandle = document.getElementById('left-handle');
  const rightHandle = document.getElementById('right-handle');
  const track = document.querySelector('.slider-track');
  const trackFill = document.getElementById('slider-track-fill');
  const minValueLabel = document.getElementById('range-min-value');
  const maxValueLabel = document.getElementById('range-max-value');
  const currentTimeDisplay = document.getElementById('current-time-display');
  
  // Check if elements exist
  if (!container || !leftHandle || !rightHandle || !track || !trackFill) {
    console.error("Required DOM elements for range slider not found");
    return;
  }
  
  let isDragging = false;
  let currentHandle = null;
  let leftPos = 0; // % position of left handle (0-100)
  let rightPos = 100; // % position of right handle (0-100)
  
  // Initialize to full range
  updateHandlePositions(0, 100);
  
  // Initialize labels
  updateLabels();
  
  // If there are no transactions, set default labels and return
  if (!transactions || transactions.length === 0) {
    minValueLabel.textContent = '00:00';
    maxValueLabel.textContent = '00:00';
    currentTimeDisplay.textContent = 'No transaction';
    return;
  }
  
  // Update handle positions
  function updateHandlePositions(left, right) {
    leftPos = left;
    rightPos = right;
    
    leftHandle.style.left = `${left}%`;
    rightHandle.style.left = `${right}%`;
    
    // Update track fill position and width
    trackFill.style.left = `${left}%`;
    trackFill.style.width = `${right - left}%`;
    
    updateLabels();
  }
  
  // Update labels with actual timestamps
  function updateLabels() {
    if (timeScale) {
      const minTime = timeScale.sliderToTimestamp(leftPos);
      const maxTime = timeScale.sliderToTimestamp(rightPos);
      
      minValueLabel.textContent = timeScale.formatTimestamp(minTime);
      maxValueLabel.textContent = timeScale.formatTimestamp(maxTime);
    }
  }
  
  // Add event listeners for drag operations
  leftHandle.addEventListener('mousedown', function(e) {
    isDragging = true;
    currentHandle = 'left';
    container.style.cursor = 'grabbing';
    e.preventDefault(); // Prevent text selection
  });
  
  rightHandle.addEventListener('mousedown', function(e) {
    isDragging = true;
    currentHandle = 'right';
    container.style.cursor = 'grabbing';
    e.preventDefault(); // Prevent text selection
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const offset = rect.left;
    
    // Calculate position in percentage (0-100)
    let position = ((e.clientX - offset) / containerWidth) * 100;
    
    // Clamp the position between 0 and 100
    position = Math.max(0, Math.min(100, position));
    
    if (currentHandle === 'left') {
      // Prevent left handle from going past right handle
      if (position >= rightPos) {
        position = rightPos - 1;
      }
      leftPos = position;
    } else if (currentHandle === 'right') {
      // Prevent right handle from going past left handle
      if (position <= leftPos) {
        position = leftPos + 1;
      }
      rightPos = position;
    }
    
    updateHandlePositions(leftPos, rightPos);
  });
  
  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      currentHandle = null;
      container.style.cursor = 'default';
      applyRangeFilter();
    }
  });
  
  // Apply the range filter and update the visualization
  function applyRangeFilter() {
    if (!timeScale || transactions.length === 0) return;
    
    // Convert percent to timestamps
    const minTime = timeScale.sliderToTimestamp(leftPos);
    const maxTime = timeScale.sliderToTimestamp(rightPos);
    
    // Find transactions in this range
    const filteredTransactions = [];
    for (let i = 0; i < transactions.length; i++) {
      const txTime = new Date(transactions[i].timestamp).getTime();
      if (txTime >= minTime && txTime <= maxTime) {
        filteredTransactions.push(i);
      }
    }
    
    if (filteredTransactions.length === 0) {
      updateStatus("No transactions found in the selected range.");
      return;
    }
    
    // Clear current visualization
    resetVisualization(false);
    
    // Apply all transactions in the range
    for (const txIndex of filteredTransactions) {
      currentIndex = txIndex;
      nextTransaction(false);
    }
    
    // Update the current time display
    if (currentIndex > 0 && transactions.length > 0) {
      const currentTx = transactions[currentIndex - 1];
      timeScale.updateCurrentTime(currentTx.timestamp);
    }
    
    updateStatus(`Showing ${filteredTransactions.length} transactions in the selected time range.`);
  }
}

function getEdgeSettings(fromNode, toNode, type) {
  const nodeKey = `${fromNode}-${toNode}`;
  const count = edgeCount.get(nodeKey) || 0;
  edgeCount.set(nodeKey, count + 1);
  
  // Base edge settings
  const baseSettings = {
    length: 250,
    font: {
      size: 12,
      align: 'middle',
      background: 'white',
      strokeWidth: 2,
      strokeColor: 'white'
    },
    width: 2,
    shadow: true
  };
  
  // Only curve if this is not the first edge between these nodes
  if (count === 0) {
    return {
      ...baseSettings,
      smooth: {
        enabled: true,
        type: 'continuous',
        roundness: 0.2
      }
    };
  }
  
  // For multiple edges between the same nodes, use gentle curves
  // with alternating directions and increasing roundness
  const direction = count % 2 === 0 ? 'curvedCW' : 'curvedCCW';
  const roundness = 0.2 + (Math.min(count, 3) * 0.1);
  
  return {
    ...baseSettings,
    smooth: {
      enabled: true,
      type: direction,
      roundness: roundness
    }
  };
}

// Initialize the visualization
function initializeVisualization() {
  const container = document.getElementById('graph-container');
  const data = { nodes, edges };
  const options = {
    nodes: {
      shape: 'dot',
      size: 16,
      font: { size: 14 },
      borderWidth: 2,
      shadow: true,
      fixed: false,
      margin: 15
    },
    edges: {
      width: 2,
      shadow: true,
      smooth: {
        enabled: true,
        type: 'continuous',
        roundness: 0.2
      },
      arrows: { 
        to: { 
          enabled: true, 
          scaleFactor: 0.5 
        } 
      },
      font: {
        size: 12,
        align: 'middle',
        background: 'white',
        strokeWidth: 2,
        strokeColor: 'white'
      },
      length: 250
    },
    physics: {
      enabled: true,
      stabilization: {
        enabled: true,
        iterations: 1000,
        updateInterval: 50,
        onlyDynamicEdges: false,
        fit: true,
        proper: true
      },
      barnesHut: {
        gravitationalConstant: -800,
        centralGravity: 0.2,
        springLength: 200,
        springConstant: 0.02,
        damping: 0.15,
        avoidOverlap: 1
      },
      minVelocity: 0.75,
      maxVelocity: 10,
      solver: 'barnesHut',
      timestep: 0.4
    },
    layout: {
      randomSeed: 42,
      improvedLayout: true,
      clusterThreshold: 150,
      hierarchical: {
        enabled: false
      }
    },
    interaction: {
      dragNodes: true,
      dragView: false,
      zoomView: true,
      selectable: true,
      selectConnectedEdges: true,
      navigationButtons: false,
      keyboard: true,
      hover: true,
      multiselect: true,
      tooltipDelay: 200
    },
    manipulation: {
      enabled: false
    },
    configure: {
      enabled: false
    },
    bounds: {
      used: true,
      box: {
        left: -container.offsetWidth/2 + 50,
        top: -container.offsetHeight/2 + 50,
        right: container.offsetWidth/2 - 50,
        bottom: container.offsetHeight/2 - 50
      }
    }
  };
  
  network = new vis.Network(container, data, options);

  // Make sure controls are properly positioned
  const graphControls = document.getElementById('graph-controls');
  
  // Reposition controls when window resizes
  window.addEventListener('resize', function() {
    if (network && container) {
      network.setOptions({
        bounds: {
          box: {
            left: -container.offsetWidth/2 + 50,
            top: -container.offsetHeight/2 + 50,
            right: container.offsetWidth/2 - 50,
            bottom: container.offsetHeight/2 - 50
          }
        }
      });
      network.fit();
    }
  });
  
  // Calculate initial positions for new nodes
  const containerWidth = container.offsetWidth;
  const containerHeight = container.offsetHeight;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  let lastNodePosition = { x: centerX, y: centerY };
  let nodeCount = 0;
  
  function calculateNextPosition() {
    // Limit the radius to ensure nodes stay in view
    const maxRadius = Math.min(containerWidth, containerHeight) / 3;
    const radius = Math.min(150, maxRadius);
    const angle = (nodeCount * (2 * Math.PI / 8)) + (Math.PI / 4);
    nodeCount = (nodeCount + 1) % 8;
    
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  }

  // Add event listeners for stabilization
  network.on("stabilizationStart", function () {
    updateStatus("Stabilizing graph layout...");
    network.stopSimulation();
    setTimeout(() => {
      network.startSimulation();
    }, 50);
  });

  network.on("stabilizationIterationsDone", function () {
    network.setOptions({ physics: { stabilization: { enabled: false } } });
    network.fit({
      animation: {
        duration: 1000,
        easingFunction: "easeOutQuart"
      }
    });
  });

  network.on("stabilized", function() {
    updateStatus("Graph layout stabilized");
  });

  // Only fit view after adding nodes, not during drag operations
  let fitTimeout = null;
  nodes.on('add', function(event, properties, senderId) {
    if (fitTimeout) clearTimeout(fitTimeout);
    
    // Update positions for newly added nodes
    const newNodes = properties.items;
    newNodes.forEach(nodeId => {
      const position = calculateNextPosition();
      network.moveNode(nodeId, position.x, position.y);
      lastNodePosition = position;
    });

    // Temporarily disable physics during node addition
    network.setOptions({ physics: { enabled: false } });
    
    fitTimeout = setTimeout(() => {
      // Re-enable physics with gentle settings
      network.setOptions({ 
        physics: { 
          enabled: true,
          barnesHut: {
            gravitationalConstant: -500,
            centralGravity: 0.1,
            springLength: 200,
            springConstant: 0.02,
            damping: 0.09
          }
        }
      });
      
      network.fit({
        animation: {
          duration: 1000,
          easingFunction: "easeOutQuart"
        }
      });
    }, 300);
  });

  // Add drag event handlers
  network.on("dragStart", function() {
    if (fitTimeout) clearTimeout(fitTimeout);
    network.setOptions({ physics: { enabled: false } });
  });

  network.on("dragEnd", function(params) {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      const position = network.getPositions([nodeId])[nodeId];
      lastNodePosition = position;
    }
    
    // Gently re-enable physics
    setTimeout(() => {
      network.setOptions({ 
        physics: { 
          enabled: true,
          barnesHut: {
            gravitationalConstant: -500,
            centralGravity: 0.1,
            springLength: 200,
            springConstant: 0.02,
            damping: 0.09
          }
        }
      });
    }, 200);
  });

  // Ensure nodes stay in view during stabilization
  network.on("afterDrawing", function() {
    const nodePositions = network.getPositions();
    const viewPosition = network.getViewPosition();
    const scale = network.getScale();
    
    let needsRepositioning = false;
    const boundingBox = {
      left: viewPosition.x - (containerWidth/2)/scale + 50/scale,
      right: viewPosition.x + (containerWidth/2)/scale - 50/scale,
      top: viewPosition.y - (containerHeight/2)/scale + 50/scale,
      bottom: viewPosition.y + (containerHeight/2)/scale - 50/scale
    };
    
    for (const nodeId in nodePositions) {
      const pos = nodePositions[nodeId];
      if (pos.x < boundingBox.left || pos.x > boundingBox.right || 
          pos.y < boundingBox.top || pos.y > boundingBox.bottom) {
        needsRepositioning = true;
        break;
      }
    }
    
    if (needsRepositioning) {
      network.fit({
        animation: {
          duration: 500,
          easingFunction: "easeOutQuad"
        }
      });
    }
  });

  updateStatus("Visualization initialized. Ready to load data.");
}

// Load example transaction data
function loadExampleData() {
  transactions = [
    {
      id: "tx1",
      timestamp: "2025-04-05T04:15:00Z",
      query: "CREATE (c:Customer {id: 'c1', name: 'Alice Smith', email: 'alice@example.com'})",
      parameters: {},
      changes: {
        nodes: {
          created: [
            {
              id: "node1",
              labels: ["Customer"],
              properties: {
                id: "c1",
                name: "Alice Smith",
                email: "alice@example.com"
              }
            }
          ],
          modified: [],
          deleted: []
        },
        relationships: {
          created: [],
          modified: [],
          deleted: []
        }
      }
    },
    {
      id: "tx2",
      timestamp: "2025-04-05T09:16:30Z",
      query: "CREATE (p:Product {id: 'p1', name: 'Smartphone X', price: 899.99})",
      parameters: {},
      changes: {
        nodes: {
          created: [
            {
              id: "node2",
              labels: ["Product"],
              properties: {
                id: "p1",
                name: "Smartphone X",
                price: 899.99
              }
            }
          ],
          modified: [],
          deleted: []
        },
        relationships: {
          created: [],
          modified: [],
          deleted: []
        }
      }
    },
    {
      id: "tx3",
      timestamp: "2025-04-05T09:20:15Z",
      query: "CREATE (c:Category {id: 'cat1', name: 'Electronics'})",
      parameters: {},
      changes: {
        nodes: {
          created: [
            {
              id: "node3",
              labels: ["Category"],
              properties: {
                id: "cat1",
                name: "Electronics"
              }
            }
          ],
          modified: [],
          deleted: []
        },
        relationships: {
          created: [],
          modified: [],
          deleted: []
        }
      }
    },
    {
      id: "tx4",
      timestamp: "2025-04-05T09:21:00Z",
      query: "MATCH (p:Product {id: 'p1'}), (c:Category {id: 'cat1'}) CREATE (p)-[:BELONGS_TO]->(c)",
      parameters: {},
      changes: {
        nodes: {
          created: [],
          modified: [],
          deleted: []
        },
        relationships: {
          created: [
            {
              id: "rel1",
              type: "BELONGS_TO",
              startNodeId: "node2",
              endNodeId: "node3",
              properties: {}
            }
          ],
          modified: [],
          deleted: []
        }
      }
    },
    {
      id: "tx5",
      timestamp: "2025-04-05T09:22:30Z",
      query: "MATCH (c:Customer {id: 'c1'}), (p:Product {id: 'p1'}) CREATE (c)-[:PURCHASED {timestamp: datetime(), quantity: 1, total: 899.99}]->(p)",
      parameters: {},
      changes: {
        nodes: {
          created: [],
          modified: [],
          deleted: []
        },
        relationships: {
          created: [
            {
              id: "rel2",
              type: "PURCHASED",
              startNodeId: "node1",
              endNodeId: "node2",
              properties: {
                timestamp: "2025-04-05T09:22:30Z",
                quantity: 1,
                total: 899.99
              }
            }
          ],
          modified: [],
          deleted: []
        }
      }
    }
  ];
  
  // Reset visualization
  resetVisualization();
  
  // Initialize timeline slider
  initTimeScale();
  
  // Update UI
  document.getElementById('tx-counter').textContent = `${currentIndex} / ${transactions.length}`;
  updateButtonStates();
  
  updateTransactionDetails();
  
  // Automatically apply the first transaction
  if (transactions.length > 0) {
    nextTransaction();
  }
}

// Handle file upload
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) {
    updateStatus("No file selected");
    return;
  }

  updateStatus(`Loading file: ${file.name}`);
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      updateStatus("Parsing JSON data...");
      const jsonData = JSON.parse(e.target.result);
      
      // Validate the JSON structure
      if (!Array.isArray(jsonData)) {
        throw new Error("Uploaded file must contain an array of transactions");
      }
      
      updateStatus(`Found ${jsonData.length} transactions in file`);

      // Basic validation of transaction structure
      let validationErrors = [];
      jsonData.forEach((tx, index) => {
        if (!tx.id) validationErrors.push(`Transaction at index ${index} missing id`);
        if (!tx.timestamp) validationErrors.push(`Transaction at index ${index} missing timestamp`);
        if (!tx.query) validationErrors.push(`Transaction at index ${index} missing query`);
        if (!tx.changes) validationErrors.push(`Transaction at index ${index} missing changes`);
        
        // Validate changes structure if it exists
        if (tx.changes) {
          // Check for nodes section
          if (!tx.changes.nodes) {
            validationErrors.push(`Transaction ${tx.id} missing changes.nodes structure`);
          } else {
            // Ensure created, modified, deleted arrays exist
            if (!Array.isArray(tx.changes.nodes.created)) {
              tx.changes.nodes.created = [];
            }
            if (!Array.isArray(tx.changes.nodes.modified)) {
              tx.changes.nodes.modified = [];
            }
            if (!Array.isArray(tx.changes.nodes.deleted)) {
              tx.changes.nodes.deleted = [];
            }
          }
          
          // Check for relationships section
          if (!tx.changes.relationships) {
            validationErrors.push(`Transaction ${tx.id} missing changes.relationships structure`);
          } else {
            // Ensure created, modified, deleted arrays exist
            if (!Array.isArray(tx.changes.relationships.created)) {
              tx.changes.relationships.created = [];
            }
            if (!Array.isArray(tx.changes.relationships.modified)) {
              tx.changes.relationships.modified = [];
            }
            if (!Array.isArray(tx.changes.relationships.deleted)) {
              tx.changes.relationships.deleted = [];
            }
          }
        }
      });
      
      if (validationErrors.length > 0) {
        updateStatus(`JSON format has ${validationErrors.length} validation errors`);
        console.error("Validation errors:", validationErrors);
        
        // Show the expected format
        document.getElementById('tx-details').innerHTML = 
          "Expected JSON format:\n" +
          JSON.stringify([
            {
              "id": "tx1",
              "timestamp": "2023-01-01T12:00:00Z",
              "query": "CREATE (n:Node {id: '1', name: 'Example'})",
              "parameters": {},
              "changes": {
                "nodes": {
                  "created": [
                    {
                      "id": "node1",
                      "labels": ["Label1", "Label2"],
                      "properties": {
                        "id": "1",
                        "name": "Example Node"
                      }
                    }
                  ],
                  "modified": [],
                  "deleted": []
                },
                "relationships": {
                  "created": [
                    {
                      "id": "rel1",
                      "type": "RELATES_TO",
                      "startNodeId": "node1",
                      "endNodeId": "node2",
                      "properties": {}
                    }
                  ],
                  "modified": [],
                  "deleted": []
                }
              }
            }
          ], null, 2);
        
        // Return early if critical errors
        if (validationErrors.some(e => e.includes("missing id") || e.includes("missing changes"))) {
          throw new Error("Invalid transaction format - see console for details");
        }
      }

      // If validation passes or has non-critical errors, try to load the data
      transactions = jsonData;
      
      updateStatus("Resetting visualization...");
      
      // Reset visualization
      resetVisualization();
      
      updateStatus("Initializing timeline...");
      
      // Initialize timeline slider
      initTimeScale();
      
      // Update UI
      document.getElementById('tx-counter').textContent = `${currentIndex} / ${transactions.length}`;
      updateButtonStates();
      
      updateTransactionDetails();
      
      updateStatus(`Ready to visualize ${transactions.length} transactions`);
      
      // Automatically apply the first transaction
      if (transactions.length > 0) {
        updateStatus("Applying first transaction...");
        nextTransaction();
      }
    } catch (error) {
      updateStatus(`Error loading file: ${error.message}`);
      console.error("File upload error:", error);
    }
  };
  
  reader.onerror = function() {
    updateStatus("Failed to read the file");
  };
  
  reader.readAsText(file);
}

// Process the next transaction
function nextTransaction(updateDisplay = true, preserveEdgeRouting = false) {
  if (!network) {
    updateStatus("ERROR: Visualization network not initialized. Try refreshing the page.");
    return;
  }

  if (currentIndex >= transactions.length) {
    updateStatus("End of transaction sequence reached.");
    return;
  }
  
  const tx = transactions[currentIndex];
  updateStatus(`Applying transaction ${currentIndex + 1}: ${tx.id}`);
  console.log("Transaction data:", JSON.stringify(tx, null, 2));
  
  // Temporarily disable physics for smoother additions
  network.setOptions({ physics: { enabled: false } });
  
  // Process node creations with spacing
  if (tx.changes && tx.changes.nodes && tx.changes.nodes.created) {
    updateStatus(`Processing ${tx.changes.nodes.created.length} nodes`);
    tx.changes.nodes.created.forEach((node, index) => {
      console.log("Processing node:", node);
      if (!node.id) {
        console.error("Node missing ID:", node);
        return;
      }
      
      const nodeLabel = node.labels ? node.labels.join(':') : 'Unknown';
      const nodeName = node.properties ? (node.properties.name || node.properties.id || 'Unknown') : 'Unknown';
      
      try {
        nodes.add({
          id: node.id,
          label: `${nodeLabel}\n${nodeName}`,
          color: getNodeColor(node.labels || []),
          margin: 15,
          font: { size: 14, multi: true }
        });
        console.log(`Added node: ${node.id}`);
      } catch (error) {
        console.error(`Error adding node ${node.id}:`, error);
      }
    });
  } else {
    updateStatus("No nodes to create in this transaction");
    console.log("No nodes.created found in transaction", tx);
  }
  
  // Process relationship creations with improved edge routing
  if (tx.changes && tx.changes.relationships && tx.changes.relationships.created) {
    updateStatus(`Processing ${tx.changes.relationships.created.length} relationships`);
    tx.changes.relationships.created.forEach(rel => {
      console.log("Processing relationship:", rel);
      if (!rel.id || !rel.startNodeId || !rel.endNodeId) {
        console.error("Relationship missing required properties:", rel);
        return;
      }
      
      let edgeSettings;
      
      if (preserveEdgeRouting) {
        // Use consistent edge visualization for slider movement
        edgeSettings = {
          smooth: {
            enabled: true,
            type: 'continuous',
            roundness: 0.2
          },
          length: 250,
          font: {
            size: 12,
            align: 'middle',
            background: 'white',
            strokeWidth: 2,
            strokeColor: 'white'
          }
        };
      } else {
        // Use the standard edge routing logic
        edgeSettings = getEdgeSettings(rel.startNodeId, rel.endNodeId, rel.type);
      }
      
      try {
        edges.add({
          id: rel.id,
          from: rel.startNodeId,
          to: rel.endNodeId,
          label: rel.type || "RELATED_TO",
          ...edgeSettings
        });
        console.log(`Added edge: ${rel.id} from ${rel.startNodeId} to ${rel.endNodeId}`);
      } catch (error) {
        console.error(`Error adding relationship ${rel.id}:`, error);
      }
    });
  } else {
    updateStatus("No relationships to create in this transaction");
    console.log("No relationships.created found in transaction", tx);
  }
  
  // Update current index and UI
  currentIndex++;
  document.getElementById('tx-counter').textContent = `${currentIndex} / ${transactions.length}`;
  updateButtonStates();
  updateTransactionDetails();

  // Update the current time display
  if (updateDisplay && timeScale && currentIndex > 0) {
    timeScale.updateCurrentTime(tx.timestamp);
  }

  // Check if any nodes were added
  updateStatus(`Current node count: ${nodes.length}, edge count: ${edges.length}`);
  
  // Re-enable physics with gentle settings for a brief period
  setTimeout(() => {
    network.setOptions({ 
      physics: { 
        enabled: true,
        barnesHut: {
          gravitationalConstant: -600,
          centralGravity: 0.1,
          springLength: 200,
          springConstant: 0.015,
          damping: 0.2
        },
        minVelocity: 1.0,  
        maxVelocity: 8,    
        solver: 'barnesHut',
        timestep: 0.5
      }
    });
    
    // Fit the view
    setTimeout(() => {
      if (nodes.length > 0) {
        network.fit({
          animation: {
            duration: 1000,
            easingFunction: "easeInOutQuad"
          }
        });
      } else {
        updateStatus("WARNING: No nodes to display after transaction applied");
      }
      
      // Stop simulation after physics has had time to position elements
      setTimeout(() => {
        network.stopSimulation();
      }, 2000);
    }, 500);
  }, 500);
}

// Reset the visualization
function resetVisualization(updateDisplay = true, preserveEdgeCount = false) {
  // Save edge count if needed
  const savedEdgeCount = preserveEdgeCount ? new Map(edgeCount) : null;
  
  currentIndex = 0;
  nodes.clear();
  edges.clear();
  
  // Only clear edge count if not preserving it
  if (!preserveEdgeCount) {
    edgeCount.clear();
  } else {
    // Restore saved edge count
    edgeCount.clear();
    savedEdgeCount.forEach((value, key) => {
      edgeCount.set(key, value);
    });
  }
  
  document.getElementById('tx-counter').textContent = `${currentIndex} / ${transactions.length}`;
  updateButtonStates();
  updateTransactionDetails();
  updateStatus("Visualization reset.");

  if (updateDisplay) {
    if (timeScale) {
      timeScale.updateCurrentTime(null);
      
      // Reset the custom range slider
      const leftHandle = document.getElementById('left-handle');
      const rightHandle = document.getElementById('right-handle');
      const trackFill = document.getElementById('slider-track-fill');
      
      leftHandle.style.left = '0%';
      rightHandle.style.left = '100%';
      trackFill.style.left = '0%';
      trackFill.style.width = '100%';
      
      // Update range labels
      if (transactions && transactions.length > 0) {
        document.getElementById('range-min-value').textContent = 
          timeScale.formatTimestamp(timeScale.startTime);
        document.getElementById('range-max-value').textContent = 
          timeScale.formatTimestamp(timeScale.endTime);
      } else {
        document.getElementById('range-min-value').textContent = '00:00';
        document.getElementById('range-max-value').textContent = '00:00';
      }
    }
  } else if (timeScale) {
    // Just update current time display to show no transaction
    timeScale.updateCurrentTime(null);
  }
}

// Get color for node based on label
function getNodeColor(labels) {
  const colorMap = {
    'Product': { background: '#FF9999', border: '#CC0000' },
    'Customer': { background: '#FFCC66', border: '#CC9900' },
    'Order': { background: '#99CC99', border: '#009900' },
    'Category': { background: '#9999FF', border: '#0000CC' }
  };
  
  for (const label of labels) {
    if (colorMap[label]) {
      return colorMap[label];
    }
  }
  
  return { background: '#D2E5FF', border: '#2B7CE9' };
}

// Update transaction details display
function updateTransactionDetails() {
  const detailsElement = document.getElementById('tx-details');
  
  if (currentIndex === 0 || transactions.length === 0) {
    detailsElement.textContent = "No transaction applied yet.";
    return;
  }
  
  const tx = transactions[currentIndex - 1];
  const details = JSON.stringify(tx, null, 2);
  detailsElement.textContent = details;
}

// Update status message
function updateStatus(message) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  console.log(message);
}

// Process the previous transaction
function previousTransaction() {
  if (currentIndex <= 1) {
    updateStatus("At the beginning of transaction sequence.");
    return;
  }

  const tx = transactions[currentIndex - 1];
  
  // Update edge count when removing edges
  if (tx.changes.relationships && tx.changes.relationships.created) {
    tx.changes.relationships.created.forEach(rel => {
      const nodeKey = `${rel.startNodeId}-${rel.endNodeId}`;
      const count = edgeCount.get(nodeKey);
      if (count > 1) {
        edgeCount.set(nodeKey, count - 1);
      } else {
        edgeCount.delete(nodeKey);
      }
    });
  }
  
  // Undo node creations (remove them)
  if (tx.changes.nodes && tx.changes.nodes.created) {
    tx.changes.nodes.created.forEach(node => {
      nodes.remove(node.id);
    });
  }
  
  // Undo node modifications (restore previous state)
  if (tx.changes.nodes && tx.changes.nodes.modified) {
    tx.changes.nodes.modified.forEach(node => {
      // Get the node's state from the previous transaction
      const prevTx = transactions[currentIndex - 2];
      const prevNode = prevTx.changes.nodes.created.find(n => n.id === node.id) ||
                      prevTx.changes.nodes.modified.find(n => n.id === node.id);
      
      if (prevNode) {
        const nodeLabel = prevNode.labels.join(':');
        const nodeName = prevNode.properties.name || prevNode.properties.id || 'Unknown';
        
        nodes.update({
          id: prevNode.id,
          label: `${nodeLabel}\n${nodeName}`,
          color: getNodeColor(prevNode.labels)
        });
      }
    });
  }
  
  // Undo node deletions (restore them)
  if (tx.changes.nodes && tx.changes.nodes.deleted) {
    tx.changes.nodes.deleted.forEach(nodeId => {
      // Find the node's last known state before deletion
      for (let i = currentIndex - 2; i >= 0; i--) {
        const prevTx = transactions[i];
        const prevNode = prevTx.changes.nodes.created.find(n => n.id === nodeId) ||
                        prevTx.changes.nodes.modified.find(n => n.id === nodeId);
        
        if (prevNode) {
          const nodeLabel = prevNode.labels.join(':');
          const nodeName = prevNode.properties.name || prevNode.properties.id || 'Unknown';
          
          nodes.add({
            id: prevNode.id,
            label: `${nodeLabel}\n${nodeName}`,
            color: getNodeColor(prevNode.labels)
          });
          break;
        }
      }
    });
  }
  
  // Undo relationship creations (remove them)
  if (tx.changes.relationships && tx.changes.relationships.created) {
    tx.changes.relationships.created.forEach(rel => {
      edges.remove(rel.id);
    });
  }
  
  // Undo relationship deletions (restore them)
  if (tx.changes.relationships && tx.changes.relationships.deleted) {
    tx.changes.relationships.deleted.forEach(relId => {
      // Find the relationship's last known state before deletion
      for (let i = currentIndex - 2; i >= 0; i--) {
        const prevTx = transactions[i];
        const prevRel = prevTx.changes.relationships.created.find(r => r.id === relId) ||
                       prevTx.changes.relationships.modified.find(r => r.id === relId);
        
        if (prevRel) {
          edges.add({
            id: prevRel.id,
            from: prevRel.startNodeId,
            to: prevRel.endNodeId,
            label: prevRel.type
          });
          break;
        }
      }
    });
  }
  
  // Update current index and UI
  currentIndex--;
  document.getElementById('tx-counter').textContent = `${currentIndex} / ${transactions.length}`;
  updateButtonStates();
  updateTransactionDetails();
  
  // Update the current time display
  const prevTimestamp = currentIndex > 0 ? transactions[currentIndex - 1].timestamp : null;
  if (timeScale) {
    timeScale.updateCurrentTime(prevTimestamp);
  }
  
  updateStatus(`Moved back to transaction ${currentIndex}`);

  // Ensure the view is updated
  setTimeout(() => {
    network.fit({
      animation: {
        duration: 1000,
        easingFunction: "easeInOutQuad"
      }
    });
  }, 500);
}

// Update UI button states
function updateButtonStates() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const resetBtn = document.getElementById('reset-btn');
  
  prevBtn.disabled = currentIndex <= 1;
  nextBtn.disabled = currentIndex >= transactions.length;
  resetBtn.disabled = transactions.length === 0;
}

// Zoom and center control functions
function zoomIn() {
  if (!network) return;
  
  const currentScale = network.getScale();
  network.moveTo({
    scale: currentScale * 1.2,
    animation: {
      duration: 300,
      easingFunction: 'easeOutQuad'
    }
  });
}

function zoomOut() {
  if (!network) return;
  
  const currentScale = network.getScale();
  network.moveTo({
    scale: currentScale / 1.2,
    animation: {
      duration: 300,
      easingFunction: 'easeOutQuad'
    }
  });
}

function recenterView() {
  if (!network) return;
  
  const selectedNodes = network.getSelectedNodes();
  
  if (selectedNodes.length > 0) {
    // Center on the first selected node
    network.focus(selectedNodes[0], {
      scale: 1.2,
      animation: {
        duration: 500,
        easingFunction: 'easeOutQuad'
      }
    });
  } else {
    // No selected node, fit the entire graph
    network.fit({
      animation: {
        duration: 500,
        easingFunction: 'easeOutQuad'
      }
    });
  }
}

// Extract and visualize nodes from possibly malformed transaction data
function extractAndVisualizeNodes() {
  if (!transactions || transactions.length === 0) {
    updateStatus("No transaction data available to extract nodes from");
    return;
  }
  
  updateStatus("Attempting to extract nodes from transaction data...");
  
  // Reset visualization first
  resetVisualization();
  
  // Keep track of nodes and relationships we've already processed
  const processedNodeIds = new Set();
  const processedRelIds = new Set();
  
  // Try to extract all nodes and relationships from all transactions
  transactions.forEach((tx, txIndex) => {
    console.log(`Examining transaction ${txIndex + 1}/${transactions.length}`);
    
    // Direct node extraction path
    if (tx.changes && tx.changes.nodes && Array.isArray(tx.changes.nodes.created)) {
      tx.changes.nodes.created.forEach(node => {
        if (node.id && !processedNodeIds.has(node.id)) {
          processedNodeIds.add(node.id);
          
          try {
            const nodeLabel = node.labels ? node.labels.join(':') : 'Node';
            const nodeName = node.properties ? 
              (node.properties.name || node.properties.id || `Node-${node.id}`) : 
              `Node-${node.id}`;
            
            nodes.add({
              id: node.id,
              label: `${nodeLabel}\n${nodeName}`,
              color: getNodeColor(node.labels || []),
              margin: 15,
              font: { size: 14, multi: true }
            });
            console.log(`Extracted node: ${node.id}`);
          } catch (error) {
            console.error(`Error adding extracted node ${node.id}:`, error);
          }
        }
      });
    }
    
    // Try alternative paths if the main path didn't work
    if (tx.nodes) {
      // Some formats might have nodes directly
      const nodeList = Array.isArray(tx.nodes) ? tx.nodes : [tx.nodes];
      nodeList.forEach(node => {
        if (node.id && !processedNodeIds.has(node.id)) {
          processedNodeIds.add(node.id);
          
          try {
            const nodeLabel = node.labels ? node.labels.join(':') : 'Node';
            const nodeName = node.properties ? 
              (node.properties.name || node.properties.id || `Node-${node.id}`) : 
              `Node-${node.id}`;
            
            nodes.add({
              id: node.id,
              label: `${nodeLabel}\n${nodeName}`,
              color: getNodeColor(node.labels || []),
              margin: 15,
              font: { size: 14, multi: true }
            });
            console.log(`Extracted alternate node: ${node.id}`);
          } catch (error) {
            console.error(`Error adding alternate node ${node.id}:`, error);
          }
        }
      });
    }
    
    // Direct relationship extraction path
    if (tx.changes && tx.changes.relationships && Array.isArray(tx.changes.relationships.created)) {
      tx.changes.relationships.created.forEach(rel => {
        if (rel.id && rel.startNodeId && rel.endNodeId && !processedRelIds.has(rel.id)) {
          processedRelIds.add(rel.id);
          
          try {
            edges.add({
              id: rel.id,
              from: rel.startNodeId,
              to: rel.endNodeId,
              label: rel.type || "RELATED_TO",
              smooth: {
                enabled: true,
                type: 'continuous',
                roundness: 0.2
              }
            });
            console.log(`Extracted relationship: ${rel.id}`);
          } catch (error) {
            console.error(`Error adding extracted relationship ${rel.id}:`, error);
          }
        }
      });
    }
    
    // Try alternative paths for relationships
    if (tx.relationships) {
      const relList = Array.isArray(tx.relationships) ? tx.relationships : [tx.relationships];
      relList.forEach(rel => {
        if (rel.id && rel.startNodeId && rel.endNodeId && !processedRelIds.has(rel.id)) {
          processedRelIds.add(rel.id);
          
          try {
            edges.add({
              id: rel.id,
              from: rel.startNodeId,
              to: rel.endNodeId,
              label: rel.type || "RELATED_TO",
              smooth: {
                enabled: true,
                type: 'continuous',
                roundness: 0.2
              }
            });
            console.log(`Extracted alternate relationship: ${rel.id}`);
          } catch (error) {
            console.error(`Error adding alternate relationship ${rel.id}:`, error);
          }
        }
      });
    }
  });
  
  updateStatus(`Extracted ${processedNodeIds.size} nodes and ${processedRelIds.size} relationships`);
  
  // If we found any nodes, update the view
  if (processedNodeIds.size > 0) {
    // Fit the view
    setTimeout(() => {
      network.fit({
        animation: {
          duration: 1000,
          easingFunction: "easeInOutQuad"
        }
      });
    }, 500);
  } else {
    updateStatus("ERROR: Could not extract any nodes from transaction data");
  }
}

// Add debug extraction button to HTML
document.addEventListener('DOMContentLoaded', function() {
  // Add the debug extraction button after the existing buttons
  const controlButtons = document.querySelector('.control-buttons');
  if (controlButtons) {
    const extractButton = document.createElement('button');
    extractButton.id = 'extract-btn';
    extractButton.textContent = 'Debug Extract Nodes';
    extractButton.style.backgroundColor = '#ffcc00';
    extractButton.style.color = '#333';
    extractButton.onclick = extractAndVisualizeNodes;
    controlButtons.appendChild(extractButton);
  }
}); 