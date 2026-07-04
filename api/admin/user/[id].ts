import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromToken } from '../../_lib/auth.js';
import { supabaseAdmin } from '../../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  try {
    const adminUser = await getUserFromToken(req);
    if (!adminUser) return res.status(401).json({ detail: "Could not validate credentials" });

    // Sadece admin
    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', adminUser.id).single();
    if (!adminProfile || adminProfile.role !== 'admin') {
      return res.status(403).json({ detail: "Yetkisiz erişim" });
    }

    const targetUserId = Array.isArray(req.query.id) ? req.query.id[0] : (req.query.id as string);
    const { role, daily_limit, subscription_end_date } = req.body;

    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (daily_limit !== undefined) updates.daily_limit = daily_limit;
    if (subscription_end_date !== undefined) updates.subscription_end_date = subscription_end_date;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', targetUserId);
        
      if (error) throw error;
    }

    return res.json({ success: true, message: "Kullanıcı güncellendi" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
