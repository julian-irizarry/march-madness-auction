import React, { useState, useEffect, useRef } from 'react';
import { Button, Input} from '@mui/joy';
import { Grid } from '@mui/material';

import './App.css';

interface BidProps {
  gameId: string
  currentHighestBid: number
  team: string
}

function Bid(props: BidProps) {
  const [bid, setBid] = useState('');

  // This useEffect hook updates the bid state whenever currentHighestBid changes.
  // It sets the bid to be one more than the currentHighestBid, ensuring it's always higher.
  useEffect(() => {
    setBid((props.currentHighestBid + 1).toString());
  }, [props.currentHighestBid]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const bidNumber = parseInt(bid, 10);
    if (isNaN(bidNumber) || bidNumber <= props.currentHighestBid) {
      alert('Your bid must be higher than the current highest bid.');
      return;
    }
    try {
      await fetch('http://localhost:8000/bid/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: props.gameId, bid: bidNumber, team: props.team }),
      });
    } catch (error) {
      console.error('Error posting bid:', error);
    }
  };

  return (
    <>
    <Grid container spacing={0.5} direction="row" alignItems="center">
      <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <Input 
          type="number"
          value={bid}
          onChange={(e) => setBid(e.target.value)}
          placeholder="Enter bid"
          startDecorator="$"
          sx={{ width: 125 }}
        />
      </Grid>
      <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <Button onClick={handleSubmit}>Place Bid</Button>
      </Grid>
    </Grid>
    </>
  );
}

export default Bid;
