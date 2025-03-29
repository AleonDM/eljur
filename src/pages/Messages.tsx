import React, { useState } from 'react';
import { Box, useTheme, useMediaQuery, Grid } from '@mui/material';
import MessageList from '../components/MessageList';
import MessageDialog from '../components/MessageDialog';

interface MessagesProps {
  currentUser: {
    userId: number;
    role: string;
  };
}

const Messages: React.FC<MessagesProps> = ({ currentUser }) => {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSelectConversation = (userId: number) => {
    setSelectedUserId(userId);
  };
  
  const handleBackToList = () => {
    console.log('Возврат к списку диалогов');
    setSelectedUserId(null);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', p: 2 }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        <Grid
          item
          xs={12}
          sm={4}
          sx={{
            height: '100%',
            display: isMobile && selectedUserId ? 'none' : 'block'
          }}
        >
          <MessageList
            onSelectConversation={handleSelectConversation}
            selectedUserId={selectedUserId || undefined}
          />
        </Grid>
        <Grid
          item
          xs={12}
          sm={8}
          sx={{
            height: '100%',
            display: isMobile && !selectedUserId ? 'none' : 'block'
          }}
        >
          <MessageDialog
            selectedUserId={selectedUserId}
            currentUserId={currentUser.userId}
            onBackToList={handleBackToList}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Messages; 