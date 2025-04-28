import React from 'react';
import { Box, Typography } from '@mui/material';
import StudentRating from '../../components/StudentRating';

const RatingPage = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Рейтинг класса
      </Typography>
      
      <StudentRating />
    </Box>
  );
};

export default RatingPage; 