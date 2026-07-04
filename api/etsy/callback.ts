import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { ETSY_API_KEY, ETSY_BASE_URL } from '../_lib/etsy.js';
import { getUserFromToken } from '../_lib/auth.js';
import axios from 'axios';

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

    const tokenResponse = await axios.post("https://api.etsy.com/v3/public/oauth/token", {
      grant_type: "authorization_code",
      client_id: ETSY_API_KEY,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: codeVerifier
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const tokenData = tokenResponse.data;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    let shopName = null;
    let etsyShopId = null;

    const meResponse = await axios.get(`${ETSY_BASE_URL}/users/me`, {
      headers: { "x-api-key": ETSY_API_KEY, "Authorization": `Bearer ${tokenData.access_token}` }
    });

    if (meResponse.status === 200) {
      const meData = meResponse.data;
      
      const shopResponse = await axios.get(`${ETSY_BASE_URL}/users/${meData.user_id}/shops`, {
        headers: { "x-api-key": ETSY_API_KEY, "Authorization": `Bearer ${tokenData.access_token}` }
      });

      if (shopResponse.status === 200) {
        const shopData = shopResponse.data;
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
    return res.status(500).json({ error: error.response?.data || error.message || 'Internal server error' });
  }
}
