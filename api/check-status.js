/**
 * ============================================================================
 * CHECK STATUS API
 * ============================================================================
 *
 * GET /api/check-status?email=xxx
 *
 * Returns the access request status for an email address.
 * Called by frontend polling to detect when access is approved.
 *
 * Environment variables required:
 * - NEON_DATABASE_URL: PostgreSQL connection string
 */

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const sql = neon(process.env.NEON_DATABASE_URL);

    const result = await sql`
      SELECT status, created_at, approved_at
      FROM access_requests
      WHERE email = ${normalizedEmail}
    `;

    if (result.length === 0) {
      return res.status(200).json({
        status: 'not_found',
        message: 'No access request found for this email'
      });
    }

    const record = result[0];

    return res.status(200).json({
      status: record.status,
      created_at: record.created_at,
      approved_at: record.approved_at
    });

  } catch (error) {
    console.error('Check status error:', error);
    return res.status(500).json({
      error: 'Failed to check status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
