// admin.js (self-contained, no utils dependency)
(function(){
  const $ = (id) => document.getElementById(id);

  const els = {
    bootMsg: $("bootMsg"),
    authBox: $("authBox"),
    dataBox: $("dataBox"),
    authMsg: $("authMsg"),
    dashMsg: $("dashMsg"),
    email: $("adminEmail"),
    pass: $("adminPassword"),
    signupBtn: $("signupBtn"),
    loginBtn: $("loginBtn"),
    logoutBtn: $("logoutBtn"),
    exportBtn: $("exportBtn"),
    me: $("me"),
    regTableBody: $("regTableBody"),
  };

  function show(el){ if(el) el.style.display = "block"; }
  function hide(el){ if(el) el.style.display = "none"; }
  function showInline(el){ if(el) el.style.display = "inline-block"; }
  function setMsg(el, type, text){
    if(!el) return;
    el.textContent = text || "";
    el.className = "msg " + (type || "ok");
    el.style.display = text ? "block" : "none";
  }
  function fatal(text){ setMsg(els.bootMsg, "error", text); show(els.bootMsg); }

  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(async () => {
    try{
      const C = window.CONFIG;
      if(!C) return fatal("config.js not loaded. Make sure config.js exists in repo root.");

      const supabaseOK = window.supabase && typeof window.supabase.createClient === "function";
      if(!supabaseOK) return fatal("Supabase library failed to load (cdn). Try hard refresh or different network.");

      const keysOK =
        !!C.SUPABASE_URL && !!C.SUPABASE_ANON_KEY &&
        !String(C.SUPABASE_URL).includes("PASTE_SUPABASE_URL_HERE") &&
        !String(C.SUPABASE_ANON_KEY).includes("PASTE_SUPABASE_ANON_KEY_HERE");
      if(!keysOK) return fatal("Supabase keys not set. Paste SUPABASE_URL + SUPABASE_ANON_KEY in config.js and re-upload.");

      const client = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);

      async function isApproved(email){
        const { data, error } = await client.from("admins").select("approved").eq("email", email).maybeSingle();
        if(error) throw error;
        return !!(data && data.approved);
      }

      async function loadRows(){
        const { data, error } = await client
          .from("registrations_view")
          .select("*")
          .order("created_at", { ascending: false });
        if(error) throw error;
        return data || [];
      }

      function render(rows){
        els.regTableBody.innerHTML = "";
        for(const r of rows){
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
          els.regTableBody.appendChild(tr);
        }
      }

      function exportExcel(rows){
        if(!window.XLSX){ alert("Excel library not loaded. Refresh and try again."); return; }
        const ws = window.XLSX.utils.json_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Registrations");
        window.XLSX.writeFile(wb, "FMP_Workshop_Registrations.xlsx");
      }

      function showAuth(){ show(els.authBox); hide(els.dataBox); hide(els.exportBtn); }
      function showDash(email){ hide(els.authBox); show(els.dataBox); els.me.textContent = email; }

      async function refresh(){
        setMsg(els.authMsg, "ok", "");
        setMsg(els.dashMsg, "ok", "");

        const { data: { session } } = await client.auth.getSession();
        if(!session){ showAuth(); return; }

        const email = session.user.email;
        const approved = await isApproved(email);
        if(!approved){
          await client.auth.signOut();
          showAuth();
          setMsg(els.authMsg, "error", "Not approved yet. In Supabase → table admins → set approved=true for your email.");
          return;
        }

        showDash(email);
        const rows = await loadRows();
        render(rows);
        showInline(els.exportBtn);
        els.exportBtn.onclick = () => exportExcel(rows);
      }

      els.signupBtn.addEventListener("click", async ()=>{
        try{
          setMsg(els.authMsg, "ok", "");
          const email = (els.email.value||"").trim().toLowerCase();
          const password = els.pass.value || "";
          if(!email || !password){ setMsg(els.authMsg, "error", "Enter email + password."); return; }
          const { error } = await client.auth.signUp({ email, password });
          if(error) throw error;
          setMsg(els.authMsg, "ok", "Registered. Now click Login. (May need approval in admins table.)");
        }catch(e){
          setMsg(els.authMsg, "error", e.message || "Register failed.");
        }
      });

      els.loginBtn.addEventListener("click", async ()=>{
        try{
          setMsg(els.authMsg, "ok", "");
          const email = (els.email.value||"").trim().toLowerCase();
          const password = els.pass.value || "";
          if(!email || !password){ setMsg(els.authMsg, "error", "Enter email + password."); return; }
          const { error } = await client.auth.signInWithPassword({ email, password });
          if(error) throw error;
          await refresh();
        }catch(e){
          setMsg(els.authMsg, "error", e.message || "Login failed.");
        }
      });

      els.logoutBtn.addEventListener("click", async ()=>{
        await client.auth.signOut();
        await refresh();
      });

      await refresh();

    }catch(e){
      fatal(e.message || "Admin failed to start.");
    }
  });
})();
