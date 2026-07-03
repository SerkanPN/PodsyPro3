import { supabaseAdmin } from './supabase';

export async function getUserFromToken(req: any) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  return user;
}

export async function checkAnalysisLimit(userId: string) {
  // Kullanıcının profilini al
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role, daily_limit, daily_usage, last_reset_date, subscription_end_date')
    .eq('id', userId)
    .single();

  if (error || !profile) return { allowed: false, error: "Kullanıcı profili bulunamadı" };

  if (profile.role === 'admin') return { allowed: true };

  // Abonelik süresi kontrolü
  if (profile.subscription_end_date) {
    const endDate = new Date(profile.subscription_end_date);
    if (new Date() > endDate) {
      return { allowed: false, error: "Abonelik süreniz dolmuştur." };
    }
  }

  const today = new Date().toISOString().split('T')[0];
  let usage = profile.daily_usage || 0;
  const limit = profile.daily_limit || 50;

  // Gün dönümü kontrolü
  if (profile.last_reset_date !== today) {
    usage = 0;
    await supabaseAdmin
      .from('profiles')
      .update({ daily_usage: 0, last_reset_date: today })
      .eq('id', userId);
  }

  if (usage >= limit) {
    return { allowed: false, error: "Günlük analiz limitinize ulaştınız." };
  }

  // Kullanımı 1 artır
  await supabaseAdmin
    .rpc('increment_daily_usage', { user_id_param: userId }); // Supabase'de bir RPC fonksiyonu gerektirebilir veya doğrudan update yapabiliriz

  // RPC yerine doğrudan update yapalım (Eşzamanlılık - concurrency - sorunu çok mühim değilse)
  await supabaseAdmin
    .from('profiles')
    .update({ daily_usage: usage + 1 })
    .eq('id', userId);

  return { allowed: true };
}
