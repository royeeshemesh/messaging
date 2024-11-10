import { Box, Button, Input, MenuItem, Select, Stack } from '@mui/material';
import { useAtom } from 'jotai';
import React from 'react';
import Home, { meUserIdAtom } from './Home';
import { socket, initSocket } from './socket';

const App = () => {
  const [meUserId, setMeUserId] = useAtom(meUserIdAtom);
  const [remoteValue, setRemoteValue] = React.useState("http://localhost:4000/");

  const [isMeRegistred, setIsMeRegistred] = React.useState(false);

  const handleLogin = () => {
    if (meUserId) {
      initSocket(remoteValue);
      socket.emit('register', meUserId);
      setIsMeRegistred(true);
    }
  }

  const handleUserIdKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  }

  if (!isMeRegistred) {
    return (
      <Stack display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
        <Box width="200px">
          <Input fullWidth placeholder="Enter your user id" value={meUserId} onChange={(e) => setMeUserId(e.target.value)} onKeyUp={handleUserIdKeyUp} />
          <Select sx={{ margin: "5px 0" }} fullWidth size="small" value={remoteValue} onChange={(e) => setRemoteValue(e.target.value)}>
            <MenuItem value="http://localhost:4000/">http://localhost:4000/</MenuItem>
            <MenuItem value="http://localhost:4001/">http://localhost:4001/</MenuItem>
            <MenuItem value="http://localhost:4002/">http://localhost:4002/</MenuItem>
          </Select>
          <Button sx={{ width: "100%", marginTop: "10px" }} variant="contained" size="small" onClick={handleLogin}>Login</Button>
        </Box>
      </Stack>
    );
  }

  return (
    <div>
      <Home />
    </div>
  );
}

export default App;