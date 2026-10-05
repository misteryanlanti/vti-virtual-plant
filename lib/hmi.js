// ============================================================
// DCS 操作站（HMI）仿真画面
//   · 工艺流程图：7 工段卡片 + 设备关键测点实时值
//   · 控制回路：12 个 PID 回路，PV/SP/MV 显示，自动/手动切换、设定值调整
//   · 报警列表：HH/H/L/LL 四级报警判定
//   · SIS 联锁：13 条安全联锁状态，故障时显示联锁动作
// 依赖: INSTRUMENTS, CONTROL_LOOPS, INTERLOCKS, PSV_LIST, INSTR_META, state
// 加载顺序: lib/instrument_builders.js → lib/hmi.js
// ============================================================
var HMI = {
  visible: false,
  root: null,
  timer: null,
  _noise: {},       // 位号 → 噪声相位
  _loopMode: {},    // 回路位号 → '自动'/'手动'
  _loopSp: {},      // 回路位号 → 手动设定的 SP
  _loopMv: {},      // 回路位号 → 手动设定的 MV

  // ---------------- 样式注入 ----------------
  injectStyles: function(){
    if (document.getElementById('hmi-style')) return;
    var css = [
      '#hmi{position:fixed;inset:0;z-index:60;background:#08131f;color:#cfe3f5;',
      'font-family:Consolas,"Microsoft YaHei",monospace;display:none;flex-direction:column}',
      '#hmi.on{display:flex}',
      '.hmi-top{height:46px;flex:0 0 46px;display:flex;align-items:center;gap:14px;',
      'padding:0 14px;background:linear-gradient(90deg,#0d2036,#12304d);border-bottom:2px solid #2a5bb8}',
      '.hmi-top h2{font-size:15px;color:#7fd0ff;margin:0}',
      '.hmi-top .info{font-size:11px;color:#7fa8cc}',
      '.hmi-top .sp{flex:1}',
      '.hmi-close{padding:5px 14px;border:1px solid #2a5bb8;border-radius:5px;background:#1a3568;',
      'color:#cfe3f5;cursor:pointer;font-size:12px}',
      '.hmi-close:hover{background:#2a5bb8}',
      '.hmi-body{flex:1;display:grid;grid-template-columns:1fr 380px;gap:10px;padding:10px;overflow:hidden}',
      '.hmi-pane{background:#0d1b2c;border:1px solid #1f4468;border-radius:7px;padding:8px;overflow-y:auto}',
      '.hmi-pane h3{margin:2px 0 7px;font-size:12px;color:#63b3ed;',
      'border-bottom:1px solid #1f4468;padding-bottom:4px}',
      /* 工艺流程图 */
      '.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
      '.sec{background:#0a1728;border:1px solid #245079;border-radius:6px;padding:6px}',
      '.sec .sh{font-size:11px;font-weight:bold;color:#ffd54f;margin-bottom:4px;',
      'border-bottom:1px solid #245079;padding-bottom:3px}',
      '.dev{display:flex;justify-content:space-between;align-items:center;gap:6px;',
      'font-size:10px;padding:2px 3px;border-radius:3px}',
      '.dev.alm{background:#4a1414}',
      '.dev .dt{color:#8fb8dd;white-space:nowrap}',
      '.dev .dv{font-weight:bold;color:#63d2ff;white-space:nowrap}',
      '.dev .dv.hi{color:#ff8a8a}',
      '.dev .dv.lo{color:#ffcc66}',
      /* 控制回路 */
      '.loop{border:1px solid #245079;border-radius:5px;padding:5px 6px;margin-bottom:5px;background:#0a1728}',
      '.loop .lh{display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px}',
      '.loop .lt{color:#ffd54f;font-weight:bold}',
      '.loop .lm{font-size:9px;padding:1px 6px;border-radius:8px;border:1px solid #2a5bb8;cursor:pointer}',
      '.loop .lm.auto{background:#12502f;color:#7fffa8;border-color:#2a8f4e}',
      '.loop .lm.man{background:#5a3a12;color:#ffcc66;border-color:#a8763a}',
      '.loop .lrow{display:flex;gap:6px;align-items:center;font-size:10px;margin-top:3px}',
      '.loop .lrow label{width:26px;color:#8fb8dd}',
      '.loop .lrow input[type=range]{flex:1;height:14px}',
      '.loop .lrow .val{width:52px;text-align:right;color:#63d2ff;font-weight:bold}',
      /* 报警 */
      '.alm-row{font-size:10px;padding:3px 5px;margin-bottom:3px;border-radius:3px;',
      'border-left:3px solid;display:flex;justify-content:space-between;gap:6px}',
      '.alm-row.HH{background:#5a1414;border-color:#ff4444;color:#ffc0c0}',
      '.alm-row.H{background:#4a3410;border-color:#ff9933;color:#ffddaa}',
      '.alm-row.L{background:#12404a;border-color:#33ccdd;color:#bbeeff}',
      '.alm-row.LL{background:#123a4a;border-color:#4499ff;color:#bbddff}',
      '.ok-row{font-size:11px;color:#5f8fae;padding:6px}',
      /* SIS */
      '.sis{border:1px solid #245079;border-radius:5px;padding:5px 6px;margin-bottom:5px;background:#0a1728}',
      '.sis.trip{background:#4a0f14;border-color:#ff4444;animation:sisflash 1s infinite}',
      '@keyframes sisflash{0%,100%{box-shadow:0 0 5px rgba(255,60,60,.35)}50%{box-shadow:0 0 16px rgba(255,60,60,.85)}}',
      '.sis .sh2{display:flex;justify-content:space-between;font-size:10px;gap:6px}',
      '.sis .st{font-weight:bold;color:#7fffa8}',
      '.sis.trip .st{color:#ff7777}',
      '.sis .sd{font-size:9px;color:#8fb8dd;margin-top:2px;line-height:1.45}',
      '.sis .sil{font-size:9px;padding:0 5px;border-radius:6px;background:#1a3568;color:#9fd0ff}',
      '.sis .sil.s3{background:#6a1414;color:#ffbbbb}',
      '.sis .sil.s2{background:#5a3a12;color:#ffcc99}',
      '.kv{display:flex;justify-content:space-between;font-size:10px;padding:1px 3px}',
      '.kv .k{color:#8fb8dd}.kv .v{color:#63d2ff;font-weight:bold}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'hmi-style';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  },

  // ---------------- 构建 DOM ----------------
  build: function(){
    if (this.root) return;
    this.injectStyles();
    var d = document.createElement('div');
    d.id = 'hmi';
    d.innerHTML = [
      '<div class="hmi-top">',
      '  <h2>🖥 DCS 操作站 — 钒渣提钒制 V₂O₅ 装置</h2>',
      '  <span class="info" id="hmi-io"></span>',
      '  <span class="sp"></span>',
      '  <span class="info" id="hmi-clock"></span>',
      '  <button class="hmi-close" id="hmi-close">关闭并返回三维工厂 ✕</button>',
      '</div>',
      '<div class="hmi-body">',
      '  <div class="hmi-pane" style="overflow-y:auto">',
      '    <h3>工艺流程图 — 实时测点（工况每秒刷新）</h3>',
      '    <div class="flow" id="hmi-flow"></div>',
      '  </div>',
      '  <div style="display:flex;flex-direction:column;gap:10px;overflow:hidden">',
      '    <div class="hmi-pane" style="flex:1.15"><h3>控制回路（PID）</h3><div id="hmi-loops"></div></div>',
      '    <div class="hmi-pane" style="flex:1"><h3>SIS 安全联锁</h3><div id="hmi-sis"></div></div>',
      '    <div class="hmi-pane" style="flex:.8"><h3>过程报警</h3><div id="hmi-alarm"></div></div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(d);
    this.root = d;
    var self = this;
    document.getElementById('hmi-close').onclick = function(){ self.hide(); };
    document.getElementById('hmi-io').textContent =
      'I/O: AI ' + DCS_INFO.ai + ' / AO ' + DCS_INFO.ao +
      ' / DI ' + DCS_INFO.di + ' / DO ' + DCS_INFO.do_ +
      ' · 回路 ' + DCS_INFO.loops + ' · 联锁 ' + DCS_INFO.sisLoops;
  },

  // ---------------- 实时值（含噪声与故障工况） ----------------
  value: function(m){
    var base = m.pv;
    var isFault = (typeof state !== 'undefined') && state.faults && state.faults.has(m.equip);
    if (isFault && m.faultPv !== undefined) base = m.faultPv;
    if (typeof base !== 'number') return base;
    var ph = (this._noise[m.tag] || 0) + 0.07;
    this._noise[m.tag] = ph;
    var amp = Math.abs(base) * 0.005 + 0.002;
    return base + Math.sin(ph) * amp;
  },

  alarmOf: function(m, v){
    if (typeof v !== 'number') return null;
    if (m.hh !== undefined && v >= m.hh) return {lv:'HH', txt:'高高'};
    if (m.h  !== undefined && v >= m.h ) return {lv:'H',  txt:'高'};
    if (m.ll !== undefined && v <= m.ll) return {lv:'LL', txt:'低低'};
    if (m.l  !== undefined && v <= m.l ) return {lv:'L',  txt:'低'};
    return null;
  },

  fmt: function(v, m){
    if (typeof v !== 'number') return String(v);
    var a = Math.abs(v);
    if (m.unit === 'mg/m³' || m.unit === 'mg/L' || m.unit === 'm³/h' ||
        m.unit === 't/h' || m.unit === 'kg' || m.unit === 'A') return v.toFixed(1);
    if (a >= 100) return v.toFixed(1);
    if (a >= 10)  return v.toFixed(2);
    return v.toFixed(2);
  },

  // ---------------- 渲染：工艺流程图 ----------------
  renderFlow: function(){
    var box = document.getElementById('hmi-flow');
    if (!box) return;
    var self = this;
    // 工段顺序与设备分组
    var SECS = [
      {n:'① 原料与磨矿', eq:['V-101','B-102','B-103','M-104','H-105','T-106']},
      {n:'② 钠化焙烧',   eq:['S-201','K-202','D-203','C-204']},
      {n:'③ 浸出分离',   eq:['R-301','R-302','P-303','F-304']},
      {n:'④ 萃取净化',   eq:['E-401','X-502']},
      {n:'⑤ 沉钒',       eq:['P-501','T-502','P-503']},
      {n:'⑥ 煅烧成品',   eq:['K-601','V-602','W-603','Y-604']},
      {n:'⑦ 环保',       eq:['A-701','A-702','W-703','C-704']},
      {n:'⑧ 公辅',       eq:['S-801','S-802','U-804','E-805','A-807','B-808']},
    ];
    var html = '';
    SECS.forEach(function(sec){
      html += '<div class="sec"><div class="sh">' + sec.n + '</div>';
      sec.eq.forEach(function(tag){
        var list = INSTRUMENTS.filter(function(m){ return m.equip === tag; });
        if (!list.length) return;
        // 每台设备取前 2 个最关键测点（优先带故障工况值或报警限的）
        var key = list.filter(function(m){ return m.faultPv !== undefined; });
        var rest = list.filter(function(m){ return m.faultPv === undefined; });
        var show = key.concat(rest).slice(0, 2);
        var isFault = (typeof state !== 'undefined') && state.faults && state.faults.has(tag);
        show.forEach(function(m, i){
          var v = self.value(m);
          var al = self.alarmOf(m, v);
          var cls = al ? (al.lv === 'HH' || al.lv === 'H' ? 'hi' : 'lo') : '';
          html += '<div class="dev' + (isFault ? ' alm' : '') + '">' +
                  '<span class="dt">' + (i === 0 ? tag + ' ' : '') + m.tag + '</span>' +
                  '<span class="dv ' + cls + '">' + self.fmt(v, m) + ' ' + (m.unit === '—' ? '' : m.unit) + '</span>' +
                  '</div>';
        });
      });
      html += '</div>';
    });
    box.innerHTML = html;
  },

  // ---------------- 渲染：控制回路 ----------------
  renderLoops: function(){
    var box = document.getElementById('hmi-loops');
    if (!box) return;
    var self = this;
    var html = '';
    CONTROL_LOOPS.forEach(function(lp){
      var mode = self._loopMode[lp.tag] || '自动';
      var isFault = (typeof state !== 'undefined') && state.faults && state.faults.has(lp.equip);
      var sp = (mode === '手动') ? (self._loopSp[lp.tag] !== undefined ? self._loopSp[lp.tag] : lp.sp) : lp.sp;
      var mv = (mode === '手动') ? (self._loopMv[lp.tag] !== undefined ? self._loopMv[lp.tag] : lp.mv) : lp.mv;
      // 故障工况：执行机构动作（调节阀趋向全开或全关）
      if (isFault) mv = (lp.tag === 'ARC-501' || lp.tag === 'ARC-701' || lp.tag === 'TRC-202') ? 100 : mv;
      var pvInst = INSTRUMENTS.filter(function(m){ return m.tag === lp.pvTag; })[0];
      var pv = pvInst ? self.value(pvInst) : lp.pv;
      html += '<div class="loop" id="lp-' + lp.tag + '">' +
        '<div class="lh"><span class="lt">' + lp.tag + ' ' + lp.name + '</span>' +
        '<span class="lm ' + (mode === '自动' ? 'auto' : 'man') + '" data-loop="' + lp.tag + '">' + mode + '</span></div>' +
        '<div class="lrow"><label>PV</label><span class="val">' + self.fmt(pv, pvInst || lp) + ' ' + lp.unit + '</span>' +
        '<span style="color:#5f8fae;font-size:9px">' + lp.pvName + '</span></div>' +
        '<div class="lrow"><label>SP</label>' +
        '<input type="range" data-loop="' + lp.tag + '" data-k="sp" min="' + self._rng(lp, 'sp', 0) +
        '" max="' + self._rng(lp, 'sp', 1) + '" step="' + self._rng(lp, 'sp', 2) + '" value="' + sp + '"' +
        (mode === '自动' ? ' disabled' : '') + '>' +
        '<span class="val" id="spv-' + lp.tag + '">' + (typeof sp === 'number' ? sp.toFixed(2) : sp) + '</span></div>' +
        '<div class="lrow"><label>MV</label>' +
        '<input type="range" data-loop="' + lp.tag + '" data-k="mv" min="0" max="100" step="1" value="' + mv + '"' +
        (mode === '自动' ? ' disabled' : '') + '>' +
        '<span class="val" id="mvv-' + lp.tag + '">' + Math.round(mv) + '%</span></div>' +
        '<div style="font-size:9px;color:#5f8fae;margin-top:2px">执行机构: ' + lp.mvName +
        ' · Kp=' + lp.pid.Kp + ' Ti=' + lp.pid.Ti + 's</div>' +
        '</div>';
    });
    box.innerHTML = html;
    // 绑定事件
    box.querySelectorAll('.lm').forEach(function(btn){
      btn.onclick = function(){
        var t = btn.dataset.loop;
        var cur = self._loopMode[t] || '自动';
        self._loopMode[t] = (cur === '自动') ? '手动' : '自动';
        if (self._loopMode[t] === '手动') {
          var lp = CONTROL_LOOPS.filter(function(x){return x.tag===t;})[0];
          if (lp && self._loopSp[t] === undefined) { self._loopSp[t] = lp.sp; self._loopMv[t] = lp.mv; }
        }
        self.renderLoops();
      };
    });
    box.querySelectorAll('input[type=range]').forEach(function(r){
      r.oninput = function(){
        var t = r.dataset.loop, k = r.dataset.k;
        if (k === 'sp') { self._loopSp[t] = parseFloat(r.value);
          var e = document.getElementById('spv-' + t); if (e) e.textContent = parseFloat(r.value).toFixed(2); }
        else { self._loopMv[t] = parseFloat(r.value);
          var e2 = document.getElementById('mvv-' + t); if (e2) e2.textContent = Math.round(r.value) + '%'; }
      };
    });
  },

  // SP 滑块量程（围绕设定值上下浮动）
  _rng: function(lp, key, which){
    if (key !== 'sp') return 0;
    var s = lp.sp;
    var span = Math.max(Math.abs(s) * 0.6, 1);
    var lo = Math.max(0, s - span), hi = s + span;
    if (lp.unit === 'Pa') { lo = s - 200; hi = s + 200; }
    if (lp.unit === 'mm') { lo = -250; hi = 250; }
    var step = (hi - lo) > 50 ? 1 : 0.05;
    return [lo, hi, step][which];
  },

  // ---------------- 渲染：报警 ----------------
  renderAlarm: function(){
    var box = document.getElementById('hmi-alarm');
    if (!box) return;
    var self = this;
    var rows = [];
    INSTRUMENTS.forEach(function(m){
      var v = self.value(m);
      var al = self.alarmOf(m, v);
      if (al) rows.push({m:m, v:v, al:al});
    });
    rows.sort(function(a,b){
      var o = {HH:0, LL:1, H:2, L:3};
      return (o[a.al.lv]||9) - (o[b.al.lv]||9);
    });
    if (!rows.length) {
      box.innerHTML = '<div class="ok-row">✔ 无过程报警，装置运行正常</div>';
      return;
    }
    box.innerHTML = rows.slice(0, 40).map(function(r){
      return '<div class="alm-row ' + r.al.lv + '">' +
        '<span>' + r.al.txt + ' · ' + r.m.tag + ' ' + r.m.name + '</span>' +
        '<span>' + self.fmt(r.v, r.m) + ' ' + r.m.unit + '</span></div>';
    }).join('') + (rows.length > 40 ? '<div class="ok-row">… 另有 ' + (rows.length-40) + ' 条</div>' : '');
  },

  // ---------------- 渲染：SIS 联锁 ----------------
  renderSIS: function(){
    var box = document.getElementById('hmi-sis');
    if (!box) return;
    var html = '';
    INTERLOCKS.forEach(function(ilk){
      var trip = (typeof state !== 'undefined') && state.faults && state.faults.has(ilk.faultTag);
      var silCls = ilk.sil === 3 ? 's3' : (ilk.sil === 2 ? 's2' : '');
      html += '<div class="sis' + (trip ? ' trip' : '') + '">' +
        '<div class="sh2"><span style="color:#9fd0ff">' + ilk.tag + ' ' + ilk.name + '</span>' +
        '<span><span class="sil ' + silCls + '">SIL' + ilk.sil + '</span> ' +
        '<span class="st">' + (trip ? '已动作' : '正常') + '</span></span></div>' +
        '<div class="sd">传感器: ' + ilk.sensor + '（' + ilk.logic + '）<br>' +
        '触发: ' + ilk.trip + '<br>' +
        '动作: <span style="color:' + (trip ? '#ff9999' : '#8fb8dd') + '">' + ilk.action + '</span></div>' +
        '</div>';
    });
    html += '<div style="font-size:9px;color:#5f8fae;margin-top:5px;line-height:1.5">' +
      '机械保护（独立于SIS）: ' + PSV_LIST.map(function(p){return p.tag + '(' + p.set + ')';}).join(' · ') +
      '<br>SIS 与 DCS 独立设置，符合 IEC 61511 / GB 50770</div>';
    box.innerHTML = html;
  },

  // ---------------- 刷新 ----------------
  tick: function(){
    if (!this.visible) return;
    this.renderFlow();
    this.renderLoops();
    this.renderAlarm();
    this.renderSIS();
    var c = document.getElementById('hmi-clock');
    if (c) { var d = new Date();
      c.textContent = '系统时间 ' + d.toLocaleTimeString('zh-CN', {hour12:false}); }
  },

  // ---------------- 显示 / 隐藏 ----------------
  show: function(){
    this.build();
    this.visible = true;
    this.root.classList.add('on');
    this.tick();
    var self = this;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(function(){ self.tick(); }, 1000);
  },
  hide: function(){
    this.visible = false;
    if (this.root) this.root.classList.remove('on');
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },
  toggle: function(){ this.visible ? this.hide() : this.show(); }
};
