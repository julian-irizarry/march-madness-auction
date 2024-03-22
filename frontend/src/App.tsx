import React, { useState, useEffect } from 'react';
import './App.css';
import Button from '@mui/joy/Button'; // Importing Button from MUI Joy
import Input from '@mui/joy/Input'; // Corrected import for Input

function App() {
  const [bid, setBid] = useState('');
  const [currentHighestBid, setCurrentHighestBid] = useState(0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const bidNumber = parseInt(bid, 10);
    if (isNaN(bidNumber) || bidNumber <= currentHighestBid) {
      alert('Your bid must be a number and higher than the current highest bid.');
      return;
    }
    try {
      await fetch('http://localhost:8000/number/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: bidNumber }),
      });
      setBid(''); // Clear the input field after submission
    } catch (error) {
      console.error('Error posting bid:', error);
    }
  };

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onmessage = (event) => {
      const receivedBid = parseInt(event.data, 10);
      setCurrentHighestBid(receivedBid);
      if (!isNaN(receivedBid)) {
        setCurrentHighestBid(receivedBid); // Update state with the received bid
      }
    };
    return () => ws.close(); // Cleanup WebSocket connection on component unmount
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <form onSubmit={handleSubmit}>
          {/* Updated Input component */}
          <Input 
            type="number" // Specify type here for numeric input
            value={bid}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBid(e.target.value)}
            placeholder="Enter your bid" 
          />
          {/* Button for submitting the form */}
          <Button type="submit">Place Bid</Button>
        </form>
        <p>Current highest bid: {currentHighestBid}</p>
      </header>
    </div>
  );
}

export default App;
