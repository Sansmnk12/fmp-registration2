<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Admin — Registrations</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <div class="wrap">
    <div class="shell">
      <div class="hero">
        <div class="kicker">FMP — FUTURE MINERALS PIONEERS</div>
        <h1>Admin Panel</h1>
        <p class="sub">Login → view registrations → export Excel. (Only approved admins can see this.)</p>
      </div>

      <div class="card">
        <div class="logo">
          <img src="./assets/logo.png" alt="Logo" />
        </div>

        <div class="card-inner">
          <div class="toolbar">
            <div class="chip" id="adminStatus">Not signed in</div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn secondary" id="refreshBtn" type="button">Refresh</button>
              <button class="btn secondary" id="exportBtn" style="display:none;">Export Excel</button>
              <button class="btn secondary" id="logoutBtn" type="button" style="display:none;">Logout</button>
            </div>
          </div>

          <div class="sep"></div>

          <div id="authBox">
            <div class="grid two">
              <div class="field">
                <label>Email <span class="ar">البريد</span></label>
                <input class="input" id="adminEmail" type="email" placeholder="admin@email.com" />
              </div>
              <div class="field">
                <label>Password <span class="ar">كلمة المرور</span></label>
                <input class="input" id="adminPassword" type="password" placeholder="••••••••" />
              </div>
            </div>
            <div style="height:10px"></div>
            <div class="grid two">
              <button class="btn" id="loginBtn" type="button">Login</button>
              <button class="btn secondary" id="signupBtn" type="button">Admin Register</button>
            </div>
            <div class="hint">Register creates an account. An existing approved admin must set approved=true in the admins table.</div>
            <div id="authMsg" style="display:none;"></div>
          </div>

          <div id="dataBox" style="display:none;">
            <div class="hint" id="countHint">—</div>
            <div style="height:10px"></div>

            <div style="overflow:auto;">
              <table class="table" id="regTable">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Team</th>
                    <th>Track</th>
                    <th>Workshop</th>
                    <th>Day</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>

            <div class="sep"></div>

            <div class="hint">
              Tip: Approve admins in Supabase → Table Editor → <b>admins</b> table.
            </div>
          </div>

        </div>
      </div>

      <div style="height:14px"></div>
      <div class="small-link"><a href="./index.html">Back to registration</a></div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" onerror="this.onerror=null;this.src='https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';"></script>
  
  <!-- Supabase JS (UMD) -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" onerror="this.onerror=null;this.src='https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js';"></script>
  <!-- XLSX for Excel export -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" onerror="this.onerror=null;this.src='https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';"></script>

  <script src="./config.js"></script>
  <script src="./utils.js"></script>
  <script src="./admin.js"></script>

</body>
</html>
