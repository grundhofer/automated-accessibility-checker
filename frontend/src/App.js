import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tab,
  Tabs,
  AppBar,
  Toolbar
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import WebsiteTester from './components/WebsiteTester';
import TestResults from './components/TestResults';
import BatchTester from './components/BatchTester';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [testResults, setTestResults] = useState([]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const refreshResults = async () => {
    try {
      const response = await fetch('/api/test-results');
      const results = await response.json();
      setTestResults(results);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  useEffect(() => {
    refreshResults();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Automated Accessibility Checker
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Paper elevation={3}>
          <Tabs value={tabValue} onChange={handleTabChange} centered>
            <Tab label="Test Website" />
            <Tab label="Batch Test" />
            <Tab label="Test Results" />
          </Tabs>
          
          <TabPanel value={tabValue} index={0}>
            <WebsiteTester onTestComplete={refreshResults} />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <BatchTester onTestComplete={refreshResults} />
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <TestResults results={testResults} onRefresh={refreshResults} />
          </TabPanel>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;