const { createClient } = supabase;
const client = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const els = {
  full_name: document.getElementById('full_name'),
  email: document.getElementById('email'),
  phone: document.getElementById('phone'),
  team_name: document.getElementById('team_name'),
  track_name: document.getElementById('track_name'),
  day: document.getElementById('day'),
  session: document.getElementById('session'),
  spots: document.getElementById('spots'),
  submitBtn: document.getElementById('submitBtn'),
  msg: document.getElementById('msg'),
  form: document.getElementById('regForm'),
};

function setMsg(type, text){
  els.msg.className = 'msg ' + (type === 'ok' ? 'ok' : 'err');
  els.msg.textContent = text || '';
}

function setSpots(text, isFull=false){
  els.spots.textContent = text || '';
  els.spots.style.color = isFull ? '#dc2626' : '#6b7280';
}

async function getSessionStats(day){
  const { data, error } = await client.rpc('get_session_stats', { p_day: day });
  if(error) throw error;
  return data || [];
}

async function loadSessionsForDay(day){
  const { data: sessions, error } = await client
    .from('sessions')
    .select('id, workshop_name, start_time, end_time, capacity')
    .eq('day', day)
    .order('start_time', { ascending: true });

  if(error) throw error;

  const stats = await getSessionStats(day);
  const usedById = {};
  for(const s of stats){
    usedById[s.session_id] = s.used_count;
  }

  return (sessions || []).map(s => {
    const used = usedById[s.id] || 0;
    const left = Math.max(0, (s.capacity ?? 20) - used);
    return { ...s, used, left, full: left <= 0 };
  });
}

function fillSessionSelect(items){
  els.session.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Select session / اختر الجلسة';
  els.session.appendChild(opt0);

  for(const s of items){
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.workshop_name} — ${s.start_time} – ${s.end_time} (${s.full ? 'FULL' : s.left + ' left'})`;
    if(s.full) opt.disabled = true;
    els.session.appendChild(opt);
  }
}

function canSubmit(){
  return !!(
    els.full_name.value.trim() &&
    els.email.value.trim() &&
    els.phone.value.trim() &&
    els.team_name.value.trim() &&
    els.track_name.value &&
    els.day.value &&
    els.session.value
  );
}

function updateSubmit(){
  els.submitBtn.disabled = !canSubmit();
}

els.day.addEventListener('change', async () => {
  setMsg('ok','');
  setSpots('');
  els.session.disabled = true;
  els.session.innerHTML = '<option value="">Loading…</option>';
  updateSubmit();

  const day = els.day.value;
  if(!day){
    els.session.innerHTML = '<option value="">Select day first / اختر اليوم أولاً</option>';
    return;
  }

  try{
    const sessions = await loadSessionsForDay(day);
    fillSessionSelect(sessions);
    els.session.disabled = false;
  }catch(e){
    els.session.innerHTML = '<option value="">Could not load sessions</option>';
    setMsg('err', e.message || 'Could not load sessions');
  }
});

els.session.addEventListener('change', async () => {
  setMsg('ok','');
  const day = els.day.value;
  const sid = els.session.value;
  if(!day || !sid){ setSpots(''); updateSubmit(); return; }

  try{
    const sessions = await loadSessionsForDay(day);
    const s = sessions.find(x => x.id === sid);
    if(!s){ setSpots(''); updateSubmit(); return; }
    if(s.full){
      setSpots('This session is FULL.', true);
    }else{
      setSpots(`${s.left} spots left`, false);
    }
  }catch(e){}
  updateSubmit();
});

['input','change'].forEach(evt => {
  els.full_name.addEventListener(evt, updateSubmit);
  els.email.addEventListener(evt, updateSubmit);
  els.phone.addEventListener(evt, updateSubmit);
  els.team_name.addEventListener(evt, updateSubmit);
  els.track_name.addEventListener(evt, updateSubmit);
  els.session.addEventListener(evt, updateSubmit);
});

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('ok','');
  if(!canSubmit()) return;

  els.submitBtn.disabled = true;

  const payload = {
    full_name: els.full_name.value.trim(),
    email: els.email.value.trim(),
    phone: els.phone.value.trim(),
    team_name: els.team_name.value.trim(),
    track_name: els.track_name.value,
    session_id: els.session.value
  };

  const { error } = await client.from('registrations').insert([payload]);
  if(error){
    setMsg('err', error.message);
    els.submitBtn.disabled = false;
    return;
  }

  window.location.href = 'thanks.html';
});
