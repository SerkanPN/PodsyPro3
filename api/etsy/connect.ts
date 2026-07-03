import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { supabaseAdmin } from '../_lib/supabase';
import { ETSY_API_KEY } from '../_lib/etsy';

const REDIRECT_URI = process.env.REDIRECT_URI || "https://podsy.pro/etsy/callback";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ detail: "Method not allowed" });

  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('base64url');

  await supabaseAdmin.from('oauth_states').insert({
    state: state,
    code_verifier: codeVerifier,
    created_at: new Date().toISOString()
  });

  const scopes = "listings_w listings_r listings_d shops_r shops_w transactions_r transactions_w profile_r email_r";
  const encodedScopes = encodeURIComponent(scopes);
  
  // Note: For local testing, REDIRECT_URI should be http://localhost:5173/etsy/callback
  // We will assume process.env.REDIRECT_URI handles this based on environment
  const authUrl = `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodedScopes}&client_id=${ETSY_API_KEY}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  return res.json({ auth_url: authUrl });
}
