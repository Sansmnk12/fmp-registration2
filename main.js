// main.js (no-modules version) — time + submit works reliably
(function(){
  const { qs, fillSelect, setMsg, sanitizePhone } = window.Utils;
  const C = window.CONFIG;

  const els = {
    full_name: qs("#full_name"),
    email: qs("#email"),
    phone: qs("#phone"),
    team_name: qs("#team_name"),
    track_name: qs("#track_name"),
    day: qs("#day"),
    workshop: qs("#workshop"),
    time_slot: qs("#time_slot"),
    timeHint: qs("#timeHint"),

    availabilityBox: qs("#availabilityBox"),
    spotsLeft: qs("#spotsLeft"),
    availMsg: qs("#availMsg"),
    availBadge: qs("#availBadge"),

    submittedAs: qs("#submittedAs"),
    submitBtn: qs("#submitBtn"),
    formMsg: qs("#formMsg"),
    regForm: qs("#regForm"),
  };

  function setSubmitEnabled(enabled){
    els.submitBtn.disabled = !enabled;
    els.submitBtn.classList.toggle("disabled", !enabled);
  }

  function showTimeHint(txt){
    if(!els.timeHint) return;
    if(!txt){ els.timeHint.style.display = "none"; els.timeHint.textContent = ""; return; }
    els.timeHint.style.display = "block";
    els.timeHint.textContent = txt;
  }

  // --- Supabase readiness ---
  const keysReady =
    !!C.SUPABASE_URL && !!C.SUPABASE_ANON_KEY &&
    !String(C.SUPABASE_URL).includes("PASTE_SUPABASE_URL_HERE") &&
    !String(C.SUPABASE_ANON_KEY).includes("PASTE_SUPABASE_ANON_KEY_HERE");

  const supaLoaded = window.supabase && typeof window.supabase.createClient === "function";
  const supabaseReady = keysReady && supaLoaded;
  const client = supabaseReady ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

  // --- State ---
  let sessionMap = new Map(); // time_slot -> session row
  let currentLeft = 0;

  // Fill static selects (always)
  fillSelect(els.track_name, C.TRACKS.map(x=>({value:x.value, text:x.label})), "Select track / اختر المسار");
  fillSelect(els.day, C.DAYS.map(x=>({value:x.value, text:x.label})), "Select day / اختر اليوم");
  fillSelect(els.workshop, C.WORKSHOPS.map(x=>({value:x.value, text:x.label})), "Select workshop / اختر الورشة");

  function basicTimes(placeholder){
    fillSelect(els.time_slot, C.TIME_SLOTS.map(t=>({value:t.value, text:t.value, disabled:false})), placeholder || "Select time / اختر الوقت");
    els.time_slot.disabled = false;
  }

  function allRequiredFilled(){
    const full_name = (els.full_name.value || "").trim();
    const email = (els.email.value || "").trim();
    const phone = sanitizePhone(els.phone.value);
    const team = (els.team_name.value || "").trim();
    return !!(
      full_name &&
      email &&
      phone &&
      team &&
      els.track_name.value &&
      els.day.value &&
      els.workshop.value &&
      els.time_slot.value
    );
  }

  function updateAvailabilityUI(){
    const chosen = els.time_slot.value;

    // Hide availability by default
    if(els.availabilityBox) els.availabilityBox.style.display = "none";

    // If no chosen time, cannot submit
    if(!chosen){
      setSubmitEnabled(false);
      return;
    }

    // If supabase not ready, cannot submit
    if(!supabaseReady){
      setSubmitEnabled(false);
      if(!keysReady){
        setMsg(els.formMsg, "error", "Supabase keys not set (config.js). Paste SUPABASE_URL + SUPABASE_ANON_KEY.");
      } else if(!supaLoaded){
        setMsg(els.formMsg, "error", "Supabase library failed to load (CDN blocked). Try another network or refresh.");
      }
      return;
    }

    // If sessions not seeded, cannot submit
    if(!sessionMap.has(chosen)){
      setSubmitEnabled(false);
      setMsg(els.formMsg, "error", "Sessions not configured in Supabase. Run supabase.sql once in SQL Editor.");
      return;
    }

    // Show availability
    if(els.availabilityBox) els.availabilityBox.style.display = "flex";
    if(els.spotsLeft) els.spotsLeft.textContent = `${currentLeft} spots left`;

    if(currentLeft <= 0){
      if(els.availBadge){ els.availBadge.className = "badge bad"; els.availBadge.textContent = "FULL"; }
      if(els.availMsg) els.availMsg.textContent = "This slot is full — choose another time.";
      setSubmitEnabled(false);
      return;
    }

    if(currentLeft <= 5){
      if(els.availBadge){ els.availBadge.className = "badge warn"; els.availBadge.textContent = "LIMITED"; }
      if(els.availMsg) els.availMsg.textContent = "Hurry — only a few spots left.";
    } else {
      if(els.availBadge){ els.availBadge.className = "badge good"; els.availBadge.textContent = "AVAILABLE"; }
      if(els.availMsg) els.availMsg.textContent = "You’re good — you can submit now.";
    }

    // Enable submit only when ALL required fields filled + slots available
    setSubmitEnabled(allRequiredFilled());
  }

  async function getSession(day, workshop, time_slot){
    const { data, error } = await client
      .from("sessions")
      .select("id, day, workshop, time_slot")
      .eq("day", day)
      .eq("workshop", workshop)
      .eq("time_slot", time_slot)
      .maybeSingle();
    if(error) throw error;
    return data;
  }

  async function spotsLeft(session_id){
    const { count, error } = await client
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session_id);
    if(error) throw error;
    return Math.max(0, C.SESSION_CAPACITY - (count || 0));
  }


  // Fetch sessions for a day (workshop + time) and compute availability
  async function getSessionsForDay(day){
    // sessions has: id, workshop_id, day, start_time, end_time, capacity
    // join workshops table to get the workshop name
    const { data, error } = await client
      .from("sessions")
      .select("id, day, start_time, end_time, capacity, workshop:workshops(name)")
      .eq("day", day)
      .order("start_time", { ascending: true });
    if(error) throw error;
    return data || [];
  }

  async function spotsLeftForSession(session){
    const cap = Number(session.capacity ?? 20);
    const { count, error } = await client
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session.id);
    if(error) throw error;
    const left = cap - (count || 0);
    return left < 0 ? 0 : left;
  }

  async function refreshTimes(){
    // In this version, "Workshop" dropdown shows workshop + time for the selected day.
    const day = els.day.value;
    if(!day){
      fillSelect(els.workshop, [], "Select workshop / اختر الورشة");
      els.time_slot.value = "";
      currentSessionId = null;
      updateSubmitState();
      return;
    }

    try{
      setMsg(els.formMsg, "ok", "");
      lockWorkshop(true);
      const sessions = await getSessionsForDay(day);

      const opts = [];
      sessionMap.clear();

      for(const s of sessions){
        const left = await spotsLeftForSession(s);
        sessionMap.set(String(s.id), { session: s, left });
        const label = left <= 0
          ? `${(s.workshop && s.workshop.name) ? s.workshop.name : 'Workshop'} — ${s.start_time} – ${s.end_time} (FULL)`
          : `${(s.workshop && s.workshop.name) ? s.workshop.name : 'Workshop'} — ${s.start_time} – ${s.end_time} (${left} left)`;
        opts.push({ value: String(s.id), text: label, disabled: left <= 0 });
      }

      fillSelect(els.workshop, opts, "Select workshop / اختر الورشة");
      els.workshop.value = "";
      els.time_slot.value = "";
      currentSessionId = null;
      setMsg(els.availMsg, "ok", "");
      updateSubmitState();
    }catch(e){
      setMsg(els.formMsg, "error", e.message || "Failed to load sessions.");
      fillSelect(els.workshop, [], "Select workshop / اختر الورشة");
      els.time_slot.value = "";
      currentSessionId = null;
      updateSubmitState();
    }finally{
      lockWorkshop(false);
    }
  }

  async function onTimeChange(){
    setMsg(els.formMsg, "ok", "");
    const chosen = els.time_slot.value;

    if(!supabaseReady || !chosen || !sessionMap.has(chosen)){
      currentLeft = 0;
      updateAvailabilityUI();
      return;
    }

    currentLeft = await spotsLeft(sessionMap.get(chosen).id);
    if(els.submittedAs){
      els.submittedAs.textContent = `Submitted as: workshop_session (${els.workshop.value} — ${els.day.value} — ${chosen})`;
    }
    updateAvailabilityUI();
  }

  // Re-validate submit on every input change
  const revalidate = () => updateAvailabilityUI();
  ["input","change","keyup"].forEach(evt=>{
    els.full_name.addEventListener(evt, revalidate);
    els.email.addEventListener(evt, revalidate);
    els.phone.addEventListener(evt, revalidate);
    els.team_name.addEventListener(evt, revalidate);
    els.track_name.addEventListener(evt, revalidate);
  });

  els.day.addEventListener("change", () => refreshTimes().catch(e=>setMsg(els.formMsg,"error",e.message)));
  els.workshop.addEventListener("change", () => refreshTimes().catch(e=>setMsg(els.formMsg,"error",e.message)));
  els.time_slot.addEventListener("change", () => onTimeChange().catch(e=>setMsg(els.formMsg,"error",e.message)));

  els.regForm.addEventListener("submit", async (ev)=>{
    ev.preventDefault();
    setMsg(els.formMsg, "ok", "");

    if(!allRequiredFilled()){
      setMsg(els.formMsg, "error", "Please complete all required fields.");
      setSubmitEnabled(false);
      return;
    }

    if(!supabaseReady){
      setMsg(els.formMsg, "error", "Supabase not ready. Check keys + CDN.");
      setSubmitEnabled(false);
      return;
    }

    const chosen = els.time_slot.value;
    if(!sessionMap.has(chosen)){
      setMsg(els.formMsg, "error", "Sessions not configured in Supabase. Run supabase.sql once.");
      setSubmitEnabled(false);
      return;
    }

    const s = sessionMap.get(chosen);

    // final re-check
    const left = await spotsLeft(s.id);
    if(left <= 0){
      setMsg(els.formMsg, "error", "This slot is full. Choose another time.");
      await onTimeChange();
      return;
    }

    els.submitBtn.disabled = true;
    els.submitBtn.textContent = "Submitting...";

    const payload = {
      full_name: (els.full_name.value || "").trim(),
      email: (els.email.value || "").trim().toLowerCase(),
      phone: sanitizePhone(els.phone.value),
      team_name: (els.team_name.value || "").trim(),
      track_name: els.track_name.value,
    };

    const { error } = await client.rpc("register_for_session", {
      p_session_id: s.id,
      p_full_name: payload.full_name,
      p_email: payload.email,
      p_phone: payload.phone,
      p_team_name: payload.team_name,
      p_track_name: payload.track_name
    });

    if(error){
      els.submitBtn.disabled = false;
      els.submitBtn.textContent = "Submit Registration";
      setMsg(els.formMsg, "error", error.message || "Registration failed.");
      return;
    }

    const sessionLabel = `${els.workshop.value} — ${els.day.value} — ${chosen}`;
    const url = new URL("./thankyou.html", location.href);
    url.searchParams.set("session", sessionLabel);
    url.searchParams.set("name", payload.full_name);
    url.searchParams.set("email", payload.email);
    location.href = url.toString();
  });

  // initial state
  basicTimes("Pick a day + workshop first");
  showTimeHint("Pick a day + workshop first.");
  setSubmitEnabled(false);
})();


function lockWorkshop(isLocked){
  if(!window.els || !els.workshop) return;
  els.workshop.disabled = !!isLocked;
}
