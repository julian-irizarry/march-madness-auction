import React, { useState, useEffect } from 'react';
import { Button, Input } from '@mui/joy';
import { Grid, Typography } from '@mui/material';
import { debounce } from 'lodash';

import { BACKEND_URL } from "./Utils";

import './css/App.css';

interface BidProps {
  gameId: string;
  player: string;
  currentHighestBid: number;
  team: string;
  balance: number;
}

function Bid(props: BidProps) {
  const [bid, setBid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update the bid whenever currentHighestBid changes.
  useEffect(() => {
    setBid((props.currentHighestBid + 1).toString());
  }, [props.currentHighestBid]);

  // Debounce bid input changes
  const debouncedSetBid = debounce((value: string) => {
    setBid(value);
  }, 300);

  const handleSubmit = async (customBid?: number) => {
    if (isSubmitting) return;

    const bidNumber = customBid !== undefined ? customBid : parseInt(bid, 10);

    // Validate bid
    if (isNaN(bidNumber)) {
      alert('Please enter a valid number for your bid.');
      return;
    }

    if (bidNumber <= props.currentHighestBid) {
      alert('Your bid must be higher than the current highest bid.');
      return;
    }

    if (bidNumber > props.balance) {
      alert('Your bid cannot exceed your available balance.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`http://${BACKEND_URL}/bid/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: props.gameId,
          player: props.player,
          bid: bidNumber,
          team: props.team,
        }),
      });

      if (!response.ok) {
        throw new Error('Bid submission failed');
      }
    } catch (error) {
      console.error('Error posting bid:', error);
      alert('Failed to submit bid. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const increaseBid = (amount: number) => {
    const newBid = props.currentHighestBid + amount;
    setBid(newBid.toString());
    handleSubmit(newBid);
  };

  return (
    <>
      <Grid container direction="row" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <Grid item xs={3} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Input
            type="number"
            value={bid}
            onChange={(e) => debouncedSetBid(e.target.value)}
            placeholder="Enter bid"
            startDecorator="$"
            sx={{ width: 125 }}
            disabled={isSubmitting}
          />
        </Grid>
        <Grid item xs={3} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Button 
            sx={{ backgroundColor: 'var(--primary-color)', color: 'white' }} 
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
          >
            <Typography sx={{ fontSize: "12px" }}>
              {isSubmitting ? 'Submitting...' : 'Place Bid'}
            </Typography>
          </Button>
        </Grid>
        <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Button 
            sx={{ backgroundColor: 'var(--primary-color)', color: 'white' }} 
            onClick={() => increaseBid(1)}
            disabled={isSubmitting}
          >
            <Typography sx={{ fontSize: "12px" }}>
              {isSubmitting ? 'Submitting...' : '+1'}
            </Typography>
          </Button>
        </Grid>
        <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Button 
            sx={{ backgroundColor: 'var(--primary-color)', color: 'white' }} 
            onClick={() => increaseBid(5)}
            disabled={isSubmitting}
          >
            <Typography sx={{ fontSize: "12px" }}>
              {isSubmitting ? 'Submitting...' : '+5'}
            </Typography>
          </Button>
        </Grid>
        <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Button 
            sx={{ backgroundColor: 'var(--primary-color)', color: 'white' }} 
            onClick={() => increaseBid(10)}
            disabled={isSubmitting}
          >
            <Typography sx={{ fontSize: "12px" }}>
              {isSubmitting ? 'Submitting...' : '+10'}
            </Typography>
          </Button>
        </Grid>
      </Grid>
    </>
  );
}

export default Bid;
