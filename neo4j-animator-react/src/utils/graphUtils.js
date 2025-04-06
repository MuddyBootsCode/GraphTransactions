// Helper functions for graph operations

// Get edge settings based on relationship type
export function getEdgeSettings(fromNode, toNode, type) {
  const defaultSettings = {
    arrows: {
      to: {
        enabled: true,
        type: "arrow"
      }
    },
    color: {
      color: "#2B7CE9",
      highlight: "#2B7CE9",
      hover: "#2B7CE9"
    },
    font: {
      align: "middle",
      strokeWidth: 0
    },
    labelHighlightBold: false
  };
  
  // Customize by relationship type
  switch (type?.toLowerCase()) {
    case 'created':
      return {
        ...defaultSettings,
        color: {
          color: "#41A744",
          highlight: "#41A744",
          hover: "#41A744"
        }
      };
    case 'knows':
      return {
        ...defaultSettings,
        color: {
          color: "#E04696",
          highlight: "#E04696",
          hover: "#E04696"
        }
      };
    case 'acted_in':
    case 'actedin':
      return {
        ...defaultSettings,
        color: {
          color: "#FFA807",
          highlight: "#FFA807", 
          hover: "#FFA807"
        }
      };
    case 'directed':
      return {
        ...defaultSettings,
        color: {
          color: "#9061F9",
          highlight: "#9061F9",
          hover: "#9061F9"
        }
      };
    default:
      return defaultSettings;
  }
}

// Get node color based on labels
export function getNodeColor(labels) {
  if (!labels || !Array.isArray(labels)) {
    return "#2B7CE9"; // Default blue
  }
  
  // Convert labels to lowercase for case-insensitive comparison
  const lowerLabels = labels.map(label => label.toLowerCase());
  
  if (lowerLabels.includes("person")) {
    return "#FFA807"; // Orange
  } else if (lowerLabels.includes("movie")) {
    return "#9061F9"; // Purple
  } else if (lowerLabels.includes("product")) {
    return "#41A744"; // Green
  } else if (lowerLabels.includes("category")) {
    return "#E04696"; // Pink
  } else {
    return "#2B7CE9"; // Default blue
  }
}

// Example data for testing
export const exampleTransactions = [
  {
    "timestamp": "2023-10-25T09:10:15.123Z",
    "txId": "tx1",
    "operations": [
      {
        "type": "create_node",
        "data": {
          "id": "n1",
          "labels": ["Person"],
          "properties": {
            "name": "Alice",
            "age": 30
          }
        }
      }
    ]
  },
  {
    "timestamp": "2023-10-25T09:11:20.456Z",
    "txId": "tx2",
    "operations": [
      {
        "type": "create_node",
        "data": {
          "id": "n2",
          "labels": ["Person"],
          "properties": {
            "name": "Bob",
            "age": 32
          }
        }
      }
    ]
  },
  {
    "timestamp": "2023-10-25T09:12:35.789Z",
    "txId": "tx3",
    "operations": [
      {
        "type": "create_relationship",
        "data": {
          "id": "r1",
          "startNodeId": "n1",
          "endNodeId": "n2",
          "type": "KNOWS",
          "properties": {
            "since": 2020
          }
        }
      }
    ]
  },
  {
    "timestamp": "2023-10-25T09:13:40.123Z",
    "txId": "tx4",
    "operations": [
      {
        "type": "create_node",
        "data": {
          "id": "n3",
          "labels": ["Movie"],
          "properties": {
            "title": "The Matrix",
            "year": 1999
          }
        }
      }
    ]
  },
  {
    "timestamp": "2023-10-25T09:14:45.456Z",
    "txId": "tx5",
    "operations": [
      {
        "type": "create_relationship",
        "data": {
          "id": "r2",
          "startNodeId": "n1",
          "endNodeId": "n3",
          "type": "WATCHED",
          "properties": {
            "rating": 5
          }
        }
      }
    ]
  }
]; 