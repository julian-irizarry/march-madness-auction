#!/bin/bash

# Name of the tmux session
SESSION="dev_services"

# Start new tmux session with the name dev_services, detached
tmux new-session -d -s $SESSION -n 'Services'

# Split the window vertically into two panes
tmux split-window -h

# Select pane 0 for the frontend service
tmux select-pane -t 0
# Start the frontend service
tmux send-keys -t 0 "docker-compose up frontend" C-m

# Select pane 1 for the backend service
tmux select-pane -t 1
# Start the backend service
tmux send-keys -t 1 "docker-compose up backend" C-m

# Attach to the session
tmux attach-session -t $SESSION

