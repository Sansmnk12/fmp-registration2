// utils.js (no-modules version)
window.Utils = {
  qs(sel){ return document.querySelector(sel); },

  fillSelect(selectEl, options, placeholder){
    selectEl.innerHTML = "";
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholder || "Select…";
    ph.disabled = true;
    ph.selected = true;
    selectEl.appendChild(ph);

    for(const opt of options){
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.text || opt.label || opt.value;
      if(opt.disabled) o.disabled = true;
      selectEl.appendChild(o);
    }
  },

  setMsg(el, type, msg){
    if(!el) return;
    el.textContent = msg || "";
    el.className = "msg " + (type || "ok");
    el.style.display = msg ? "block" : "none";
  },

  sanitizePhone(v){
    const s = (v || "").trim();
    return s.replace(/(?!^)\+/g, "").replace(/[^\d+]/g, "");
  }
};
