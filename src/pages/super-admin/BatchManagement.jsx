import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Tab, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

export default function BatchManagement() {
  const [activeRegion, setActiveRegion] = useState('India');
  const [batches, setBatches] = useState([]);

  // Mock Regions for UI filtering
  const regions = ['India', 'US', 'Canada', 'UK'];

  const handleTabChange = (event, newValue) => {
    setActiveRegion(newValue);
    // TODO: Fetch batches for the selected region
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Batch & Cohort Management
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs 
          value={activeRegion} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {regions.map((region) => (
            <Tab key={region} label={region} value={region} />
          ))}
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Batch Name</strong></TableCell>
              <TableCell><strong>Start Date</strong></TableCell>
              <TableCell><strong>Deadline Date</strong></TableCell>
              <TableCell><strong>Students</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <Typography variant="body1" color="textSecondary">
                    No active cohorts found for {activeRegion}. 
                    (Batches will be dynamically generated here when the first student enrolls!)
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              // Map through actual batches here
              null
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
