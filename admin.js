const { createClient } = supabase;
const client = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

function showTab(name){
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  panels.forEach(p => p.classList.toggle('show', p.id === name));
}
tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

const els = {
  login_email: document.getElementById('login_email'),
  login_password: document.getElementById('login_password'),
  loginBtn: document.getElementById('loginBtn'),
  loginMsg: document.getElementById('loginMsg'),

  signup_email: document.getElementById('signup_email'),
  signup_password: document.getElementById('signup_password'),
  signupBtn: document.getElementById('signupBtn'),
  signupMsg: document.getElementById('signupMsg'),

  refreshBtn: document.getElementById('refreshBtn'),
  exportBtn: document.getElementById('exportBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  dashMsg: document.getElementById('dashMsg'),
  tbody: document.querySelector('#table tbody')
};

function setMsg(el, type, text){
  el.className = 'msg ' + (type === 'ok' ? 'ok' : 'err');
  el.textContent = text || '';
}

async function isApproved(){
  const { data: { user } } = await client.auth.getUser();
  if(!user) return false;

  const { data, error } = await client
    .from('admins')
    .select('approved')
    .eq('email', user.email)
    .maybeSingle();

  if(error) return false;
  return !!(data && data.approved);
}

async function loadTable(){
  els.tbody.innerHTML = '';
  setMsg(els.dashMsg, 'ok', 'Loading…');

  const ok = await isApproved();
  if(!ok){
    setMsg(els.dashMsg, 'err', 'Not approved yet. Ask the owner to approve your email in the admins table.');
    return;
  }

  const { data, error } = await client
    .from('registrations')
    .select('full_name,email,phone,team_name,track_name,created_at, session:sessions(day,workshop_name,start_time,end_time)')
    .order('created_at', { ascending: false });

  if(error){
    setMsg(els.dashMsg, 'err', error.message);
    return;
  }

  for(const r of (data || [])){
    const tr = document.createElement('tr');
    const s = r.session || {};
    tr.innerHTML = `
      <td>${s.day || ''}</td>
      <td>${s.workshop_name || ''}</td>
      <td>${(s.start_time||'') + ' – ' + (s.end_time||'')}</td>
      <td>${r.track_name || ''}</td>
      <td>${r.full_name || ''}</td>
      <td>${r.email || ''}</td>
      <td>${r.phone || ''}</td>
      <td>${r.team_name || ''}</td>
      <td>${new Date(r.created_at).toLocaleString()}</td>
    `;
    els.tbody.appendChild(tr);
  }

  setMsg(els.dashMsg, 'ok', `Loaded ${data.length} registrations.`);
}

function exportCSV(){
  const rows = [['Day','Workshop','Time','Track','Name','Email','Phone','Team','Created']];
  document.querySelectorAll('#table tbody tr').forEach(tr => {
    const cols = [...tr.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g,' ').trim());
    rows.push(cols);
  });
  const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'registrations.csv';
  a.click();
  URL.revokeObjectURL(url);
}

els.loginBtn.addEventListener('click', async () => {
  setMsg(els.loginMsg,'ok','');
  const email = els.login_email.value.trim();
  const password = els.login_password.value;
  const { error } = await client.auth.signInWithPassword({ email, password });
  if(error){ setMsg(els.loginMsg,'err', error.message); return; }
  showTab('dash');
  await loadTable();
});

els.signupBtn.addEventListener('click', async () => {
  setMsg(els.signupMsg,'ok','');
  const email = els.signup_email.value.trim();
  const password = els.signup_password.value;
  const { error } = await client.auth.signUp({ email, password });
  if(error){ setMsg(els.signupMsg,'err', error.message); return; }

  const { error: e2 } = await client.from('admins').insert([{ email, approved:false }]);
  if(e2){ setMsg(els.signupMsg,'err', e2.message); return; }
  setMsg(els.signupMsg,'ok','Registered. Now ask the owner to approve you in the admins table.');
});

els.refreshBtn.addEventListener('click', loadTable);
els.exportBtn.addEventListener('click', exportCSV);
els.logoutBtn.addEventListener('click', async () => {
  await client.auth.signOut();
  showTab('login');
});

showTab('login');
