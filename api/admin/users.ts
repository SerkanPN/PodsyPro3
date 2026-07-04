import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromToken } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ detail: "Method not allowed" });

  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ detail: "Could not validate credentials" });

    // Sadece admin görebilir
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ detail: "Yetkisiz erişim" });
    }

    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Auth kullanıcıları e-postaları ile eşleştirmek için auth tablosundan mail alabiliriz 
    // ama admin olarak listeleme yeterli olacaktır (email bilgisini auth.users listesi ile birleştirebiliriz)
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    
    const enhancedUsers = users.map(u => {
      const authUser = authData.users.find(a => a.id === u.id);
      return {
        ...u,
        email: authUser ? authUser.email : null
      };
    });

    return res.json(enhancedUsers);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
