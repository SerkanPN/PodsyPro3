import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromToken, checkAnalysisLimit } from '../_lib/auth';
import { supabaseAdmin } from '../_lib/supabase';
import { ETSY_API_KEY, ETSY_SHARED_SECRET, ETSY_BASE_URL, injectTrackingStatusToListings } from '../_lib/etsy';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ detail: "Could not validate credentials" });

    const limitCheck = await checkAnalysisLimit(user.id);
    if (!limitCheck.allowed) return res.status(403).json({ detail: limitCheck.error });

    const keyword = (Array.isArray(req.query.keyword) ? req.query.keyword[0] : (req.query.keyword as string)).trim();
    const offset = parseInt((req.query.offset as string) || '0');
    const forceRefresh = req.query.force_refresh === 'true';
    const cacheKey = `${keyword}_offset_${offset}`;
    
    // Check Cache
    const { data: cached } = await supabaseAdmin
      .from('full_json_cache')
      .select('data')
      .eq('target_id', cacheKey)
      .eq('target_type', 'keyword')
      .single();
      
    if (cached && !forceRefresh) {
      let cachedRes = cached.data;
      cachedRes.listings = await injectTrackingStatusToListings(cachedRes.listings, user.id);
      
      const { data: kRow } = await supabaseAdmin
        .from('user_tracked_keywords')
        .select('keyword')
        .eq('user_id', user.id)
        .eq('keyword', keyword)
        .single();
        
      cachedRes.is_tracked = kRow ? 1 : 0;
      
      await supabaseAdmin.from('user_history_keywords').upsert(
        { user_id: user.id, keyword: keyword, last_viewed: new Date().toISOString() }
      );
      
      return res.json(cachedRes);
    }
    
    const authString = `${ETSY_API_KEY}:${ETSY_SHARED_SECRET}`;
    
    const etsyRes = await fetch(`${ETSY_BASE_URL}/listings/active?keywords=${encodeURIComponent(keyword)}&limit=100&offset=${offset}&includes=Images,Shop&sort_on=score&sort_order=desc`, {
      headers: { "x-api-key": authString }
    });
    
    if (!etsyRes.ok) return res.json({ http_error: etsyRes.status, msg: await etsyRes.text() });
    
    const data = await etsyRes.json();
    const count = data.count || 0;
    const results = data.results || [];
    
    if (offset === 0) {
      await supabaseAdmin.from('keywords').upsert({ 
        keyword, 
        total_results: count, 
        last_scanned: new Date().toISOString()
      }, { onConflict: 'keyword' });
    }
    
    const parsedResults = [];
    const now = new Date().toISOString();
    
    for (const item of results) {
      const l_id = String(item.listing_id);
      let img_url = "";
      const img_data = item.images || item.Images || [];
      if (img_data.length > 0) img_url = img_data[0].url_570xN || img_data[0].url_fullxfull || "";
      
      const shop_data = item.shop || item.Shop || {};
      const s_id = String(shop_data.shop_id || "");
      const shop_name = shop_data.shop_name || "";
      const icon_url = shop_data.icon_url_fullxfull || "";
      
      const p_data = item.price || {};
      const price_val = p_data ? (parseFloat(p_data.amount || 0) / parseFloat(p_data.divisor || 1)) : 0.0;
      
      // Update Shop
      await supabaseAdmin.from('shops').upsert({
        shop_id: s_id,
        shop_name: shop_name,
        icon_url: icon_url,
        last_scan: now
      }, { onConflict: 'shop_id' });
      
      // Update Listing
      await supabaseAdmin.from('listings').upsert({
        listing_id: l_id,
        shop_id: s_id,
        title: item.title,
        url: item.url,
        price: price_val,
        currency_code: p_data.currency_code,
        views: item.views,
        num_favorers: item.num_favorers,
        quantity: item.quantity,
        tags: item.tags || [],
        materials: item.materials || [],
        image_url: img_url,
        last_scan: now
      }, { onConflict: 'listing_id' });
      
      // Create Snapshot
      await supabaseAdmin.from('snapshots').insert({
        target_id: l_id,
        target_type: 'listing',
        views: item.views,
        favorites: item.num_favorers,
        quantity: item.quantity,
        price: price_val,
        capture_time: now
      });
      
      parsedResults.push({
        listing_id: l_id, title: item.title, shop_name: shop_name, price: price_val,
        currency: p_data.currency_code, views: item.views, favorites: item.num_favorers,
        img_url: img_url, image: img_url, image_url: img_url, is_tracked: 0
      });
    }
    
    const finalResponse = { keyword, total_count: count, offset, listings: parsedResults, is_tracked: 0 };
    
    await supabaseAdmin.from('full_json_cache').upsert({
      target_id: cacheKey,
      target_type: 'keyword',
      data: finalResponse,
      last_updated: now
    }, { onConflict: 'target_id, target_type' });
    
    finalResponse.listings = await injectTrackingStatusToListings(finalResponse.listings, user.id);
    
    const { data: kRow2 } = await supabaseAdmin
      .from('user_tracked_keywords')
      .select('keyword')
      .eq('user_id', user.id)
      .eq('keyword', keyword)
      .single();
      
    finalResponse.is_tracked = kRow2 ? 1 : 0;
    
    await supabaseAdmin.from('user_history_keywords').upsert(
      { user_id: user.id, keyword: keyword, last_viewed: new Date().toISOString() }
    );
    
    return res.json(finalResponse);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
