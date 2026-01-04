// admin.js (no-modules version)
(function(){
  const { qs, setMsg } = window.Utils;
  const C = window.CONFIG;

  const supabaseReady =
    !!C.SUPABASE_URL && !!C.SUPABASE_ANON_KEY &&
    !C.SUPABASE_URL.includes("PASTE_SUPABASE_URL_HERE") &&
    !C.SUPABASE_ANON_KEY.includes("PASTE_SUPABASE_ANON_KEY_HERE") &&
    window.supabase && typeof window.supabase.createClient === "function";

  const client = supabaseReady ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

  const els = {
    authMsg: qs("#authMsg"),
    dashMsg: qs("#dashMsg"),
    email: qs("#adminEmail"),
    pass: qs("#adminPass"),
    loginBtn: qs("#loginBtn"),
    registerBtn: qs("#registerBtn"),
    logoutBtn: qs("#logoutBtn"),
    exportBtn: qs("#exportBtn"),
    tableBody: qs("#regTableBody"),
    dashWrap: qs("#dashWrap"),
    authWrap: qs("#authWrap"),
    me: qs("#me"),
  };

  function showAuth(){ els.authWrap.style.display="block"; els.dashWrap.style.display="none"; }
  function showDash(){ els.authWrap.style.display="none"; els.dashWrap.style.display="block"; }
  function hideExport(){ els.exportBtn.style.display="none"; els.exportBtn.disabled=true; }
  function showExport(){ els.exportBtn.style.display="inline-block"; els.exportBtn.disabled=false; }

  hideExport();

  async function isApproved(email){
    const { data, error } = await client.from("admins").select("approved").eq("email", email).maybeSingle();
    if(error) throw error;
    return !!(data && data.approved);
  }

  async function loadTable(){
    const { data, error } = await client
      .from("registrations_view")
      .select("*")
      .order("created_at", { ascending: false });
    if(error) throw error;

    els.tableBody.innerHTML = "";
    for(const r of (data||[])){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.created_at ? new Date(r.created_at).toLocaleString() : ""}</td>
        <td>${r.full_name||""}</td>
        <td>${r.email||""}</td>
        <td>${r.phone||""}</td>
        <td>${r.team_name||""}</td>
        <td>${r.track_name||""}</td>
        <td>${r.day||""}</td>
        <td>${r.workshop||""}</td>
        <td>${r.time_slot||""}</td>
      `;
      els.tableBody.appendChild(tr);
    }
    return data||[];
  }

  function exportExcel(rows){
    if(!window.XLSX){
      alert("Excel export library failed to load. Refresh and try again.");
      return;
    }
    const ws = window.XLSX.utils.json_to_sheet(rows);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    window.XLSX.writeFile(wb, "FMP_Workshop_Registrations.xlsx");
  }

  async function refreshAuth(){
    if(!supabaseReady){
      showAuth();
      setMsg(els.authMsg, "error", "Supabase keys not set (config.js).");
      return;
    }

    const { data: { session } } = await client.auth.getSession();
    if(!session){
      showAuth();
      hideExport();
      return;
    }

    const email = session.user.email;
    els.me.textContent = email;

    const approved = await isApproved(email);
    if(!approved){
      showAuth();
      hideExport();
      setMsg(els.authMsg, "error", "Admin not approved yet. Set approved=true in admins table.");
      return;
    }

    showDash();
    showExport();
    setMsg(els.dashMsg, "ok", "");
    const rows = await loadTable();

    els.exportBtn.onclick = () => exportExcel(rows);
  }

  els.registerBtn.addEventListener("click", async ()=>{
    setMsg(els.authMsg, "ok", "");
    const email = (els.email.value||"").trim().toLowerCase();
    const pass = els.pass.value||"";
    if(!email || !pass){ setMsg(els.authMsg,"error","Enter email + password."); return; }
    const { error } = await client.auth.signUp({ email, password: pass });
    if(error){ setMsg(els.authMsg,"error",error.message); return; }
    setMsg(els.authMsg,"ok","Registered. Now login. If you are not approved, set approved=true in admins table.");
  });

  els.loginBtn.addEventListener("click", async ()=>{
    setMsg(els.authMsg, "ok", "");
    const email = (els.email.value||"").trim().toLowerCase();
    const pass = els.pass.value||"";
    if(!email || !pass){ setMsg(els.authMsg,"error","Enter email + password."); return; }
    const { error } = await client.auth.signInWithPassword({ email, password: pass });
    if(error){ setMsg(els.authMsg,"error",error.message); return; }
    await refreshAuth();
  });

  els.logoutBtn.addEventListener("click", async ()=>{
    await client.auth.signOut();
    hideExport();
    showAuth();
  });

  refreshAuth().catch(e=>setMsg(els.authMsg,"error",e.message));
})();
