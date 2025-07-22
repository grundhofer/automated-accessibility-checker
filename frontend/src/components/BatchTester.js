import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import { 
  Send as SendIcon, 
  Delete as DeleteIcon,
  Add as AddIcon 
} from '@mui/icons-material';

function BatchTester({ onTestComplete }) {
  const [urls, setUrls] = useState(['']);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [wcagLevel, setWcagLevel] = useState('comprehensive');

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

  const addUrl = () => {
    setUrls([...urls, '']);
  };

  const removeUrl = (index) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleBatchTest = async () => {
    const validUrls = urls.filter(url => url.trim());
    
    if (validUrls.length === 0) {
      setError('Please enter at least one URL');
      return;
    }

    setTesting(true);
    setError('');
    setSuccess('');

    try {
      const selectedOption = wcagOptions.find(option => option.value === wcagLevel);
      const response = await fetch('/api/batch-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          urls: validUrls,
          wcagLevel: selectedOption.tags
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start batch test');
      }

      const data = await response.json();
      setSuccess(`Batch test started with ID: ${data.batchId}. Results will appear in the Test Results tab.`);
      
      // Refresh results after a delay to allow tests to complete
      setTimeout(() => {
        onTestComplete();
      }, 5000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Batch Test Multiple Websites
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Add multiple URLs to test them all at once. Tests will run in the background and results will be available in the Test Results tab.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="batch-wcag-level-label">WCAG Compliance Level</InputLabel>
          <Select
            labelId="batch-wcag-level-label"
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
            Select the WCAG compliance level for batch testing
          </FormHelperText>
        </FormControl>

        {urls.map((url, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TextField
              fullWidth
              label={`Website URL ${index + 1}`}
              placeholder="https://example.com"
              value={url}
              onChange={(e) => updateUrl(index, e.target.value)}
              disabled={testing}
              sx={{ mr: 1 }}
            />
            {urls.length > 1 && (
              <IconButton 
                onClick={() => removeUrl(index)}
                disabled={testing}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        ))}
        
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addUrl}
            disabled={testing}
          >
            Add URL
          </Button>
          
          <Button
            variant="contained"
            startIcon={testing ? <CircularProgress size={20} /> : <SendIcon />}
            onClick={handleBatchTest}
            disabled={testing || urls.every(url => !url.trim())}
          >
            {testing ? 'Starting Tests...' : 'Run Batch Test'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box>
        <Typography variant="h6" gutterBottom>
          URLs to Test ({urls.filter(url => url.trim()).length})
        </Typography>
        <List dense>
          {urls.filter(url => url.trim()).map((url, index) => (
            <ListItem key={index}>
              <ListItemText primary={url} />
              <Chip label="Pending" size="small" />
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
}

export default BatchTester;