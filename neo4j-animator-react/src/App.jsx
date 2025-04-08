import { useState, useEffect, useRef } from 'react';
import Graph from './components/Graph';
import RangeSlider from './components/RangeSlider';
import { TimeScale } from './utils/timeScale';
import { getEdgeSettings, getNodeColor, exampleTransactions } from './utils/graphUtils';
// Import the journey data
import journeyData from '../journey.json';

// Material UI imports
import { 
  Button, 
  Typography, 
  Container, 
  Box, 
  Paper,
  Grid,
  Stack,
  Divider,
  IconButton,
  Tooltip 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DatasetIcon from '@mui/icons-material/Dataset';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

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
      
      // Do NOT automatically apply first transaction immediately
      // Instead, just update UI to show that data is loaded but no visualization yet
      setTxCounter(`0 / ${transactions.length}`);
      setTxDetails("Data loaded. Click 'Next Transaction' to begin.");
      
      // Update button states
      updateButtonStates();
    }
  }, [transactions]);

  // Handle network ready event
  const handleNetworkReady = (network) => {
    networkRef.current = network;
  };

  // Load example data
  const loadExampleData = () => {
    try {
      // Prepare new data first before making changes to the UI
      console.log("Loading example data:", exampleTransactions.length, "transactions");
      
      // Set transactions (this will trigger the useEffect that handles initialization)
      setTransactions(exampleTransactions);
      
      // Update status
      updateStatus(`Successfully loaded ${exampleTransactions.length} transactions from example data`);
    } catch (error) {
      console.error("Error loading example data:", error);
      updateStatus("Error loading example data: " + error.message);
    }
  };

  // Load journey data
  const loadJourneyData = () => {
    try {
      // Convert journey format to application format first
      const convertedData = convertJourneyFormat(journeyData);
      
      // Log conversion result
      console.log("Converted journey data:", convertedData.length, "transactions");
      
      // Set transactions (this will trigger the useEffect that handles initialization)
      setTransactions(convertedData);
      
      // Update status
      updateStatus(`Successfully loaded ${convertedData.length} transactions from journey.json`);
    } catch (error) {
      console.error("Error loading journey data:", error);
      updateStatus("Error loading journey data: " + error.message);
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
    try {
      console.log("Converting journey data:", journeyData.length, "transactions");
      
      return journeyData.map(tx => {
        // Create operations array based on changes in the journey data
        const operations = [];
        
        // Process node creations
        if (tx.changes && tx.changes.nodes && tx.changes.nodes.created) {
          tx.changes.nodes.created.forEach(node => {
            // Ensure node has required properties
            if (!node.id) {
              console.warn("Node missing id:", node);
              return;
            }
            
            operations.push({
              type: 'create_node',
              data: {
                id: node.id,
                labels: node.labels || [],
                properties: node.properties || {}
              }
            });
          });
        }
        
        // Process node modifications
        if (tx.changes && tx.changes.nodes && tx.changes.nodes.modified) {
          tx.changes.nodes.modified.forEach(node => {
            // Ensure node has required properties
            if (!node.id) {
              console.warn("Modified node missing id:", node);
              return;
            }
            
            operations.push({
              type: 'update_node',
              data: {
                id: node.id,
                labels: node.labels || [],
                properties: node.properties || {}
              }
            });
          });
        }
        
        // Process relationship creations
        if (tx.changes && tx.changes.relationships && tx.changes.relationships.created) {
          tx.changes.relationships.created.forEach(rel => {
            // Ensure relationship has required properties
            if (!rel.id || !rel.startNodeId || !rel.endNodeId) {
              console.warn("Relationship missing required properties:", rel);
              return;
            }
            
            operations.push({
              type: 'create_relationship',
              data: {
                id: rel.id,
                startNodeId: rel.startNodeId,
                endNodeId: rel.endNodeId,
                type: rel.type || 'RELATED_TO',
                properties: rel.properties || {}
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
    } catch (error) {
      console.error("Error converting journey data:", error);
      throw error;
    }
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
    
    // Get the current transaction details to show
    const txToShow = transactions[newIndex - 1] || null;
    
    try {
      // Create new graph state by applying transactions
      let newNodes = [];
      let newEdges = [];
      const tempEdgeCount = new Map();
      
      // Apply each transaction up to the new index
      for (let i = 0; i < newIndex; i++) {
        if (!transactions[i] || !transactions[i].operations) continue;
        
        transactions[i].operations.forEach(op => {
          if (op.type === 'create_node') {
            // Add node if it doesn't exist
            if (!newNodes.some(n => n.id === op.data.id)) {
              newNodes.push({
                id: op.data.id,
                label: op.data.properties?.name || op.data.properties?.title || op.data.id,
                color: getNodeColor(op.data.labels),
                title: formatNodeTooltip(op.data),
                data: op.data
              });
            }
          } 
          else if (op.type === 'update_node') {
            // Update existing node
            const nodeIndex = newNodes.findIndex(n => n.id === op.data.id);
            if (nodeIndex !== -1) {
              newNodes[nodeIndex] = {
                ...newNodes[nodeIndex],
                label: op.data.properties?.name || op.data.properties?.title || op.data.id,
                color: getNodeColor(op.data.labels),
                title: formatNodeTooltip(op.data),
                data: op.data
              };
            }
          }
          else if (op.type === 'create_relationship') {
            // Add edge if it doesn't exist
            if (!newEdges.some(e => e.id === op.data.id)) {
              // Get edge styling
              const edgeSettings = getEdgeSettings(op.data.startNodeId, op.data.endNodeId, op.data.type);
              
              // Handle edge count for multiple edges
              const edgePair = `${op.data.startNodeId}-${op.data.endNodeId}`;
              const count = tempEdgeCount.get(edgePair) || 0;
              tempEdgeCount.set(edgePair, count + 1);
              
              // Create new edge
              const newEdge = {
                id: op.data.id,
                from: op.data.startNodeId,
                to: op.data.endNodeId,
                label: op.data.type,
                title: formatEdgeTooltip(op.data),
                data: op.data,
                ...edgeSettings
              };
              
              // Add smooth curve if multiple edges
              if (count > 0) {
                newEdge.smooth = {
                  type: 'curvedCW',
                  roundness: 0.2 + (count * 0.1)
                };
              }
              
              newEdges.push(newEdge);
            }
          }
        });
      }
      
      // Update edge count reference
      edgeCountRef.current = tempEdgeCount;
      
      // Update all state at once to prevent flicker/loading
      setNodes(newNodes);
      setEdges(newEdges);
      setCurrentIndex(newIndex);
      
      // Update transaction counter
      updateTxCounter();
      
      // Update transaction details
      if (txToShow) {
        setTxDetails(JSON.stringify(txToShow, null, 2));
        if (timeScale) {
          timeScale.updateCurrentTime(txToShow.timestamp);
        }
      } else {
        setTxDetails("No transaction applied yet.");
      }
      
      // Update button states
      updateButtonStates();
      
      // Update status
      updateStatus("Reverted to previous transaction");
    } catch (error) {
      console.error("Error in previous transaction:", error);
      updateStatus("Error reverting to previous transaction");
    }
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
  const handleRangeChange = (minTimestamp, maxTimestamp) => {
    if (!timeScale || !transactions.length) return;
    
    // Get transactions in range (the timestamps are already in milliseconds)
    const txIndexes = timeScale.getTransactionsInRange(transactions, minTimestamp, maxTimestamp);
    
    // Filter transactions for display
    if (txIndexes.length > 0) {
      // Update status
      const startTime = new Date(minTimestamp).toLocaleTimeString();
      const endTime = new Date(maxTimestamp).toLocaleTimeString();
      updateStatus(`${txIndexes.length} transactions between ${startTime} and ${endTime}`);
      
      // Reset visualization while preserving edge counts for proper curves
      resetVisualization(false, true);
      
      // Build a cumulative view of all transactions in the range
      const newNodes = new Map();
      const newEdges = new Map();
      
      // Track edge counts between node pairs for proper curves
      const edgeCountMap = new Map();
      
      // Process all transactions in the selected range
      txIndexes.forEach(index => {
        const tx = transactions[index];
        
        // Process each operation in the transaction
        tx.operations.forEach(op => {
          if (op.type === 'create_node' || op.type === 'update_node') {
            // Create or update node in our map
            newNodes.set(op.data.id, {
              id: op.data.id,
              label: op.data.properties?.name || op.data.properties?.title || op.data.id,
              color: getNodeColor(op.data.labels),
              title: formatNodeTooltip(op.data),
              data: op.data
            });
          } else if (op.type === 'create_relationship') {
            // Create edge in our map
            if (!newEdges.has(op.data.id)) {
              // Get edge styling
              const edgeSettings = getEdgeSettings(op.data.startNodeId, op.data.endNodeId, op.data.type);
              
              // Handle edge count for multiple edges between same nodes
              const edgePair = `${op.data.startNodeId}-${op.data.endNodeId}`;
              const count = edgeCountMap.get(edgePair) || 0;
              edgeCountMap.set(edgePair, count + 1);
              
              // Create new edge object
              const newEdge = {
                id: op.data.id,
                from: op.data.startNodeId,
                to: op.data.endNodeId,
                label: op.data.type,
                title: formatEdgeTooltip(op.data),
                data: op.data,
                ...edgeSettings
              };
              
              // Add smooth curve if multiple edges
              if (count > 0) {
                newEdge.smooth = {
                  type: 'curvedCW',
                  roundness: 0.2 + (count * 0.1) // Increase curve for each additional edge
                };
              }
              
              newEdges.set(op.data.id, newEdge);
            }
          }
          // Handle delete operations if needed
        });
      });
      
      // Ensure all nodes referenced by edges exist
      newEdges.forEach(edge => {
        // If an edge references a node that doesn't exist in our selection,
        // create a placeholder node
        if (!newNodes.has(edge.from)) {
          newNodes.set(edge.from, {
            id: edge.from,
            label: edge.from,
            color: "#cccccc", // Gray color for placeholder nodes
            title: "Referenced node"
          });
        }
        
        if (!newNodes.has(edge.to)) {
          newNodes.set(edge.to, {
            id: edge.to,
            label: edge.to,
            color: "#cccccc", // Gray color for placeholder nodes
            title: "Referenced node"
          });
        }
      });
      
      // Convert maps to arrays for state update
      const nodesToShow = Array.from(newNodes.values());
      const edgesToShow = Array.from(newEdges.values());
      
      // Update the graph
      setNodes(nodesToShow);
      setEdges(edgesToShow);
      
      // Fit the view to show all nodes
      if (networkRef.current) {
        setTimeout(() => {
          networkRef.current.fit({
            animation: {
              duration: 500,
              easingFunction: 'easeInOutQuad'
            }
          });
        }, 100);
      }
    } else {
      updateStatus("No transactions in selected time range");
      
      // Clear the graph if no transactions found
      resetVisualization(true, false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: 2,
      gap: 2
    }}>
      <Paper elevation={3} sx={{ padding: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Neo4j Transaction Animator
        </Typography>
        
        <Box sx={{ marginBottom: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Data
          </Typography>
          <Stack direction="row" spacing={2} sx={{ 
            flexWrap: 'wrap', 
            gap: 1,
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Button 
              variant="contained" 
              startIcon={<DatasetIcon />} 
              onClick={loadExampleData}
            >
              Load Example Data
            </Button>
            <Button 
              variant="contained" 
              startIcon={<DatasetIcon />}
              onClick={loadJourneyData}
            >
              Load Journey Data
            </Button>
            <Button
              variant="contained"
              component="label"
              startIcon={<UploadFileIcon />}
            >
              Upload JSON
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleFileUpload}
              />
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<RestartAltIcon />}
              onClick={() => resetVisualization()} 
              disabled={transactions.length === 0}
            >
              Reset Graph
            </Button>
          </Stack>
        </Box>

        <Typography variant="subtitle1" align="center">
          Transaction: <strong>{txCounter}</strong>
        </Typography>
      </Paper>
      
      <Paper elevation={3} sx={{ 
        flexGrow: 1, 
        position: 'relative', 
        overflow: 'hidden',
        marginY: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '50vh', // Set a fixed minimum height for the graph container
        minHeight: '400px'
      }}>
        <Box sx={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative',
          flex: 1,
          display: 'flex'
        }}>
          <Graph 
            nodes={nodes} 
            edges={edges} 
            onNetworkReady={handleNetworkReady} 
          />
          
          <Box sx={{ 
            position: 'absolute', 
            right: 16, 
            top: '50%', 
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            zIndex: 10
          }}>
            <Tooltip title="Zoom In" arrow placement="left">
              <IconButton 
                color="primary" 
                onClick={zoomIn}
                sx={{ bgcolor: 'background.paper' }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out" arrow placement="left">
              <IconButton 
                color="primary" 
                onClick={zoomOut}
                sx={{ bgcolor: 'background.paper' }}
              >
                <RemoveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Recenter View" arrow placement="left">
              <IconButton 
                color="primary" 
                onClick={recenterView}
                sx={{ bgcolor: 'background.paper' }}
              >
                <CenterFocusStrongIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, marginY: 2 }}>
        <Button 
          variant="contained"
          startIcon={<NavigateBeforeIcon />}
          onClick={previousTransaction} 
          disabled={currentIndex <= 0}
          size="large"
        >
          Previous Transaction
        </Button>
        <Button 
          variant="contained"
          endIcon={<NavigateNextIcon />}
          onClick={nextTransaction} 
          disabled={currentIndex >= transactions.length}
          size="large"
        >
          Next Transaction
        </Button>
      </Box>
      
      {timeScale && (
        <Box sx={{ marginY: 2 }}>
          <RangeSlider 
            minValue={timeScale.startTime}
            maxValue={timeScale.endTime}
            formatLabel={(val) => timeScale.formatTimestamp(val)}
            formatCurrentTime={(val) => timeScale.formatCurrentTime(val)}
            currentTime={currentIndex > 0 && transactions.length > 0 ? 
              transactions[currentIndex - 1]?.timestamp : null}
            onRangeChange={handleRangeChange}
          />
        </Box>
      )}
      
      <Paper elevation={3} sx={{ marginTop: 2, padding: 2 }}>
        <Typography variant="h6" gutterBottom>
          Transaction Details
        </Typography>
        <Box 
          component="pre" 
          sx={{ 
            maxHeight: '200px', 
            overflow: 'auto',
            bgcolor: 'grey.100',
            padding: 2,
            borderRadius: 1,
            fontSize: '0.875rem'
          }}
        >
          {txDetails}
        </Box>
        <Box 
          sx={{ 
            height: '24px', 
            color: 'primary.main', 
            fontWeight: 'bold',
            marginTop: 1
          }}
        >
          {status}
        </Box>
      </Paper>
    </Container>
  );
}

export default App;
