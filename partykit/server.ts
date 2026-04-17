/**
 * PartyKit Server for Fasting App Leaderboard
 * Handles real-time leaderboard synchronization
 */

// Leaderboard data structure
interface LeaderboardEntry {
  userId: string;
  nickname: string;
  streak: number;
  completedDays: number;
  totalMerit: number;
  lastUpdate: number;
  rank?: number;
}

// Party room state
interface RoomState {
  leaderboard: Record<string, LeaderboardEntry>;
  top1000: LeaderboardEntry[];
}

export default {
  async onConnect(ws: WebSocket) {
    console.log('[PartyKit] Client connected');
  },

  async onMessage(ws: WebSocket, message: string | Buffer) {
    try {
      const data = JSON.parse(message.toString());
      const room = (ws as any).room;

      switch (data.type) {
        case 'publish':
          // Publish user stats to leaderboard
          await handlePublish(room, data.payload);
          break;

        case 'getLeaderboard':
          // Get top 100 leaderboard
          await sendLeaderboard(room, ws);
          break;

        case 'removeUser':
          // Remove user from leaderboard
          await handleRemoveUser(room, data.userId);
          break;
      }
    } catch (err) {
      console.error('[PartyKit] Message error:', err);
    }
  },

  async onRequest(req: Request) {
    // Handle HTTP requests for health check
    if (req.method === 'GET') {
      return new Response('PartyKit Leaderboard Server - OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    return new Response('Method not allowed', { status: 405 });
  }
};

/**
 * Handle publishing user stats to leaderboard
 */
async function handlePublish(room: any, payload: LeaderboardEntry) {
  const state = room.storage ?? { leaderboard: {}, top1000: [] };

  // Update or add user entry
  state.leaderboard[payload.userId] = payload;

  // Update top 1000
  updateTop1000(state);

  // Broadcast updated leaderboard to all connected clients
  room.broadcast(JSON.stringify({
    type: 'leaderboardUpdate',
    payload: state.top1000
  }));

  // Save state
  room.storage = state;
}

/**
 * Update top 1000 leaderboard
 */
function updateTop1000(state: RoomState) {
  const allUsers = Object.values(state.leaderboard);

  // Sort by streak (desc), then completed days (desc)
  const sorted = allUsers.sort((a, b) =>
    b.streak - a.streak || b.completedDays - a.completedDays
  );

  // Take top 1000 and add ranks
  state.top1000 = sorted.slice(0, 1000).map((user, index) => ({
    ...user,
    rank: index + 1
  }));
}

/**
 * Send leaderboard to requesting client
 */
async function sendLeaderboard(room: any, ws: WebSocket) {
  const state = room.storage ?? { leaderboard: {}, top1000: [] };

  ws.send(JSON.stringify({
    type: 'leaderboardUpdate',
    payload: state.top1000
  }));
}

/**
 * Handle user removal
 */
async function handleRemoveUser(room: any, userId: string) {
  const state = room.storage ?? { leaderboard: {}, top1000: [] };

  delete state.leaderboard[userId];
  updateTop1000(state);

  room.broadcast(JSON.stringify({
    type: 'leaderboardUpdate',
    payload: state.top1000
  }));

  room.storage = state;
}
