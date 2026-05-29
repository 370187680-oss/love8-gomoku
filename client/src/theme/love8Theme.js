import { createTheme } from '@mui/material/styles';

// Love8 brand theme configuration
const love8Theme = createTheme({
  palette: {
    primary: {
      main: '#E91E63', // Love8 primary pink
      light: '#F48FB1',
      dark: '#C2185B',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F48FB1', // Love8 secondary pink
      light: '#FCE4EC',
      dark: '#E91E63',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FCE4EC',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none',
          fontSize: '1rem',
        },
      },
    },
  },
});

export default love8Theme;
