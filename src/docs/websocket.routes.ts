// src/docs/websocket.routes.ts
import { Router } from 'express';
import path from 'path';

export function createWebSocketTestRoutes(): Router {
  const router = Router();

  // Serve the WebSocket test page from the correct location
  router.get('/websocket-test', (req, res) => {
    // Point to the actual location in src/tests/
    res.sendFile(path.join(__dirname, '../tests/websocket-test.html'));
  });

  return router;
}
