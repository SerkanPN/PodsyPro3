import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromToken } from '../../_lib/auth';
import { supabaseAdmin } from '../../_lib/supabase';
import { ETSY_API_KEY, ETSY_SHARED_SECRET, ETSY_BASE_URL } from '../../_lib/etsy';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ detail: "Method not allowed" });

  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ detail: "Could not validate credentials" });

    const target_type = Array.isArray(req.query.type) ? req.query.type[0] : (req.query.type as string);
    const target_id = Array.isArray(req.query.id) ? req.query.id[0] : (req.query.id as string);

    let table = "", id_col = "";
    if (target_type === "listing") { table = "user_tracked_listings"; id_col = "listing_id"; }
    else if (target_type === "shop") { table = "user_tracked_shops"; id_col = "shop_id"; }
    else if (target_type === "keyword") { table = "user_tracked_keywords"; id_col = "keyword"; }
    else return res.json({ status: "error", message: "Invalid target type" });

    const { data: row } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('user_id', user.id)
      .eq(id_col, target_id)
      .maybeSingle();

    if (!row) {
      await supabaseAdmin.from(table).insert({ user_id: user.id, [id_col]: target_id });
      
      if (target_type === "shop") {
        const authString = `${ETSY_API_KEY}:${ETSY_SHARED_SECRET}`;
        try {
          const resApi = await axios.get(`${ETSY_BASE_URL}/shops/${target_id}`, { headers: { "x-api-key": authString } });
          const data = resApi.data;
          await supabaseAdmin.from('shops').upsert({
            shop_id: target_id,
            shop_name: data.shop_name || "",
            icon_url: data.icon_url_fullxfull || ""
          }, { onConflict: 'shop_id' });
        } catch {}
      } else if (target_type === "keyword") {
        await supabaseAdmin.from('keywords').upsert({ keyword: target_id }, { onConflict: 'keyword' });
      } else if (target_type === "listing") {
        const authString = `${ETSY_API_KEY}:${ETSY_SHARED_SECRET}`;
        try {
          const resApi = await axios.get(`${ETSY_BASE_URL}/listings/${target_id}?includes=Images`, { headers: { "x-api-key": authString } });
          const data = resApi.data;
          const img = (data.images && data.images[0]) ? data.images[0].url_570xN : "";
          await supabaseAdmin.from('listings').upsert({
            listing_id: target_id,
            image_url: img
          }, { onConflict: 'listing_id' });
        } catch {}
      }
      return res.json({ success: true, is_tracked: 1 });
    } else {
      await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', user.id)
        .eq(id_col, target_id);
      return res.json({ success: true, is_tracked: 0 });
    }
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
