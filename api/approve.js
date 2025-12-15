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

    if (existing[0].status === 'approved') {
      return res.status(200).send(htmlResponse('ALREADY APPROVED', `${normalizedEmail} was already approved`, true));
    }

    // Update to approved
    await sql`
      UPDATE access_requests
      SET status = 'approved', approved_at = NOW()
      WHERE email = ${normalizedEmail}
    `;

    return res.status(200).send(htmlResponse('ACCESS GRANTED', `${normalizedEmail} has been approved`, true));

  } catch (error) {
    console.error('Approve error:', error);
    return res.status(500).send(htmlResponse('SYSTEM ERROR', 'Failed to process approval', false));
  }
}

/**
 * Generate HTML response page (matches recordOS aesthetic)
 */
function htmlResponse(title, message, success) {
  const color = success ? '#00ff41' : '#ff4141';

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
      margin-bottom: 30px;
      line-height: 1.6;
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
    <div class="footer">
      // WEYLAND-YUTANI CORP //
      <br><br>
      <a href="https://record-os.kevinhg.com">Return to recordOS</a>
    </div>
  </div>
</body>
</html>`;
}
