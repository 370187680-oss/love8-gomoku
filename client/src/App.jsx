import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import love8Theme from './theme/love8Theme';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

function App() {
  return (
    <ThemeProvider theme={love8Theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/game" element={<GameBoard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
