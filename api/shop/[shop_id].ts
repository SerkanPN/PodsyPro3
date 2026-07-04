import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromToken, checkAnalysisLimit } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabase.js';
import { ETSY_API_KEY, ETSY_SHARED_SECRET, ETSY_BASE_URL, injectTrackingStatusToListings } from '../_lib/etsy.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ detail: "Method not allowed" });

  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ detail: "Could not validate credentials" });

    const limitCheck = await checkAnalysisLimit(user.id);
    if (!limitCheck.allowed) return res.status(403).json({ detail: limitCheck.error });

    const shopId = Array.isArray(req.query.shop_id) ? req.query.shop_id[0] : (req.query.shop_id as string);
    const forceRefresh = req.query.force_refresh === 'true';

    // Cache Control
    const { data: cached } = await supabaseAdmin
      .from('full_json_cache')
      .select('data')
      .eq('target_id', shopId)
      .eq('target_type', 'shop')
      .single();

    if (cached && !forceRefresh) {
      let cachedRes = cached.data;
      
      const { data: history } = await supabaseAdmin
        .from('snapshots')
        .select('capture_time, transaction_sold_count')
        .eq('target_id', shopId)
        .eq('target_type', 'shop')
        .order('capture_time', { ascending: false });
        
      cachedRes.history = history || [];
      cachedRes.listings = await injectTrackingStatusToListings(cachedRes.listings || [], user.id);
      
      const { data: sRow } = await supabaseAdmin
        .from('user_tracked_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .eq('shop_id', shopId)
        .single();
        
      if(cachedRes.shop) cachedRes.shop.is_tracked = sRow ? 1 : 0;
      
      await supabaseAdmin.from('user_history_shops').upsert(
        { user_id: user.id, shop_id: shopId, last_viewed: new Date().toISOString() }
      );
      
      return res.json(cachedRes);
    }

    const authString = `${ETSY_API_KEY}:${ETSY_SHARED_SECRET}`;
    const shopRes = await fetch(`${ETSY_BASE_URL}/shops/${shopId}`, { headers: { "x-api-key": authString } });
    if (!shopRes.ok) return res.json({ ERROR: { http_error: shopRes.status, msg: await shopRes.text() } });

    const shopCore = await shopRes.json();
    const iconUrl = shopCore.icon_url_fullxfull || "";
    
    await supabaseAdmin.from('shops').upsert({
      shop_id: shopId,
      shop_name: shopCore.shop_name,
      icon_url: iconUrl,
      last_scan: new Date().toISOString()
    }, { onConflict: 'shop_id' });

    const listingsRes = await fetch(`${ETSY_BASE_URL}/shops/${shopId}/listings/active?limit=50&includes=Images`, { headers: { "x-api-key": authString } });
    const rawListings = listingsRes.ok ? (await listingsRes.json()).results || [] : [];
    
    const parsedShopListings = [];
    
    for (const item of rawListings) {
      const l_id = String(item.listing_id);
      let img_url = "";
      const img_data = item.images || item.Images || [];
      if (img_data.length > 0) img_url = img_data[0].url_570xN || "";
      
      const p_data = item.price || {};
      const price_val = p_data ? (parseFloat(p_data.amount || 0) / parseFloat(p_data.divisor || 1)) : 0.0;
      
      await supabaseAdmin.from('listings').upsert({
        listing_id: l_id,
        shop_id: shopId,
        title: item.title,
        price: price_val,
        currency_code: p_data.currency_code,
        views: item.views,
        num_favorers: item.num_favorers,
        quantity: item.quantity,
        image_url: img_url
      }, { onConflict: 'listing_id' });
      
      parsedShopListings.push({
        listing_id: l_id, title: item.title, views: item.views, num_favorers: item.num_favorers, quantity: item.quantity,
        price: price_val, currency_code: p_data.currency_code || "USD", img_url, image: img_url, image_url: img_url, is_tracked: 0
      });
    }

    const now = new Date().toISOString();
    await supabaseAdmin.from('snapshots').insert({
      target_id: shopId,
      target_type: 'shop',
      transaction_sold_count: shopCore.transaction_sold_count || 0,
      capture_time: now
    });
    
    const { data: history } = await supabaseAdmin
      .from('snapshots')
      .select('capture_time, transaction_sold_count')
      .eq('target_id', shopId)
      .eq('target_type', 'shop')
      .order('capture_time', { ascending: false });

    const finalResponse: any = { shop: shopCore, listings: parsedShopListings, history: history || [] };
    
    await supabaseAdmin.from('full_json_cache').upsert({
      target_id: shopId,
      target_type: 'shop',
      data: finalResponse,
      last_updated: now
    }, { onConflict: 'target_id, target_type' });
    
    finalResponse.listings = await injectTrackingStatusToListings(finalResponse.listings, user.id);
    
    const { data: sRow2 } = await supabaseAdmin
      .from('user_tracked_shops')
      .select('shop_id')
      .eq('user_id', user.id)
      .eq('shop_id', shopId)
      .single();
      
    finalResponse.shop.is_tracked = sRow2 ? 1 : 0;
    
    await supabaseAdmin.from('user_history_shops').upsert(
      { user_id: user.id, shop_id: shopId, last_viewed: new Date().toISOString() }
    );

    return res.json(finalResponse);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
