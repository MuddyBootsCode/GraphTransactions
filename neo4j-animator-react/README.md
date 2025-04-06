# Neo4j Transaction Animator (React Version)

A React application for visualizing Neo4j transaction sequences. The application allows you to:

- Visualize transaction sequences from Neo4j operations
- Step through transactions one by one
- View detailed information about each transaction
- Filter transactions by time range
- Zoom and navigate the graph visualization

## Features

- Interactive graph visualization using vis-network
- Transaction playback controls (forward/backward)
- Time-based filtering with a custom range slider
- Zoom and pan controls for the graph
- File upload for custom transaction data
- Example data for quick demos

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd neo4j-animator-react
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (usually http://localhost:5173)

## Usage

1. Click "Load Example Data" to load a set of sample transactions
2. Use "Next Transaction" and "Previous Transaction" buttons to step through the transactions
3. View transaction details in the details panel
4. Use the time range slider to filter transactions by time
5. Use the zoom controls or mouse wheel to zoom in/out of the graph
6. To use your own transaction data, click "Upload JSON" and select a JSON file with the correct format

## Data Format

The application expects transaction data in the following JSON format:

```json
[
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
  }
]
```

## Built With

- [React](https://reactjs.org/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool and development server
- [vis-network](https://visjs.github.io/vis-network/docs/network/) - Graph visualization library

## License

This project is licensed under the MIT License
