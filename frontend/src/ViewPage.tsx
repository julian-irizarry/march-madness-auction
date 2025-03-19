import { Typography, List, ListItem, Chip } from "@mui/joy";
import { Paper, Grid, Card } from "@mui/material";
import { useLocation } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";

import Bracket from "./Bracket";
import { PlayerInfo, TeamInfo, Match, BACKEND_URL } from "./Utils"
import { ReactComponent as CrownIcon } from "./icons/crown.svg";
import { ReactComponent as UserIcon } from "./icons/user.svg";

function ViewPage() {

    return (
        <div id="outer-container">
        </div>
    )
}

export default ViewPage;
