/**
 * P2P Peer Discovery API
 *
 * A lightweight service for P2P peer discovery.
 * Stores peer IDs and game stats (5 minutes expiry).
 * No personal data is stored.
 *
 * Deploy to Vercel for free hosting.
 */

import { kv } from '@vercel/kv';

// PEER_TTL is in seconds (5 minutes)
const PEER_TTL = 300;
const PEER_PREFIX = 'peer:';

interface PeerData {
  peerId: string;
  merit: number;
  completedDays: number;
  currentStreak: number;
  timestamp: number;
}

/**
 * GET /api/peers
 * Returns list of active peer IDs with their stats
 */
export async function GET() {
  try {
    // Get all peer keys
    const peers: PeerData[] = [];
    let cursor = null;

    do {
      const result = await kv.list({ cursor, limit: 100 });
      cursor = result.cursor;

      // Filter for peer keys and check if they're still valid (not expired)
      for (const key of result.keys) {
        if (key.name.startsWith(PEER_PREFIX)) {
          // Verify the key hasn't expired
          const value = await kv.get(key.name);
          if (value !== null) {
            peers.push(value as PeerData);
          }
        }
      }
    } while (cursor);

    // Return active peers with stats
    return Response.json({
      peers: peers.map(p => ({
        peerId: p.peerId,
        merit: p.merit,
        completedDays: p.completedDays,
        currentStreak: p.currentStreak,
      })),
      count: peers.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting peers:', error);
    return Response.json(
      { error: 'Failed to get peers', peers: [], count: 0 },
      { status: 500 }
    );
  }
}

/**
 * POST /api/peers
 * Register or update a peer's heartbeat with stats
 * Body: { peerId: string, merit: number, completedDays: number, currentStreak: number }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { peerId, merit = 0, completedDays = 0, currentStreak = 0 } = body;

    if (!peerId || typeof peerId !== 'string') {
      return Response.json(
        { error: 'Invalid peerId' },
        { status: 400 }
      );
    }

    // Validate peerId format (basic validation)
    if (!peerId.match(/^user_[a-z0-9_]+$/)) {
      return Response.json(
        { error: 'Invalid peerId format' },
        { status: 400 }
      );
    }

    // Store/update peer with expiration and stats
    const peerData: PeerData = {
      peerId,
      merit: Number(merit) || 0,
      completedDays: Number(completedDays) || 0,
      currentStreak: Number(currentStreak) || 0,
      timestamp: Date.now(),
    };

    const success = await kv.set(
      `${PEER_PREFIX}${peerId}`,
      peerData,
      { px: PEER_TTL } // px = expiration in seconds
    );

    if (!success) {
      return Response.json(
        { error: 'Failed to register peer' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      peerId,
      expiresIn: PEER_TTL,
    });
  } catch (error) {
    console.error('Error registering peer:', error);
    return Response.json(
      { error: 'Failed to register peer' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/peers
 * Remove a peer from the discovery service
 * Body: { peerId: string }
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { peerId } = body;

    if (!peerId) {
      return Response.json(
        { error: 'Missing peerId' },
        { status: 400 }
      );
    }

    await kv.del(`${PEER_PREFIX}${peerId}`);

    return Response.json({
      success: true,
      message: 'Peer removed',
    });
  } catch (error) {
    console.error('Error removing peer:', error);
    return Response.json(
      { error: 'Failed to remove peer' },
      { status: 500 }
    );
  }
}
