import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromToken, checkAnalysisLimit } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabase.js';
import { ETSY_API_KEY, ETSY_SHARED_SECRET, ETSY_BASE_URL } from '../_lib/etsy.js';
import axios from 'axios';

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

    const listingId = Array.isArray(req.query.listing_id) ? req.query.listing_id[0] : (req.query.listing_id as string);
    const forceRefresh = req.query.force_refresh === 'true';

    const { data: cached } = await supabaseAdmin
      .from('full_json_cache')
      .select('data')
      .eq('target_id', listingId)
      .eq('target_type', 'listing')
      .single();

    if (cached && !forceRefresh) {
      let cachedRes = cached.data;
      
      const { data: history } = await supabaseAdmin
        .from('snapshots')
        .select('capture_time, views, favorites, quantity, price, last_modified_timestamp')
        .eq('target_id', listingId)
        .eq('target_type', 'listing')
        .order('capture_time', { ascending: false });
        
      cachedRes.history = history || [];
      
      const { data: lRow } = await supabaseAdmin
        .from('user_tracked_listings')
        .select('listing_id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .single();
        
      if (cachedRes.listing) cachedRes.listing.is_tracked = lRow ? 1 : 0;
      return res.json(cachedRes);
    }

    const authString = `${ETSY_API_KEY}:${ETSY_SHARED_SECRET}`;
    
    let core;
    try {
      const coreRes = await axios.get(`${ETSY_BASE_URL}/listings/${listingId}?includes=Images,Shop,Videos,Inventory`, {
        headers: { "x-api-key": authString }
      });
      core = coreRes.data;
    } catch (apiErr: any) {
      return res.json({ ERROR: { http_error: apiErr.response?.status || 500, msg: apiErr.response?.data || apiErr.message } });
    }

    let reviews = {};
    try {
      const reviewsRes = await axios.get(`${ETSY_BASE_URL}/listings/${listingId}/reviews`, {
        headers: { "x-api-key": authString }
      });
      reviews = reviewsRes.data;
    } catch {}

    const p_data = core.price || {};
    const price_val = p_data ? (parseFloat(p_data.amount || 0) / parseFloat(p_data.divisor || 1)) : 0.0;
    const original_price_val = p_data.on_sale ? (parseFloat(p_data.original_amount || 0) / parseFloat(p_data.divisor || 1)) : null;
    const badges_json = JSON.stringify(core.badges || []);
    const now = new Date().toISOString();

    const { data: snapshotData } = await supabaseAdmin.from('snapshots').insert({
      target_id: listingId,
      target_type: 'listing',
      views: core.views,
      favorites: core.num_favorers,
      quantity: core.quantity,
      price: price_val,
      original_price: original_price_val,
      badges_json: badges_json,
      last_modified_timestamp: core.last_modified_timestamp,
      capture_time: now
    }).select('id').single();

    if (snapshotData) {
      const inventory = core.inventory || {};
      if (inventory.products) {
        const varSnaps = [];
        for (const product of inventory.products) {
          const offering = product.offerings ? product.offerings[0] : {};
          const var_price_data = offering.price || {};
          const var_price = var_price_data ? (parseFloat(var_price_data.amount || 0) / parseFloat(var_price_data.divisor || 1)) : 0.0;
          varSnaps.push({
            snapshot_id: snapshotData.id,
            sku: product.sku,
            property_values_json: JSON.stringify(product.property_values || []),
            price: var_price,
            quantity: offering.quantity
          });
        }
        if(varSnaps.length > 0) {
          await supabaseAdmin.from('variation_snapshots').insert(varSnaps);
        }
      }
    }

    const { data: history } = await supabaseAdmin
      .from('snapshots')
      .select('capture_time, views, favorites, quantity, price, last_modified_timestamp')
      .eq('target_id', listingId)
      .eq('target_type', 'listing')
      .order('capture_time', { ascending: false });

    const finalResponse: any = {
      listing: core,
      reviews: reviews.results || [],
      history: history || [],
      price: price_val
    };

    await supabaseAdmin.from('full_json_cache').upsert({
      target_id: listingId,
      target_type: 'listing',
      data: finalResponse,
      last_updated: now
    }, { onConflict: 'target_id, target_type' });

    const { data: lRow2 } = await supabaseAdmin
      .from('user_tracked_listings')
      .select('listing_id')
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
      .single();
      
    finalResponse.listing.is_tracked = lRow2 ? 1 : 0;
    
    await supabaseAdmin.from('user_history_listings').upsert(
      { user_id: user.id, listing_id: listingId, last_viewed: new Date().toISOString() }
    );

    return res.json(finalResponse);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
