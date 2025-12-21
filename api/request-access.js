/**
 * ============================================================================
 * ACCESS REQUEST API
 * ============================================================================
 *
 * POST /api/request-access
 * Body: { email: string }
 *
 * Accepts access requests from new users:
 * 1. Validates email format
 * 2. Upserts to Neon database
 * 3. Sends Slack notification with approve link
 * 4. Returns status
 *
 * Environment variables required:
 * - NEON_DATABASE_URL: PostgreSQL connection string
 * - SLACK_WEBHOOK_URL: Slack incoming webhook
 * - APPROVE_SECRET: Secret token for approve link
 */

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  // Validate email
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Connect to Neon
    const sql = neon(process.env.NEON_DATABASE_URL);

    // Check if email already exists
    const existing = await sql`
      SELECT status FROM access_requests WHERE email = ${normalizedEmail}
    `;

    if (existing.length > 0) {
      // Already exists - return current status
      return res.status(200).json({
        success: true,
        status: existing[0].status,
        message: existing[0].status === 'approved'
          ? 'Already approved'
          : 'Request already submitted'
      });
    }

    // Insert new request
    await sql`
      INSERT INTO access_requests (email, status, created_at)
      VALUES (${normalizedEmail}, 'pending', NOW())
    `;

    // Send Slack notification
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    const approveSecret = process.env.APPROVE_SECRET;

    if (slackWebhook && approveSecret) {
      const approveUrl = `${getBaseUrl(req)}/api/approve?email=${encodeURIComponent(normalizedEmail)}&token=${approveSecret}`;

      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🎵 recordOS Access Request',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `\`${normalizedEmail}\``
              }
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}`
                }
              ]
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Approve + Open Spotify',
                    emoji: true
                  },
                  style: 'primary',
                  url: approveUrl
                }
              ]
            }
          ]
        })
      });
    }

    return res.status(200).json({
      success: true,
      status: 'pending',
      message: 'Request submitted'
    });

  } catch (error) {
    console.error('Access request error:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Get base URL from request for building approve link
 */
function getBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}
