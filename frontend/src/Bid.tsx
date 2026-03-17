import React, { useState, useEffect } from 'react';

import { BACKEND_HTTP_URL } from "./Utils"

interface BidProps {
  gameId: string
  player: string
  currentHighestBid: number
  team: string
  balance: number
  disabled?: boolean
}

function Bid(props: BidProps) {
  const [bid, setBid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const minimumBid = props.currentHighestBid + 1;
  const auctionDisabled = Boolean(props.disabled);
  const insufficientBalance = !auctionDisabled && props.balance < minimumBid;
  const parsedBid = parseInt(bid, 10);
  const hasBidValue = !Number.isNaN(parsedBid);
  const effectiveBid = hasBidValue ? parsedBid : minimumBid;
  const quickRaiseOptions = [1, 5, 10];

  useEffect(() => {
    setBid(Math.max(0, props.currentHighestBid + 1).toString());
  }, [props.currentHighestBid]);

  const formatCurrency = (value: number) => `$${Math.max(0, Math.round(value)).toLocaleString()}`;

  const handleBidChange = (value: string) => {
    if (value === '') {
      setBid('');
      return;
    }

    const nextValue = value.replace(/[^\d]/g, '');
    setBid(nextValue);
  };

  const handleQuickRaise = (amount: number) => {
    const startingPoint = hasBidValue ? parsedBid : props.currentHighestBid;
    const nextBid = Math.min(props.balance, Math.max(props.currentHighestBid + 1, startingPoint + amount));
    setBid(nextBid.toString());
  };

  const handleMaxBid = () => {
    setBid(Math.max(0, props.balance).toString());
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || auctionDisabled) return;

    const bidNumber = parseInt(bid, 10);
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
      const response = await fetch(`${BACKEND_HTTP_URL}/bid/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ gameId: props.gameId, player: props.player, bid: bidNumber, team: props.team }),
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

  return (
    <form className="bid-panel-controls" onSubmit={handleSubmit}>
      <div className="bid-panel-controls__steps">
        {quickRaiseOptions.map((amount) => {
          const isDisabled = props.balance < props.currentHighestBid + 1 || Math.max(props.currentHighestBid + 1, effectiveBid + amount) > props.balance;

          return (
            <button
              key={amount}
              type="button"
              className="bid-panel-controls__step"
              onClick={() => handleQuickRaise(amount)}
              disabled={isSubmitting || auctionDisabled || insufficientBalance || isDisabled}
            >
              +${amount}
            </button>
          );
        })}

        <button
          type="button"
          className="bid-panel-controls__step bid-panel-controls__step--max"
          onClick={handleMaxBid}
          disabled={isSubmitting || auctionDisabled || insufficientBalance}
        >
          Max
        </button>
      </div>

      <div className="bid-panel-controls__mainline">
        <div className="bid-panel-controls__entry">
          <label className="bid-panel-controls__field">
            <span className="bid-panel-controls__currency">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={bid}
              onChange={(e) => handleBidChange(e.target.value)}
              placeholder="Enter bid"
              className="bid-panel-controls__input"
              disabled={isSubmitting || auctionDisabled || insufficientBalance}
              aria-label={`Bid amount for ${props.team}`}
            />
          </label>
        </div>

        <button
          type="submit"
          className="bid-panel-controls__submit"
          disabled={isSubmitting || auctionDisabled || insufficientBalance}
        >
          {isSubmitting
            ? 'Submitting...'
            : auctionDisabled
              ? 'Awaiting team'
              : insufficientBalance
                ? 'Insufficient funds'
                : `Bid ${formatCurrency(effectiveBid || minimumBid)}`}
        </button>
      </div>

      <div className="bid-panel-controls__footer">
        <span className="bid-panel-controls__helper">
          {auctionDisabled
            ? "Waiting for the next team"
            : insufficientBalance
              ? `Need ${formatCurrency(minimumBid)} to enter`
              : `Minimum ${formatCurrency(minimumBid)}`}
        </span>

        <span className="bid-panel-controls__balance">
          <span className="bid-panel-controls__balance-label">Balance:</span>
          <strong className="bid-panel-controls__balance-value">{formatCurrency(props.balance)}</strong>
        </span>
      </div>
    </form>
  );
}

export default Bid;
