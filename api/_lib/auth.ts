import { supabaseAdmin } from './supabase';

export async function getUserFromToken(req: any) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function checkAnalysisLimit(userId: string) {
  let { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role, daily_limit, daily_usage, last_reset_date, subscription_end_date')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert([{ id: userId, role: 'user', daily_limit: 50, daily_usage: 0 }])
      .select('role, daily_limit, daily_usage, last_reset_date, subscription_end_date')
      .single();

    if (insertError) {
      return { allowed: false, error: "Could not create profile: " + insertError.message };
    }
    profile = newProfile;
  }

  if (profile.role === 'admin') return { allowed: true };

  if (profile.subscription_end_date) {
    const endDate = new Date(profile.subscription_end_date);
    if (new Date() > endDate) {
      return { allowed: false, error: "Subscription expired." };
    }
  }

  const today = new Date().toISOString().split('T')[0];
  let usage = profile.daily_usage || 0;
  const limit = profile.daily_limit || 50;

  if (profile.last_reset_date !== today) {
    usage = 0;
    await supabaseAdmin
      .from('profiles')
      .update({ daily_usage: 0, last_reset_date: today })
      .eq('id', userId);
  }

  if (usage >= limit) {
    return { allowed: false, error: "Daily analysis limit reached." };
  }

  await supabaseAdmin
    .from('profiles')
    .update({ daily_usage: usage + 1 })
    .eq('id', userId);

  return { allowed: true };
}
