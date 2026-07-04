import { supabaseAdmin } from './supabase.js';

export const ETSY_API_KEY = process.env.ETSY_API_KEY || "34axrr0o1tzjvfcdn2mexpp4";
export const ETSY_SHARED_SECRET = process.env.ETSY_SHARED_SECRET || "f5njckm23y";
export const ETSY_BASE_URL = "https://openapi.etsy.com/v3/application";

export async function injectTrackingStatusToListings(listings: any[], userId: string | null) {
  if (!listings || listings.length === 0) return listings;
  
  if (!userId) {
    listings.forEach(l => l.is_tracked = 0);
    return listings;
  }
  
  const listingIds = listings.map(l => String(l.listing_id)).filter(id => id);
  if (listingIds.length === 0) return listings;
  
  const { data } = await supabaseAdmin
    .from('user_tracked_listings')
    .select('listing_id')
    .eq('user_id', userId)
    .in('listing_id', listingIds);
    
  const trackedSet = new Set((data || []).map(r => String(r.listing_id)));
  
  listings.forEach(l => {
    l.is_tracked = trackedSet.has(String(l.listing_id)) ? 1 : 0;
  });
  
  return listings;
}
