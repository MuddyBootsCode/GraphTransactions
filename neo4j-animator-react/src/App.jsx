import { useState, useEffect, useRef } from 'react';
import Graph from './components/Graph';
import RangeSlider from './components/RangeSlider';
import { TimeScale } from './utils/timeScale';
import { getEdgeSettings, getNodeColor, exampleTransactions } from './utils/graphUtils';
// Import the journey data
import journeyData from '../journey.json';

function App() {
  // State
  const [transactions, setTransactions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [timeScale, setTimeScale] = useState(null);
  const [txCounter, setTxCounter] = useState("0 / 0");
  const [txDetails, setTxDetails] = useState("No transaction data loaded. Click \"Load Example Data\" to start.");
  const [status, setStatus] = useState("");
  
  // References
  const networkRef = useRef(null);
  const edgeCountRef = useRef(new Map()); // Keep track of edges between node pairs

  // Initialize visualization with data
  useEffect(() => {
    if (transactions.length > 0) {
      // Create new time scale
      const newTimeScale = new TimeScale(transactions);
      setTimeScale(newTimeScale);
      
      // Reset visualization
      resetVisualization();
      
      // Update button states
      updateButtonStates();
      
      // Update status
      updateStatus(`Loaded ${transactions.length} transactions`);
      
      // Automatically apply first transaction
      setTimeout(() => {
        if (transactions.length > 0) {
          // Apply the first transaction
          applyTransaction(transactions[0]);
          
          // Update current index
          setCurrentIndex(1);
          
          // Update transaction counter
          setTxCounter(`1 / ${transactions.length}`);
          
          // Update transaction details
          setTxDetails(JSON.stringify(transactions[0], null, 2));
          
          // Update time scale current time
          newTimeScale.updateCurrentTime(transactions[0].timestamp);
          
          // Update button states
          updateButtonStates();
        }
      }, 500); // Small delay to ensure UI is ready
    }
  }, [transactions]);

  // Handle network ready event
  const handleNetworkReady = (network) => {
    networkRef.current = network;
  };

  // Load example data
  const loadExampleData = () => {
    setTransactions(exampleTransactions);
  };

  // Load journey data
  const loadJourneyData = () => {
    try {
      // Convert journey format to application format
      const convertedData = convertJourneyFormat(journeyData);
      
      // Set transactions
      setTransactions(convertedData);
      
      // Update status
      updateStatus(`Successfully loaded ${convertedData.length} transactions from journey.json`);
    } catch (error) {
      console.error("Error loading journey data:", error);
      updateStatus("Error loading journey data");
    }
  };

  // Reset visualization
  const resetVisualization = (updateDisplay = true, preserveEdgeCount = false) => {
    // Clear graph
    setNodes([]);
    setEdges([]);
    
    // Reset edge count if not preserving
    if (!preserveEdgeCount) {
      edgeCountRef.current = new Map();
    }
    
    // Reset current index
    setCurrentIndex(0);
    
    // Update transaction counter
    updateTxCounter();
    
    // Update transaction details
    if (updateDisplay) {
      setTxDetails("Graph reset. Click 'Next Transaction' to begin.");
    }
  };

  // Update transaction counter
  const updateTxCounter = () => {
    setTxCounter(`${currentIndex} / ${transactions.length}`);
  };

  // Update transaction details
  const updateTransactionDetails = () => {
    if (currentIndex === 0 || !transactions[currentIndex - 1]) {
      setTxDetails("No transaction applied yet.");
      return;
    }
    
    const tx = transactions[currentIndex - 1];
    setTxDetails(JSON.stringify(tx, null, 2));
    
    // Update current time in slider if timeScale exists
    if (timeScale) {
      timeScale.updateCurrentTime(tx.timestamp);
    }
  };

  // Convert journey.json format to application format
  const convertJourneyFormat = (journeyData) => {
    return journeyData.map(tx => {
      // Create operations array based on changes in the journey data
      const operations = [];
      
      // Process node creations
      if (tx.changes && tx.changes.nodes && tx.changes.nodes.created) {
        tx.changes.nodes.created.forEach(node => {
          operations.push({
            type: 'create_node',
            data: {
              id: node.id,
              labels: node.labels,
              properties: node.properties
            }
          });
        });
      }
      
      // Process node modifications
      if (tx.changes && tx.changes.nodes && tx.changes.nodes.modified) {
        tx.changes.nodes.modified.forEach(node => {
          operations.push({
            type: 'update_node',
            data: {
              id: node.id,
              labels: node.labels,
              properties: node.properties
            }
          });
        });
      }
      
      // Process relationship creations
      if (tx.changes && tx.changes.relationships && tx.changes.relationships.created) {
        tx.changes.relationships.created.forEach(rel => {
          operations.push({
            type: 'create_relationship',
            data: {
              id: rel.id,
              startNodeId: rel.startNodeId,
              endNodeId: rel.endNodeId,
              type: rel.type,
              properties: rel.properties
            }
          });
        });
      }
      
      return {
        timestamp: tx.timestamp,
        txId: tx.id,
        query: tx.query,
        summary: tx.summary,
        operations: operations
      };
    });
  };

  // Update status message
  const updateStatus = (message) => {
    setStatus(message);
    
    // Clear status after 3 seconds
    setTimeout(() => {
      setStatus("");
    }, 3000);
  };

  // Next transaction
  const nextTransaction = () => {
    if (currentIndex >= transactions.length) {
      updateStatus("No more transactions to apply");
      return;
    }
    
    const tx = transactions[currentIndex];
    
    // Update the graph based on operations
    applyTransaction(tx);
    
    // Increment current index
    setCurrentIndex(prevIndex => prevIndex + 1);
    
    // Update transaction counter
    updateTxCounter();
    
    // Update transaction details
    updateTransactionDetails();
    
    // Update button states
    updateButtonStates();
  };

  // Previous transaction
  const previousTransaction = () => {
    if (currentIndex <= 0) {
      updateStatus("Already at the beginning");
      return;
    }
    
    // Decrement current index
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    
    // Replay all transactions up to the new index
    resetVisualization(false);
    
    // Apply transactions one by one
    for (let i = 0; i < newIndex; i++) {
      applyTransaction(transactions[i]);
    }
    
    // Update transaction counter
    updateTxCounter();
    
    // Update transaction details
    updateTransactionDetails();
    
    // Update button states
    updateButtonStates();
    
    updateStatus("Reverted to previous transaction");
  };

  // Apply a single transaction to the graph
  const applyTransaction = (tx) => {
    if (!tx || !tx.operations) return;
    
    // Process each operation
    tx.operations.forEach(op => {
      switch (op.type) {
        case 'create_node':
          createNode(op.data);
          break;
          
        case 'create_relationship':
          createRelationship(op.data);
          break;
          
        case 'delete_node':
          // Not implemented yet
          break;
          
        case 'delete_relationship':
          // Not implemented yet
          break;
          
        case 'update_node':
          updateNode(op.data);
          break;
          
        default:
          console.warn(`Unknown operation type: ${op.type}`);
      }
    });
  };

  // Create a node
  const createNode = (data) => {
    if (!data || !data.id) return;
    
    // Skip if node already exists
    if (nodes.some(node => node.id === data.id)) return;
    
    // Create new node
    const newNode = {
      id: data.id,
      label: data.properties?.name || data.properties?.title || data.id,
      color: getNodeColor(data.labels),
      title: formatNodeTooltip(data),
      data: data // Store original data for reference
    };
    
    // Add to nodes
    setNodes(prevNodes => [...prevNodes, newNode]);
  };

  // Update a node
  const updateNode = (data) => {
    if (!data || !data.id) return;
    
    // Find the node index
    const nodeIndex = nodes.findIndex(node => node.id === data.id);
    
    // Skip if node doesn't exist
    if (nodeIndex === -1) return;
    
    // Create updated node
    const updatedNode = {
      ...nodes[nodeIndex],
      label: data.properties?.name || data.properties?.title || data.id,
      color: getNodeColor(data.labels),
      title: formatNodeTooltip(data),
      data: data // Update original data for reference
    };
    
    // Update nodes array
    setNodes(prevNodes => {
      const newNodes = [...prevNodes];
      newNodes[nodeIndex] = updatedNode;
      return newNodes;
    });
  };

  // Create a relationship
  const createRelationship = (data) => {
    if (!data || !data.id || !data.startNodeId || !data.endNodeId) return;
    
    // Skip if relationship already exists
    if (edges.some(edge => edge.id === data.id)) return;
    
    // Get edge styling based on type
    const edgeSettings = getEdgeSettings(data.startNodeId, data.endNodeId, data.type);
    
    // Create new edge
    const newEdge = {
      id: data.id,
      from: data.startNodeId,
      to: data.endNodeId,
      label: data.type,
      title: formatEdgeTooltip(data),
      data: data, // Store original data for reference
      ...edgeSettings
    };
    
    // Handle edge count for multiple edges between same nodes
    const edgePair = `${data.startNodeId}-${data.endNodeId}`;
    const count = edgeCountRef.current.get(edgePair) || 0;
    edgeCountRef.current.set(edgePair, count + 1);
    
    // Add smooth curve if multiple edges
    if (count > 0) {
      newEdge.smooth = {
        type: 'curvedCW',
        roundness: 0.2 + (count * 0.1) // Increase curve for each additional edge
      };
    }
    
    // Add to edges
    setEdges(prevEdges => [...prevEdges, newEdge]);
  };

  // Format node tooltip
  const formatNodeTooltip = (data) => {
    if (!data) return '';
    
    let tooltip = `<div class="tooltip-content">`;
    
    // Add labels
    if (data.labels && data.labels.length > 0) {
      tooltip += `<div class="tooltip-labels">${data.labels.join(', ')}</div>`;
    }
    
    // Add properties
    if (data.properties) {
      tooltip += `<div class="tooltip-properties">`;
      for (const [key, value] of Object.entries(data.properties)) {
        tooltip += `<div><strong>${key}:</strong> ${value}</div>`;
      }
      tooltip += `</div>`;
    }
    
    tooltip += `</div>`;
    return tooltip;
  };

  // Format edge tooltip
  const formatEdgeTooltip = (data) => {
    if (!data) return '';
    
    let tooltip = `<div class="tooltip-content">`;
    
    // Add type
    if (data.type) {
      tooltip += `<div class="tooltip-type">${data.type}</div>`;
    }
    
    // Add properties
    if (data.properties) {
      tooltip += `<div class="tooltip-properties">`;
      for (const [key, value] of Object.entries(data.properties)) {
        tooltip += `<div><strong>${key}:</strong> ${value}</div>`;
      }
      tooltip += `</div>`;
    }
    
    tooltip += `</div>`;
    return tooltip;
  };

  // Update button states
  const updateButtonStates = () => {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    if (prevBtn) {
      prevBtn.disabled = currentIndex <= 0;
    }
    
    if (nextBtn) {
      nextBtn.disabled = currentIndex >= transactions.length;
    }
    
    if (resetBtn) {
      resetBtn.disabled = transactions.length === 0;
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        
        // Convert journey format to application format
        const convertedData = convertJourneyFormat(jsonData);
        
        // Set transactions
        setTransactions(convertedData);
        
        // Update status
        updateStatus(`Successfully loaded ${convertedData.length} transactions from file`);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        updateStatus("Error loading file: Invalid JSON format");
      }
    };
    
    reader.onerror = () => {
      updateStatus("Error reading file");
    };
    
    reader.readAsText(file);
  };

  // Zoom controls
  const zoomIn = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale() * 1.2;
      networkRef.current.moveTo({ scale });
    }
  };

  const zoomOut = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale() / 1.2;
      networkRef.current.moveTo({ scale });
    }
  };

  const recenterView = () => {
    if (networkRef.current) {
      networkRef.current.fit({ animation: true });
    }
  };

  // Range slider change handler
  const handleRangeChange = (leftPos, rightPos) => {
    if (!timeScale || !transactions.length) return;
    
    const minTime = timeScale.sliderToTimestamp(leftPos);
    const maxTime = timeScale.sliderToTimestamp(rightPos);
    
    // Get transactions in range
    const txIndexes = timeScale.getTransactionsInRange(transactions, minTime, maxTime);
    
    // Filter transactions for display
    if (txIndexes.length > 0) {
      updateStatus(`Showing ${txIndexes.length} transactions in selected time range`);
    } else {
      updateStatus("No transactions in selected time range");
    }
  };

  return (
    <div className="container">
      <div className="sidebar">
        <div className="controls">
          <h2>Neo4j Transaction Animator</h2>
          
          <div className="control-group">
            <h3>Data</h3>
            <div className="control-buttons">
              <button 
                id="load-example-btn" 
                onClick={loadExampleData}
                className="primary-button"
              >
                Load Example Data
              </button>
              <button 
                id="load-journey-btn" 
                onClick={loadJourneyData}
                className="primary-button"
              >
                Load Journey Data
              </button>
              <input 
                type="file" 
                id="file-input" 
                accept=".json" 
                onChange={handleFileUpload}
              />
              <label htmlFor="file-input" className="file-input-label">
                Upload JSON
              </label>
              <button 
                id="reset-btn" 
                onClick={() => resetVisualization()} 
                disabled={transactions.length === 0}
                className="secondary-button"
              >
                Reset Graph
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="transaction-info">
        Transaction: <span id="tx-counter">{txCounter}</span>
      </div>
      
      <div className="graph-wrapper">
        <div id="graph-container" className="graph-container">
          <Graph 
            nodes={nodes} 
            edges={edges} 
            onNetworkReady={handleNetworkReady} 
          />
        </div>
        
        <div className="graph-controls" id="graph-controls">
          <div className="tooltip">
            <button className="graph-control-btn" id="zoom-in-btn" onClick={zoomIn}>+</button>
            <span className="tooltiptext">Zoom In</span>
          </div>
          <div className="tooltip">
            <button className="graph-control-btn" id="zoom-out-btn" onClick={zoomOut}>−</button>
            <span className="tooltiptext">Zoom Out</span>
          </div>
          <div className="tooltip">
            <button className="graph-control-btn" id="recenter-btn" onClick={recenterView}>⊙</button>
            <span className="tooltiptext">Recenter View</span>
          </div>
        </div>
      </div>

      <div className="navigation-buttons">
        <button 
          id="prev-btn" 
          onClick={previousTransaction} 
          disabled={currentIndex <= 0}
        >
          Previous Transaction
        </button>
        <button 
          id="next-btn" 
          onClick={nextTransaction} 
          disabled={currentIndex >= transactions.length}
        >
          Next Transaction
        </button>
      </div>
      
      {timeScale && (
        <RangeSlider 
          formatLabel={(val) => timeScale.formatTimestamp(val)}
          formatCurrentTime={(val) => timeScale.formatCurrentTime(val)}
          currentTime={currentIndex > 0 && transactions.length > 0 ? 
            transactions[currentIndex - 1]?.timestamp : null}
          onRangeChange={handleRangeChange}
        />
      )}
      
      <div className="details-container">
        <h3>Transaction Details</h3>
        <pre id="tx-details">{txDetails}</pre>
        <div id="status" className="status">{status}</div>
      </div>
    </div>
  );
}

export default App;
