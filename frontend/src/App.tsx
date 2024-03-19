import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [number, setNumber] = useState('');
  const [receivedNumber, setReceivedNumber] = useState('');

  // Function to handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await fetch('http://localhost:8000/number/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number }),
      });
      setNumber(''); // Clear the input field after submission
    } catch (error) {
      console.error('Error posting number:', error);
    }
  };

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onmessage = (event) => {
      setReceivedNumber(event.data);
    };
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Enter a number"
          />
          <button type="submit">Submit</button>
        </form>
        <p>Received number: {receivedNumber}</p>
      </header>
    </div>
  );
}

export default App;

