import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase';
import { ETSY_API_KEY, ETSY_SHARED_SECRET, ETSY_BASE_URL } from './_lib/etsy';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  try {
    const authString = `${ETSY_API_KEY}:${ETSY_SHARED_SECRET}`;

    const { data: shops } = await supabaseAdmin.from('shops').select('shop_id');
    
    if (shops && shops.length > 0) {
      for (const shop of shops) {
        try {
          const shopRes = await axios.get(`${ETSY_BASE_URL}/shops/${shop.shop_id}`, {
            headers: { "x-api-key": authString }
          });
          const shopCore = shopRes.data;
          const now = new Date().toISOString();
          
          await supabaseAdmin.from('shops').update({
            shop_name: shopCore.shop_name,
            icon_url: shopCore.icon_url_fullxfull || "",
            last_scan: now
          }).eq('shop_id', shop.shop_id);

          await supabaseAdmin.from('snapshots').insert({
            target_id: String(shop.shop_id),
            target_type: 'shop',
            transaction_sold_count: shopCore.transaction_sold_count || 0,
            capture_time: now
          });
        } catch (err: any) {
          console.error(`Cron Shop API Error: ${err.message}`);
        }
      }
    }

    const { data: listings } = await supabaseAdmin.from('listings').select('listing_id, shop_id');
    
    if (listings && listings.length > 0) {
      for (const listing of listings) {
        try {
          const coreRes = await axios.get(`${ETSY_BASE_URL}/listings/${listing.listing_id}`, {
            headers: { "x-api-key": authString }
          });
          const core = coreRes.data;
          const p_data = core.price || {};
          const price_val = p_data ? (parseFloat(p_data.amount || 0) / parseFloat(p_data.divisor || 1)) : 0.0;
          const original_price_val = p_data.on_sale ? (parseFloat(p_data.original_amount || 0) / parseFloat(p_data.divisor || 1)) : null;
          const now = new Date().toISOString();

          await supabaseAdmin.from('listings').update({
            title: core.title,
            price: price_val,
            views: core.views,
            num_favorers: core.num_favorers,
            quantity: core.quantity,
            last_scan: now
          }).eq('listing_id', listing.listing_id);

          await supabaseAdmin.from('snapshots').insert({
            target_id: String(listing.listing_id),
            target_type: 'listing',
            views: core.views,
            favorites: core.num_favorers,
            quantity: core.quantity,
            price: price_val,
            original_price: original_price_val,
            capture_time: now
          });
        } catch (err: any) {
          console.error(`Cron Listing API Error: ${err.message}`);
        }
      }
    }

    return res.json({ success: true, message: "Cron job executed successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
