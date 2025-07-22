import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Link,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  Switch
} from '@mui/material';
import { Send as SendIcon, OpenInNew as OpenIcon } from '@mui/icons-material';

function WebsiteTester({ onTestComplete }) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [wcagLevel, setWcagLevel] = useState('comprehensive');
  const [includeScreenshots, setIncludeScreenshots] = useState(true);

  const wcagOptions = [
    {
      value: 'wcag2a',
      label: 'WCAG 2.0 Level A',
      tags: ['wcag2a'],
      description: 'Basic accessibility requirements'
    },
    {
      value: 'wcag2aa',
      label: 'WCAG 2.0 Level AA',
      tags: ['wcag2a', 'wcag2aa'],
      description: 'Standard accessibility compliance (recommended)'
    },
    {
      value: 'wcag2aaa',
      label: 'WCAG 2.0 Level AAA',
      tags: ['wcag2a', 'wcag2aa', 'wcag2aaa'],
      description: 'Highest WCAG 2.0 accessibility level'
    },
    {
      value: 'wcag21a',
      label: 'WCAG 2.1 Level A',
      tags: ['wcag21a'],
      description: 'WCAG 2.1 minimum requirements'
    },
    {
      value: 'wcag21aa',
      label: 'WCAG 2.1 Level AA',
      tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      description: 'Enhanced mobile and cognitive accessibility'
    },
    {
      value: 'wcag22aa',
      label: 'WCAG 2.2 Level AA',
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      description: 'Latest accessibility standards'
    },
    {
      value: 'section508',
      label: 'US Section 508',
      tags: ['section508'],
      description: 'US Federal accessibility requirements'
    },
    {
      value: 'en301549',
      label: 'EN 301 549',
      tags: ['EN-301-549'],
      description: 'European accessibility standard'
    },
    {
      value: 'best-practice',
      label: 'Best Practices',
      tags: ['best-practice'],
      description: 'Deque accessibility best practices'
    },
    {
      value: 'comprehensive',
      label: 'Comprehensive (All Standards)',
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'section508', 'best-practice'],
      description: 'Complete accessibility analysis across all standards'
    }
  ];

  const handleTest = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setTesting(true);
    setError('');
    setResult(null);

    try {
      const selectedOption = wcagOptions.find(option => option.value === wcagLevel);
      const response = await fetch('/api/test-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: url.trim(),
          wcagLevel: selectedOption.tags,
          includeScreenshots
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to test website');
      }

      const data = await response.json();
      setResult(data);
      onTestComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const getSeverityColor = (violations) => {
    if (violations === 0) return 'success';
    if (violations < 5) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Test Website Accessibility
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Enter a website URL and select WCAG compliance level to test. The test will check for accessibility violations and generate a detailed report.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Website URL"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={testing}
          sx={{ mb: 2 }}
        />
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="wcag-level-label">WCAG Compliance Level</InputLabel>
          <Select
            labelId="wcag-level-label"
            value={wcagLevel}
            label="WCAG Compliance Level"
            onChange={(e) => setWcagLevel(e.target.value)}
            disabled={testing}
          >
            {wcagOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {option.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            Select the WCAG compliance level for accessibility testing
          </FormHelperText>
        </FormControl>
        
        <FormControlLabel
          control={
            <Switch
              checked={includeScreenshots}
              onChange={(e) => setIncludeScreenshots(e.target.checked)}
              disabled={testing}
            />
          }
          label="Capture violation screenshots"
          sx={{ mb: 2 }}
        />
        
        <Button
          variant="contained"
          startIcon={testing ? <CircularProgress size={20} /> : <SendIcon />}
          onClick={handleTest}
          disabled={testing || !url.trim()}
          fullWidth
        >
          {testing ? 'Testing...' : 'Run Accessibility Test'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Results for {result.url}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={`${result.violations} Violations`} 
                color={getSeverityColor(result.violations)}
                variant="filled"
              />
              <Chip 
                label={`${result.passes} Passes`} 
                color="success" 
                variant="outlined"
              />
              <Chip 
                label={`${result.incomplete} Incomplete`} 
                color="warning" 
                variant="outlined"
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Test completed on {new Date(result.timestamp).toLocaleString()}
            </Typography>

            <Button
              variant="outlined"
              startIcon={<OpenIcon />}
              component={Link}
              href={result.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Detailed Report
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default WebsiteTester;