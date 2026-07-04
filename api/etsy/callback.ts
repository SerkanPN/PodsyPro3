import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { ETSY_API_KEY, ETSY_BASE_URL } from '../_lib/etsy.js';
import { getUserFromToken } from '../_lib/auth.js';

const REDIRECT_URI = process.env.REDIRECT_URI || "https://podsy.pro/etsy/callback";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ detail: "Method not allowed" });

  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ detail: "Could not validate credentials" });

    const { code, state } = req.body;
    
    const { data: stateRow } = await supabaseAdmin
      .from('oauth_states')
      .select('code_verifier')
      .eq('state', state)
      .single();

    if (!stateRow) return res.status(400).json({ detail: "Invalid state or session expired" });

    const codeVerifier = stateRow.code_verifier;
    await supabaseAdmin.from('oauth_states').delete().eq('state', state);

    const tokenResponse = await fetch("https://api.etsy.com/v3/public/oauth/token", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: ETSY_API_KEY,
        redirect_uri: REDIRECT_URI,
        code,
        code_verifier: codeVerifier
      })
    });

    if (!tokenResponse.ok) return res.status(400).json({ detail: `Failed to get token: ${await tokenResponse.text()}` });

    const tokenData = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    let shopName = null;
    let etsyShopId = null;

    const meResponse = await fetch(`${ETSY_BASE_URL}/users/me`, {
      headers: { "x-api-key": ETSY_API_KEY, "Authorization": `Bearer ${tokenData.access_token}` }
    });

    if (meResponse.ok) {
      const meData = await meResponse.json();
      
      const shopResponse = await fetch(`${ETSY_BASE_URL}/users/${meData.user_id}/shops`, {
        headers: { "x-api-key": ETSY_API_KEY, "Authorization": `Bearer ${tokenData.access_token}` }
      });

      if (shopResponse.ok) {
        const shopData = await shopResponse.json();
        shopName = shopData.shop_name;
        etsyShopId = String(shopData.shop_id);
      }
      
      await supabaseAdmin.from('etsy_connections').insert({
        user_id: user.id,
        etsy_shop_id: etsyShopId,
        shop_name: shopName,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt
      });

      return res.json({ msg: "Connected successfully", shop_name: shopName });
    }

    return res.status(400).json({ detail: "Failed to fetch Etsy user profile" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
