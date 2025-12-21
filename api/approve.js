/**
 * ============================================================================
 * APPROVE ACCESS API
 * ============================================================================
 *
 * GET /api/approve?email=xxx&token=xxx
 *
 * Called when Kevin clicks the "Approve" button in Slack.
 * Updates the access request status to approved.
 *
 * Security: Requires matching APPROVE_SECRET token to prevent
 * random people from approving access requests.
 *
 * Environment variables required:
 * - NEON_DATABASE_URL: PostgreSQL connection string
 * - APPROVE_SECRET: Secret token for validation
 */

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Only allow GET (for easy link clicking in Slack)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, token } = req.query;

  // Validate token
  if (!token || token !== process.env.APPROVE_SECRET) {
    return res.status(403).send(htmlResponse('ACCESS DENIED', 'Invalid authorization token', false));
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).send(htmlResponse('ERROR', 'Email parameter required', false));
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const sql = neon(process.env.NEON_DATABASE_URL);

    // Check if request exists
    const existing = await sql`
      SELECT status FROM access_requests WHERE email = ${normalizedEmail}
    `;

    if (existing.length === 0) {
      return res.status(404).send(htmlResponse('NOT FOUND', `No access request found for ${normalizedEmail}`, false));
    }

    // Update to approved (even if already approved, just update timestamp)
    if (existing[0].status !== 'approved') {
      await sql`
        UPDATE access_requests
        SET status = 'approved', approved_at = NOW()
        WHERE email = ${normalizedEmail}
      `;
    }

    // Redirect straight to Spotify Dashboard - no intermediate screen
    return res.redirect(302, SPOTIFY_DASHBOARD_USERS);

  } catch (error) {
    console.error('Approve error:', error);
    return res.status(500).send(htmlResponse('SYSTEM ERROR', 'Failed to process approval', false));
  }
}

// Spotify Dashboard URL for user management
const SPOTIFY_DASHBOARD_USERS = 'https://developer.spotify.com/dashboard/4b8e17e088014d58868966b640d26734/users';

/**
 * Generate HTML response page (matches recordOS aesthetic)
 * @param {string} title - Page title
 * @param {string} message - Status message
 * @param {boolean} success - Success or error state
 * @param {boolean} isAdmin - Show admin links (Spotify Dashboard)
 */
function htmlResponse(title, message, success, isAdmin = false) {
  const color = success ? '#00ff41' : '#ff4141';

  // Admin-specific content: reminder to add user in Spotify Dashboard
  const adminSection = isAdmin ? `
    <div class="admin-note">
      <span class="prompt">&gt;</span>NEXT STEP: Add user email in Spotify Dashboard
    </div>
    <a href="${SPOTIFY_DASHBOARD_USERS}" target="_blank" class="dashboard-link">
      Open Spotify Dashboard →
    </a>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} // recordOS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0a;
      color: ${color};
      font-family: 'Consolas', 'Courier New', monospace;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 500px;
      text-align: center;
      border: 1px solid #2a2a2a;
      padding: 40px;
      background: #0d0d0d;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      letter-spacing: 4px;
      text-shadow: 0 0 10px ${color}40;
    }
    .status {
      font-size: 14px;
      color: rgba(0, 255, 65, 0.7);
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .admin-note {
      font-size: 12px;
      color: rgba(255, 200, 0, 0.9);
      margin-bottom: 15px;
      padding: 10px;
      border: 1px solid rgba(255, 200, 0, 0.3);
      background: rgba(255, 200, 0, 0.05);
    }
    .dashboard-link {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(180deg, #1a3a1a 0%, #0d2d0d 100%);
      border: 1px solid #00ff41;
      color: #00ff41;
      font-size: 14px;
      letter-spacing: 1px;
      margin-bottom: 20px;
    }
    .dashboard-link:hover {
      background: linear-gradient(180deg, #2a4a2a 0%, #1a3a1a 100%);
      text-shadow: 0 0 6px rgba(0, 255, 65, 0.5);
      text-decoration: none;
    }
    .prompt {
      color: ${color};
      margin-right: 8px;
    }
    .footer {
      font-size: 10px;
      color: rgba(0, 255, 65, 0.4);
      margin-top: 30px;
      letter-spacing: 2px;
    }
    a {
      color: ${color};
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>//${title}</h1>
    <div class="status">
      <span class="prompt">&gt;</span>${message}
    </div>
    ${adminSection}
    <div class="footer">
      // WEYLAND-YUTANI CORP // ADMIN PORTAL //
      <br><br>
      <a href="https://record-os.kevinhg.com">Return to recordOS</a>
    </div>
  </div>
</body>
</html>`;
}
