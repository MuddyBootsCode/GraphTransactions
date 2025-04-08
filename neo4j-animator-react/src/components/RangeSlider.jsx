import { useState, useEffect } from 'react';
import { Slider, Typography, Box, Paper, Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const RangeSlider = ({ 
  minValue = 0, 
  maxValue = 100, 
  initialLeftValue = null, 
  initialRightValue = null, 
  formatLabel = (val) => val, 
  formatCurrentTime = (val) => val, 
  currentTime = null,
  onRangeChange 
}) => {
  // If initialLeftValue/initialRightValue not provided, use the full range
  const defaultLeftValue = initialLeftValue !== null ? initialLeftValue : minValue;
  const defaultRightValue = initialRightValue !== null ? initialRightValue : maxValue;
  
  const [value, setValue] = useState([defaultLeftValue, defaultRightValue]);
  
  // Update the slider when min/max values change
  useEffect(() => {
    setValue([minValue, maxValue]);
  }, [minValue, maxValue]);
  
  // Notify parent component of range change
  useEffect(() => {
    if (onRangeChange) {
      onRangeChange(value[0], value[1]);
    }
  }, [value, onRangeChange]);
  
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  
  return (
    <Paper elevation={2} sx={{ padding: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
        <Chip
          icon={<AccessTimeIcon />}
          color="primary"
          label={currentTime !== null ? formatCurrentTime(currentTime) : "No transaction"}
          sx={{ fontSize: '1rem', fontWeight: 'medium', padding: 1 }}
        />
      </Box>
      
      <Typography variant="body1" fontWeight="medium" sx={{ marginBottom: 1 }}>
        Select Time Range:
      </Typography>
      
      <Box sx={{ padding: '0 10px' }}>
        <Slider
          value={value}
          onChange={handleChange}
          valueLabelDisplay="auto"
          valueLabelFormat={formatLabel}
          min={minValue}
          max={maxValue}
          sx={{ marginBottom: 2 }}
        />
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          color: 'text.secondary',
          fontSize: '0.875rem'
        }}>
          <Chip 
            label={formatLabel(minValue)} 
            size="small" 
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
          <Chip 
            label={formatLabel(maxValue)} 
            size="small" 
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default RangeSlider; 