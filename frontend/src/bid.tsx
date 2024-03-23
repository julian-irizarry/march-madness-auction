import React, { useState, useEffect } from 'react';
import './App.css';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';

function App() {
  const [bid, setBid] = useState('');
  const [currentHighestBid, setCurrentHighestBid] = useState(0);

  // This useEffect hook updates the bid state whenever currentHighestBid changes.
  // It sets the bid to be one more than the currentHighestBid, ensuring it's always higher.
  useEffect(() => {
    setBid((currentHighestBid + 1).toString());
  }, [currentHighestBid]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const bidNumber = parseInt(bid, 10);
    if (isNaN(bidNumber) || bidNumber <= currentHighestBid) {
      alert('Your bid must be higher than the current highest bid.');
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
    } catch (error) {
      console.error('Error posting bid:', error);
    }
  };

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws-bid');
    ws.onmessage = (event) => {
      const receivedBid = parseInt(event.data, 10);
      if (!isNaN(receivedBid)) {
        setCurrentHighestBid(receivedBid);
      }
    };
    return () => ws.close(); // Cleanup WebSocket connection on component unmount
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <form onSubmit={handleSubmit}>
          <Input 
            type="number"
            value={bid}
            onChange={(e) => setBid(e.target.value)}
            placeholder="Enter bid"
            startDecorator={'$'}
            sx={{ width: 125 }}
          />
          <Button type="submit">Place Bid</Button>
        </form>
        <p>Highest bid: ${currentHighestBid}</p>
      </header>
    </div>
  );
}

export default App;
