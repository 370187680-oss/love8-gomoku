import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import love8Theme from './theme/love8Theme';
import GameBoard from './components/GameBoard';

function App() {
  return (
    <ThemeProvider theme={love8Theme}>
      <GameBoard />
    </ThemeProvider>
  );
}

export default App;
