import { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

// Graph component for Neo4j transaction visualization
const Graph = ({ 
  nodes = [], 
  edges = [], 
  onNodeClick, 
  onNetworkReady 
}) => {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create datasets from props
    const nodesDataset = new DataSet(nodes);
    const edgesDataset = new DataSet(edges);

    // Network configuration options
    const options = {
      nodes: {
        shape: 'dot',
        size: 16,
        font: {
          size: 12,
          face: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
        },
        borderWidth: 2,
        shadow: true
      },
      edges: {
        width: 1,
        shadow: true,
        smooth: {
          type: 'continuous',
          forceDirection: 'none'
        },
        font: {
          size: 12,
          face: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
          align: 'middle'
        }
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.3,
          springLength: 140,
          springConstant: 0.04,
          damping: 0.09
        },
        stabilization: {
          enabled: true,
          iterations: 1000,
          updateInterval: 100
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
        navigationButtons: false,
        keyboard: true
      }
    };

    // Create the network
    const data = {
      nodes: nodesDataset,
      edges: edgesDataset
    };

    const network = new Network(containerRef.current, data, options);
    
    // Store network reference
    networkRef.current = network;
    
    // Set up event handlers
    network.on('click', function(params) {
      if (params.nodes.length > 0 && onNodeClick) {
        const nodeId = params.nodes[0];
        const node = nodesDataset.get(nodeId);
        onNodeClick(node);
      }
    });
    
    // Notify parent component that network is ready
    if (onNetworkReady) {
      onNetworkReady(network);
    }
    
    // Clean up on unmount
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, []);

  // Update nodes when they change
  useEffect(() => {
    if (networkRef.current) {
      const nodesDataset = networkRef.current.body.data.nodes;
      
      // Clear existing nodes and add new ones
      nodesDataset.clear();
      nodesDataset.add(nodes);
    }
  }, [nodes]);

  // Update edges when they change
  useEffect(() => {
    if (networkRef.current) {
      const edgesDataset = networkRef.current.body.data.edges;
      
      // Clear existing edges and add new ones
      edgesDataset.clear();
      edgesDataset.add(edges);
    }
  }, [edges]);

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
      networkRef.current.fit({ animation: true });
    }
  };

  // Attach methods to component
  Graph.zoomIn = zoomIn;
  Graph.zoomOut = zoomOut;
  Graph.recenterView = recenterView;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
  );
};

export default Graph; 