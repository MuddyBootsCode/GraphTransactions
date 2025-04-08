import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Box, Typography, CircularProgress } from '@mui/material';

// Graph component for Neo4j transaction visualization
const Graph = ({ 
  nodes = [], 
  edges = [], 
  onNodeClick, 
  onNetworkReady 
}) => {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesDatasetRef = useRef(null);
  const edgesDatasetRef = useRef(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [networkId, setNetworkId] = useState(0); // Used to force recreation of network
  const [isStabilizing, setIsStabilizing] = useState(false);

  // Add debug information to help diagnose issues
  useEffect(() => {
    // Early return if no data provided
    if (!nodes.length && !edges.length) {
      console.log('No data provided to graph component, skipping rendering');
      setDebugInfo('');
      setIsStabilizing(false);
      
      // Clear any existing network when there's no data
      if (networkRef.current) {
        console.log('Destroying network instance due to empty data');
        networkRef.current.destroy();
        networkRef.current = null;
      }
      
      return;
    }

    console.log('Graph received data:', { 
      nodesCount: nodes.length,
      edgesCount: edges.length,
      nodes: JSON.stringify(nodes).substring(0, 200) + '...',
      edges: JSON.stringify(edges).substring(0, 200) + '...',
      networkExists: !!networkRef.current
    });
    
    setDebugInfo(`Nodes: ${nodes.length}, Edges: ${edges.length}`);
    
    // Validate node and edge data
    const validationIssues = [];
    
    if (!Array.isArray(nodes)) {
      validationIssues.push('Nodes is not an array');
    } else {
      nodes.forEach((node, index) => {
        if (!node.id) validationIssues.push(`Node at index ${index} is missing id`);
      });
    }
    
    if (!Array.isArray(edges)) {
      validationIssues.push('Edges is not an array');
    } else {
      edges.forEach((edge, index) => {
        if (!edge.from) validationIssues.push(`Edge at index ${index} is missing from`);
        if (!edge.to) validationIssues.push(`Edge at index ${index} is missing to`);
      });
    }
    
    if (validationIssues.length > 0) {
      const msg = `Data validation issues: ${validationIssues.join(', ')}`;
      console.error(msg);
      setError(msg);
      return;
    }

    if (!containerRef.current) {
      console.log('Container ref is not available yet');
      return;
    }
    
    try {
      // Create or update the datasets
      if (!nodesDatasetRef.current) {
        nodesDatasetRef.current = new DataSet([]);
      }
      
      if (!edgesDatasetRef.current) {
        edgesDatasetRef.current = new DataSet([]);
      }
      
      // Update datasets with new data
      // Clear existing data first
      nodesDatasetRef.current.clear();
      edgesDatasetRef.current.clear();
      
      // Add new data
      if (nodes.length > 0) {
        const safeNodes = nodes.map(node => ({...node, fixed: true}));
        nodesDatasetRef.current.add(safeNodes);
      }
      
      if (edges.length > 0) {
        const safeEdges = edges.map(edge => ({...edge}));
        edgesDatasetRef.current.add(safeEdges);
      }
      
      // Force recreation of network if not exists
      if (!networkRef.current) {
        setNetworkId(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error updating datasets:", err);
      console.error("Error stack:", err.stack);
      setError(`Error updating datasets: ${err.message}. Check console for details.`);
    }
  }, [nodes, edges]);

  // Initialize and update network when container is ready or networkId changes
  useEffect(() => {
    // Skip network creation if no data
    if ((!nodes.length && !edges.length) || !containerRef.current || !nodesDatasetRef.current || !edgesDatasetRef.current) {
      setIsStabilizing(false);
      return;
    }

    try {
      console.log('Creating network with:', {
        containerExists: !!containerRef.current,
        nodesCount: nodesDatasetRef.current.length,
        edgesCount: edgesDatasetRef.current.length,
        networkId
      });
      
      setError(null);
      setIsStabilizing(true);

      // Network configuration options
      const options = {
        nodes: {
          shape: 'dot',
          size: 30,
          font: {
            size: 14,
            face: 'Roboto, Arial, sans-serif',
            color: '#333333'
          },
          borderWidth: 2,
          shadow: true,
          fixed: {
            x: true,
            y: true
          },
          color: {
            background: '#97C2FC',
            border: '#2B7CE9',
            highlight: {
              background: '#D2E5FF',
              border: '#2B7CE9'
            }
          }
        },
        edges: {
          width: 2,
          shadow: true,
          color: {
            color: '#848484',
            highlight: '#848484'
          },
          smooth: {
            enabled: false
          },
          font: {
            size: 12,
            face: 'Roboto, Arial, sans-serif',
            align: 'middle',
            color: '#555555'
          }
        },
        physics: {
          enabled: false // Disable physics by default
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          zoomView: true,
          dragView: true,
          navigationButtons: false,
          keyboard: true,
          multiselect: false
        },
        layout: {
          randomSeed: 42, // Fixed seed for reproducible layout
          improvedLayout: true,
          hierarchical: {
            enabled: false
          }
        },
        height: '100%',
        width: '100%'
      };

      // Create the network data object
      const data = {
        nodes: nodesDatasetRef.current,
        edges: edgesDatasetRef.current
      };

      // Destroy previous network if it exists
      if (networkRef.current) {
        console.log('Destroying previous network instance');
        networkRef.current.destroy();
        networkRef.current = null;
      }

      console.log('Creating new network instance');
      const network = new Network(containerRef.current, data, options);
      
      // Store network reference
      networkRef.current = network;
      console.log('Network instance created and stored');
      
      // Set up event handlers
      network.on('click', function(params) {
        console.log('Network click event:', params);
        if (params.nodes.length > 0 && onNodeClick) {
          const nodeId = params.nodes[0];
          const node = nodesDatasetRef.current.get(nodeId);
          onNodeClick(node);
        }
      });
      
      // Do a controlled stabilization if needed
      if (nodes.length > 0 && edges.length > 0) {
        // Enable physics temporarily for layout
        network.setOptions({ 
          physics: { 
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
              gravitationalConstant: -20,
              centralGravity: 0.005,
              springLength: 100,
              springConstant: 0.02,
              damping: 0.9
            },
            stabilization: {
              enabled: true,
              iterations: 200,
              updateInterval: 25
            }
          }
        });
        
        // Monitor stabilization progress
        network.on('stabilizationProgress', function(params) {
          const progress = Math.round(params.iterations / params.total * 100);
          console.log(`Stabilization progress: ${progress}%`);
          setDebugInfo(`Stabilizing: ${progress}%`);
        });
        
        // When stabilization is done
        network.once('stabilizationIterationsDone', function() {
          console.log('Stabilization done, disabling physics');
          
          // Disable physics once stabilized
          network.setOptions({ physics: { enabled: false } });
          
          // Fix all nodes in place
          const nodeIds = nodesDatasetRef.current.getIds();
          nodeIds.forEach(id => {
            nodesDatasetRef.current.update({ id, fixed: { x: true, y: true } });
          });
          
          setIsStabilizing(false);
          setDebugInfo(`Nodes: ${nodes.length}, Edges: ${edges.length} (Stable)`);
          
          // Fit the view
          network.fit({
            animation: {
              duration: 500,
              easingFunction: 'easeOutQuint'
            }
          });
        });
      } else {
        setIsStabilizing(false);
      }
      
      // Notify parent component that network is ready
      if (onNetworkReady) {
        console.log('Calling onNetworkReady callback');
        onNetworkReady(network);
      }
      
      // Add window resize handler to keep the graph responsive
      const handleResize = () => {
        if (networkRef.current) {
          console.log('Window resize detected, redrawing network');
          networkRef.current.redraw();
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Clean up on unmount
      return () => {
        console.log('Graph component unmounting, cleaning up');
        window.removeEventListener('resize', handleResize);
        if (networkRef.current) {
          networkRef.current.destroy();
          networkRef.current = null;
        }
      };
    } catch (err) {
      console.error("Error rendering graph:", err);
      console.error("Error stack:", err.stack);
      setError(`Error rendering graph: ${err.message}. Check console for details.`);
      setIsStabilizing(false);
    }
  }, [networkId, onNodeClick, onNetworkReady, nodes.length, edges.length]); // Include node/edge counts to respond to empty data

  // Expose control methods
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
      networkRef.current.fit({ 
        animation: {
          duration: 300,
          easingFunction: 'easeInOutQuad'
        }
      });
    }
  };

  // Attach methods to component
  Graph.zoomIn = zoomIn;
  Graph.zoomOut = zoomOut;
  Graph.recenterView = recenterView;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: '#fafafa',
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      {/* Only show content if we have data */}
      {!nodes.length && !edges.length ? (
        <Typography variant="body1" color="textSecondary">
          No graph data to display
        </Typography>
      ) : (
        <>
          {error && (
            <Typography 
              color="error" 
              sx={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                textAlign: 'center',
                maxWidth: '80%'
              }}
            >
              {error}
            </Typography>
          )}
          
          {/* Stabilization loading indicator */}
          {isStabilizing && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 2,
                borderRadius: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.8)'
              }}
            >
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Optimizing graph layout...
              </Typography>
            </Box>
          )}
          
          {/* Debug information */}
          {debugInfo && (
            <Typography 
              variant="caption"
              sx={{ 
                position: 'absolute',
                top: 10,
                left: 10,
                zIndex: 5,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                padding: '4px 8px',
                borderRadius: 1
              }}
            >
              {debugInfo}
            </Typography>
          )}
        </>
      )}
      
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%'
        }}
      />
    </Box>
  );
};

export default Graph; 