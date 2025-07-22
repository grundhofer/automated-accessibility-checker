import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Link,
  Button,
  Alert,
  Menu,
  MenuItem,
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  OpenInNew as OpenIcon,
  GetApp as DownloadIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';

function TestResults({ results, onRefresh }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(null);

  const getSeverityColor = (violations) => {
    if (violations === 0) return 'success';
    if (violations < 5) return 'warning';
    return 'error';
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateUrl = (url, maxLength = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  const handleDownloadClick = (event, testId) => {
    setMenuAnchor(event.currentTarget);
    setSelectedTestId(testId);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setSelectedTestId(null);
  };

  const downloadPdf = async (type) => {
    if (!selectedTestId) return;
    
    setDownloadingPdf(type);
    
    try {
      const response = await fetch(`/api/generate-pdf/${selectedTestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `accessibility-report-${selectedTestId}-${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingPdf(null);
      handleCloseMenu();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Test Results
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
        >
          Refresh
        </Button>
      </Box>

      {results.length === 0 ? (
        <Alert severity="info">
          No test results available. Run some accessibility tests to see results here.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Website URL</TableCell>
                <TableCell align="center">Violations</TableCell>
                <TableCell align="center">Passes</TableCell>
                <TableCell align="center">Incomplete</TableCell>
                <TableCell>Test Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.testId} hover>
                  <TableCell>
                    <Typography variant="body2" title={result.url}>
                      {truncateUrl(result.url)}
                    </Typography>
                    {result.batchId && (
                      <Chip 
                        label="Batch" 
                        size="small" 
                        variant="outlined" 
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={result.violations}
                      color={getSeverityColor(result.violations)}
                      size="small"
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={result.passes}
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={result.incomplete}
                      color="warning"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(result.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Button
                        size="small"
                        startIcon={<OpenIcon />}
                        component={Link}
                        href={result.reportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={(e) => handleDownloadClick(e, result.testId)}
                        variant="contained"
                        color="secondary"
                      >
                        PDF
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* PDF Download Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => downloadPdf('executive')} disabled={downloadingPdf === 'executive'}>
          <PdfIcon sx={{ mr: 1 }} />
          {downloadingPdf === 'executive' ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Generating...
            </>
          ) : (
            'Executive Summary'
          )}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => downloadPdf('technical')} disabled={downloadingPdf === 'technical'}>
          <PdfIcon sx={{ mr: 1 }} />
          {downloadingPdf === 'technical' ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Generating...
            </>
          ) : (
            'Technical Report'
          )}
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default TestResults;