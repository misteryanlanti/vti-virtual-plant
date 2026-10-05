// ============================================================
// 仪表系统数据 — 检测仪表 / 自动控制系统(DCS) / 安全仪表系统(SIS)
// 位号规则依据 HG/T 20505（等同 ISA-5.1）
//   首位字母(被测变量): T温度 P压力 L液位 F流量 A分析 S速度 W重量
//                        I电流 E电压 G可燃/有毒气体 B火焰 V振动
//   后继字母(功能):     E检测元件 T变送器 I指示 R记录 C控制 A报警
//                        S开关/联锁 V阀 Q累积 H高 L低
// 加载顺序: equipment_data.js → instrument_data.js
// ============================================================

// ---------- 仪表类型元信息（颜色/图标，供 3D 与 HMI 使用）----------
var INSTR_META = {
  T: {label:'温度', color:'#ff7744', icon:'🌡', desc:'热电偶/热电阻 → 温度变送器'},
  P: {label:'压力', color:'#44aaee', icon:'⏱', desc:'压力/差压变送器'},
  L: {label:'液位', color:'#22cc88', icon:'📊', desc:'雷达/超声波/差压液位计'},
  F: {label:'流量', color:'#cc77dd', icon:'💧', desc:'电磁/涡街/孔板/转子流量计'},
  A: {label:'分析', color:'#ffcc33', icon:'⚗', desc:'pH计/浓度计/烟气分析仪'},
  S: {label:'转速', color:'#88bb44', icon:'🔄', desc:'转速/速度传感器'},
  W: {label:'重量', color:'#dd8855', icon:'⚖', desc:'皮带秤/称重模块'},
  I: {label:'电流', color:'#66ccff', icon:'⚡', desc:'电流互感器/变送器'},
  E: {label:'电压', color:'#99aaff', icon:'🔌', desc:'电压互感器'},
  G: {label:'气体', color:'#ff5555', icon:'☠', desc:'可燃/有毒气体探测器'},
  B: {label:'火焰', color:'#ff8833', icon:'🔥', desc:'火焰检测器'},
  V: {label:'振动', color:'#aa88cc', icon:'〰', desc:'振动/振幅传感器'},
};

// ============================================================
//  一、检测仪表（约 117 点）
//  字段: tag位号 equip所属设备 type类型 name名称
//        range量程 unit单位 signal信号 acc精度
//        pv当前值 hh高高 h高 l低 ll低低
//        install安装位置 mount挂载偏移(可选)
// ============================================================
var INSTRUMENTS = [
// ---------------- 1 原料与磨矿 ----------------
{tag:'WI-101', equip:'V-101', type:'W', name:'电子皮带秤', range:'0~5 t/h', unit:'t/h',
 signal:'4~20mA+HART', acc:'±0.5%', pv:1.2, hh:4.5, h:4.0, l:0.5, ll:0.2,
 install:'皮带机中部承载段', faultPv:2.6},
{tag:'SI-101', equip:'V-101', type:'S', name:'皮带速度传感器', range:'0~5 m/s', unit:'m/s',
 signal:'4~20mA', acc:'±1.0%', pv:3.0, h:4.0, l:1.0, install:'皮带机尾部改向滚筒'},

{tag:'SI-102', equip:'B-102', type:'S', name:'主轴转速检测', range:'0~300 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±1.0%', pv:220, h:280, l:150, install:'破碎机主轴端'},
{tag:'II-102', equip:'B-102', type:'I', name:'主电机电流', range:'0~100 A', unit:'A',
 signal:'4~20mA', acc:'0.5级', pv:62, hh:95, h:85, install:'配电柜电流互感器'},

{tag:'II-103', equip:'B-103', type:'I', name:'主电机电流', range:'0~200 A', unit:'A',
 signal:'4~20mA', acc:'0.5级', pv:135, hh:190, h:170, install:'配电柜电流互感器'},
{tag:'PI-103', equip:'B-103', type:'P', name:'液压站压力', range:'0~25 MPa', unit:'MPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:14.0, hh:22, h:20, ll:8, l:10, install:'液压站出口'},

{tag:'SI-104', equip:'M-104', type:'S', name:'筒体转速', range:'0~30 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±1.0%', pv:18.0, h:24, l:12, install:'筒体端部'},
{tag:'TI-104', equip:'M-104', type:'T', name:'主轴承温度', range:'0~150 ℃', unit:'℃',
 signal:'Pt100 三线制', acc:'±0.5℃', pv:58, hh:85, h:75, install:'两端主轴承座'},
{tag:'AI-104', equip:'M-104', type:'A', name:'矿浆浓度计', range:'0~80 %', unit:'%',
 signal:'4~20mA+HART', acc:'±1.0%', pv:68, h:76, l:55, install:'磨机排料槽'},

{tag:'PI-105', equip:'H-105', type:'P', name:'旋流器给料压力', range:'0~0.4 MPa', unit:'MPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:0.12, hh:0.35, h:0.30, ll:0.06, l:0.08, install:'进料总管'},
{tag:'FI-105', equip:'H-105', type:'F', name:'旋流器给料流量', range:'0~50 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:32.0, h:45, l:15, install:'进料总管水平段'},
{tag:'AI-105', equip:'H-105', type:'A', name:'底流浓度计', range:'0~80 %', unit:'%',
 signal:'4~20mA', acc:'±1.0%', pv:50.0, h:60, l:40, install:'底流汇集管'},

{tag:'LI-106', equip:'T-106', type:'L', name:'浓密机泥位计', range:'0~5 m', unit:'m',
 signal:'超声波 4~20mA', acc:'±1.0%', pv:1.8, hh:3.5, h:3.0, l:0.8, install:'池顶泥位计支架'},
{tag:'AI-106', equip:'T-106', type:'A', name:'底流浓度计', range:'0~60 %', unit:'%',
 signal:'4~20mA', acc:'±1.0%', pv:45.0, h:52, l:35, install:'底流泵出口'},
{tag:'PI-106', equip:'T-106', type:'P', name:'底流泵出口压力', range:'0~0.6 MPa', unit:'MPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:0.32, hh:0.55, h:0.48, ll:0.05, install:'底流泵出口管'},
{tag:'FI-106', equip:'T-106', type:'F', name:'底流流量', range:'0~30 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:18.5, h:26, l:8, install:'底流管'},
{tag:'SI-106', equip:'T-106', type:'S', name:'耙架转速', range:'0~2 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±2.0%', pv:0.35, h:1.2, ll:0.05, install:'中心驱动装置'},

// ---------------- 2 钠化焙烧 ----------------
{tag:'WI-201', equip:'S-201', type:'W', name:'纯碱给料秤', range:'0~3 t/h', unit:'t/h',
 signal:'4~20mA+HART', acc:'±0.5%', pv:0.85, h:2.5, l:0.2, install:'纯碱螺旋给料机'},
{tag:'SI-201', equip:'S-201', type:'S', name:'混合机转速', range:'0~100 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±1.0%', pv:45, h:80, l:20, install:'混合机主轴端'},
{tag:'LI-201', equip:'S-201', type:'L', name:'纯碱仓料位', range:'0~6 m', unit:'m',
 signal:'雷达料位计 4~20mA', acc:'±0.5%', pv:3.9, hh:5.5, h:5.0, ll:0.8, l:1.2, install:'纯碱仓顶'},

{tag:'TE-202A', equip:'K-202', type:'T', name:'窑尾温度(主)', range:'0~1200 ℃', unit:'℃',
 signal:'K型热电偶', acc:'±0.4%', pv:950, hh:1080, h:1000, l:850, install:'窑尾烟罩',
 note:'SIS联锁取此点（1oo2冗余）'},
{tag:'TE-202B', equip:'K-202', type:'T', name:'窑尾温度(备)', range:'0~1200 ℃', unit:'℃',
 signal:'K型热电偶', acc:'±0.4%', pv:948, hh:1080, h:1000, install:'窑尾烟罩对称位',
 note:'SIS冗余点'},
{tag:'TE-202C', equip:'K-202', type:'T', name:'窑头温度', range:'0~1200 ℃', unit:'℃',
 signal:'K型热电偶', acc:'±0.4%', pv:620, hh:900, h:800, install:'窑头罩'},
{tag:'TT-202', equip:'K-202', type:'T', name:'窑温变送器', range:'0~1200 ℃', unit:'℃',
 signal:'4~20mA+HART', acc:'±0.2%', pv:950, install:'窑头仪表箱', note:'温度串级控制主环'},
{tag:'PI-202', equip:'K-202', type:'P', name:'窑尾负压', range:'-500~0 Pa', unit:'Pa',
 signal:'4~20mA', acc:'±0.5%FS', pv:-120, hh:-20, h:-50, ll:-400, install:'窑尾烟罩',
 note:'微差压变送器'},
{tag:'SI-202', equip:'K-202', type:'S', name:'窑体转速', range:'0~5 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±1.0%', pv:2.4, h:4.0, l:1.0, install:'主电机测速发电机'},
{tag:'FI-202', equip:'K-202', type:'F', name:'燃气流量', range:'0~500 m³/h', unit:'m³/h',
 signal:'涡街流量计 4~20mA', acc:'±1.0%', pv:265, hh:450, h:400, ll:30, install:'燃气总管',
 note:'温度串级控制副环'},
{tag:'PT-202', equip:'K-202', type:'P', name:'燃气压力', range:'0~50 kPa', unit:'kPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:28, hh:45, h:40, ll:8, l:12, install:'燃气调压站后'},
{tag:'AE-202', equip:'K-202', type:'A', name:'烟气氧含量分析仪', range:'0~25 %', unit:'%',
 signal:'氧化锆 4~20mA', acc:'±1.0%', pv:3.5, h:8, l:1.0, install:'窑尾烟道',
 note:'燃烧效率监控'},
{tag:'TI-202', equip:'K-202', type:'T', name:'托轮轴承温度', range:'0~150 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.5℃', pv:52, hh:80, h:70, install:'各档托轮轴承座'},

{tag:'PI-203', equip:'D-203', type:'P', name:'除尘器压差', range:'0~3 kPa', unit:'kPa',
 signal:'差压变送器 4~20mA', acc:'±0.5%FS', pv:1.2, hh:2.5, h:2.0, l:0.4, install:'除尘器进出风管',
 note:'压差高→滤袋堵塞'},
{tag:'AI-203', equip:'D-203', type:'A', name:'粉尘浓度监测', range:'0~100 mg/m³', unit:'mg/m³',
 signal:'4~20mA', acc:'±2.0%', pv:30, hh:80, h:50, install:'除尘器出口烟囱'},
{tag:'TI-203', equip:'D-203', type:'T', name:'烟气温度', range:'0~300 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.5℃', pv:145, hh:220, h:190, install:'除尘器进口烟道'},

{tag:'TI-204', equip:'C-204', type:'T', name:'出料温度', range:'0~200 ℃', unit:'℃',
 signal:'K型热电偶', acc:'±0.4%', pv:72, hh:120, h:100, install:'冷却机排料端'},
{tag:'SI-204', equip:'C-204', type:'S', name:'链板速度', range:'0~2 m/min', unit:'m/min',
 signal:'4~20mA', acc:'±1.0%', pv:0.85, h:1.6, l:0.3, install:'链板驱动装置'},

// ---------------- 3 浸出 + 固液分离 ----------------
{tag:'TE-301', equip:'R-301', type:'T', name:'浸出温度', range:'0~100 ℃', unit:'℃',
 signal:'Pt100 三线制', acc:'±0.3℃', pv:70, hh:90, h:85, l:55, ll:45, install:'槽体下部',
 note:'蒸汽盘管加热，单回路PID'},
{tag:'AI-301', equip:'R-301', type:'A', name:'硫酸浓度计', range:'0~20 %', unit:'%',
 signal:'4~20mA+HART', acc:'±1.0%', pv:10.0, hh:18, h:15, l:6, install:'槽体上部液相',
 faultPv:15.0, note:'故障工况酸耗过高时升至15%'},
{tag:'AT-301', equip:'R-301', type:'A', name:'浸出浆液pH计', range:'0~14 pH', unit:'pH',
 signal:'4~20mA+HART', acc:'±0.05pH', pv:1.8, h:3.0, l:0.8, install:'槽体侧壁浸入式'},
{tag:'LT-301', equip:'R-301', type:'L', name:'浸出槽液位', range:'0~4 m', unit:'m',
 signal:'雷达液位计 4~20mA', acc:'±0.5%', pv:3.1, hh:3.8, h:3.6, ll:0.6, l:0.9,
 install:'槽顶雷达', note:'液位单回路控制'},
{tag:'SI-301', equip:'R-301', type:'S', name:'搅拌转速', range:'0~500 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±1.0%', pv:300, h:400, l:150, install:'搅拌机电机'},
{tag:'FT-301', equip:'R-301', type:'F', name:'硫酸加入流量', range:'0~5 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:2.4, h:4.2, l:0.8, install:'加酸管'},

{tag:'TE-302', equip:'R-302', type:'T', name:'二级浸出温度', range:'0~100 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.3℃', pv:68, hh:90, h:85, l:55, install:'槽体下部'},
{tag:'LT-302', equip:'R-302', type:'L', name:'二级槽液位', range:'0~4 m', unit:'m',
 signal:'雷达液位计 4~20mA', acc:'±0.5%', pv:2.8, hh:3.6, h:3.4, l:0.8, install:'槽顶雷达'},
{tag:'SI-302', equip:'R-302', type:'S', name:'搅拌转速', range:'0~500 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±1.0%', pv:280, h:400, l:150, install:'搅拌机电机'},

// ---- R-303 三级逆流浸出槽 ----
{tag:'TE-307', equip:'R-303', type:'T', name:'三级浸出温度', range:'0~100 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.3℃', pv:66, hh:90, h:85, l:55, install:'槽体下部'},
{tag:'LT-307', equip:'R-303', type:'L', name:'三级槽液位', range:'0~4 m', unit:'m',
 signal:'雷达液位计 4~20mA', acc:'±0.5%', pv:2.6, hh:3.6, h:3.4, l:0.8, install:'槽顶雷达'},
{tag:'SI-307', equip:'R-303', type:'S', name:'搅拌转速', range:'0~500 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±1.0%', pv:280, h:400, l:150, install:'搅拌机电机'},

// ---- T-303 浸出矿浆浓密机（CCD 逆流洗涤）----
{tag:'LI-305', equip:'T-303', type:'L', name:'浓密机泥位(泥水界面)', range:'0~3 m', unit:'m',
 signal:'超声波泥位计 4~20mA', acc:'±1.0%', pv:1.15, hh:2.40, h:2.00, l:0.35, ll:0.20,
 install:'池顶泥位计支架', faultPv:2.35, note:'CCD核心参数，控制底流泵频率'},
{tag:'AI-305', equip:'T-303', type:'A', name:'底流浓度计', range:'0~70 %', unit:'%',
 signal:'γ射线浓度计 4~20mA', acc:'±1.5%', pv:48.0, hh:62, h:58, l:38, ll:30,
 install:'底流管', faultPv:38.0},
{tag:'AI-306', equip:'T-303', type:'A', name:'溢流浊度(含固量)', range:'0~3000 mg/L', unit:'mg/L',
 signal:'浊度计 4~20mA', acc:'±2.0%', pv:150, hh:1000, h:500, install:'溢流槽',
 faultPv:1800, note:'跑浑判据，故障工况升至1800 mg/L'},
{tag:'PI-305', equip:'T-303', type:'P', name:'底流泵出口压力', range:'0~0.6 MPa', unit:'MPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:0.28, hh:0.52, h:0.45, ll:0.03, install:'底流泵出口管'},
{tag:'FI-305', equip:'T-303', type:'F', name:'底流流量', range:'0~25 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:12.5, h:20, l:5, install:'底流管'},
{tag:'FI-306', equip:'T-303', type:'F', name:'絮凝剂加药流量', range:'0~2 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:0.45, h:1.6, l:0.1, install:'加药管',
 note:'按给料量比值控制'},
{tag:'SI-305', equip:'T-303', type:'S', name:'耙架转速', range:'0~2 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±2.0%', pv:0.35, h:1.2, ll:0.05, install:'中心驱动减速机'},
{tag:'ST-305', equip:'T-303', type:'S', name:'耙架扭矩', range:'0~100 %', unit:'%',
 signal:'4~20mA', acc:'±2.0%', pv:32, hh:85, h:70, install:'中心驱动扭矩传感器',
 note:'过扭矩=压耙风险，SIS联锁'},

{tag:'PT-303', equip:'P-303', type:'P', name:'压滤压力', range:'0~1.0 MPa', unit:'MPa',
 signal:'4~20mA+HART', acc:'±0.5%FS', pv:0.40, hh:0.60, h:0.50, l:0.15,
 install:'进料管', faultPv:0.55, note:'SIS超压联锁'},
{tag:'FT-303', equip:'P-303', type:'F', name:'滤液流量', range:'0~30 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:16.0, h:26, ll:3.0, install:'滤液汇集管',
 faultPv:9.5, note:'滤布堵塞时流量下降'},
{tag:'AI-303', equip:'P-303', type:'A', name:'滤饼含水率', range:'0~60 %', unit:'%',
 signal:'4~20mA', acc:'±2.0%', pv:30, hh:45, h:40, install:'排料溜槽', faultPv:42},
{tag:'PI-308', equip:'P-303', type:'P', name:'液压站油压', range:'0~25 MPa', unit:'MPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:16.5, hh:24, h:22, ll:8, l:10,
 install:'液压站出口', note:'压紧/松开滤板的动力源压力'},

{tag:'PT-304', equip:'F-304', type:'P', name:'真空度', range:'-100~0 kPa', unit:'kPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:-40, hh:-15, h:-25, ll:-80, install:'真空集液罐'},
{tag:'SI-304', equip:'F-304', type:'S', name:'滤带速度', range:'0~10 m/min', unit:'m/min',
 signal:'4~20mA', acc:'±1.0%', pv:4.5, h:8.0, l:1.0, install:'驱动滚筒'},
{tag:'FT-304', equip:'F-304', type:'F', name:'洗涤水流量', range:'0~10 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:6.0, h:9.0, l:2.0, install:'洗涤水总管'},

// ---------------- 4 净化（萃取） ----------------
{tag:'FT-401', equip:'E-401', type:'F', name:'料液(水相)流量', range:'0~20 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:11.5, h:18, l:4.0, install:'料液进料管',
 note:'与FT-402构成比值控制'},
{tag:'FT-402', equip:'E-401', type:'F', name:'萃取剂(有机相)流量', range:'0~20 m³/h', unit:'m³/h',
 signal:'涡街流量计 4~20mA', acc:'±1.0%', pv:11.5, h:18, l:4.0, install:'有机相进料管',
 faultPv:18.4, note:'相比失调时有机相过量'},
{tag:'AI-401', equip:'E-401', type:'A', name:'相比 O/A 计算值', range:'0~3', unit:'—',
 signal:'DCS 内部计算', acc:'—', pv:1.00, hh:1.50, h:1.25, ll:0.60, l:0.80,
 install:'DCS 运算块', faultPv:1.60, note:'比值控制主参数'},
{tag:'LT-401', equip:'E-401', type:'L', name:'澄清槽相界面', range:'0~3 m', unit:'m',
 signal:'界面计(电容/射频) 4~20mA', acc:'±1.0%', pv:1.55, hh:2.4, h:2.1, ll:0.6, l:0.9,
 install:'澄清槽侧壁', faultPv:0.75, note:'界面破乳风险'},
{tag:'SI-401', equip:'E-401', type:'S', name:'混合室搅拌转速', range:'0~600 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±1.0%', pv:320, h:450, l:180, install:'混合室电机'},

{tag:'FI-502', equip:'X-502', type:'F', name:'离子交换进料流量', range:'0~5 m³/h', unit:'m³/h',
 signal:'转子流量计 4~20mA', acc:'±1.5%', pv:2.5, h:4.0, l:1.0, install:'柱顶进料管'},
{tag:'PI-502', equip:'X-502', type:'P', name:'交换柱压力', range:'0~0.6 MPa', unit:'MPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:0.18, hh:0.45, h:0.35, install:'柱底出料管'},
{tag:'AI-502', equip:'X-502', type:'A', name:'出口钒浓度(穿透监测)', range:'0~5 g/L', unit:'g/L',
 signal:'4~20mA', acc:'±2.0%', pv:0.12, hh:1.0, h:0.5, install:'柱出口',
 note:'穿透点检测'},

// ---------------- 5 沉钒 + 产品 ----------------
{tag:'AT-501', equip:'P-501', type:'A', name:'沉钒pH计', range:'0~14 pH', unit:'pH',
 signal:'4~20mA+HART', acc:'±0.02pH', pv:2.20, hh:3.50, h:2.80, ll:1.20, l:1.60,
 install:'反应器侧壁浸入式', faultPv:3.50, note:'SIS联锁核心点，pH控制主环'},
{tag:'TE-501', equip:'P-501', type:'T', name:'沉钒温度', range:'0~100 ℃', unit:'℃',
 signal:'Pt100 三线制', acc:'±0.3℃', pv:60, hh:80, h:75, l:45, install:'反应器下部'},
{tag:'LT-501', equip:'P-501', type:'L', name:'反应器液位', range:'0~4 m', unit:'m',
 signal:'雷达液位计 4~20mA', acc:'±0.5%', pv:2.9, hh:3.7, h:3.5, l:0.7, install:'反应器顶'},
{tag:'FT-501', equip:'P-501', type:'F', name:'铵盐加入流量', range:'0~2 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:0.85, h:1.6, l:0.3, install:'加铵管',
 note:'pH控制执行侧'},
{tag:'SI-501', equip:'P-501', type:'S', name:'搅拌转速', range:'0~400 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±1.0%', pv:180, h:300, l:80, install:'搅拌电机'},

{tag:'LT-502', equip:'T-502', type:'L', name:'钒盐浓密机泥位', range:'0~5 m', unit:'m',
 signal:'超声波 4~20mA', acc:'±1.0%', pv:1.6, hh:3.2, h:2.8, l:0.7, install:'池顶支架'},
{tag:'AI-502B', equip:'T-502', type:'A', name:'底流浓度计', range:'0~50 %', unit:'%',
 signal:'4~20mA', acc:'±1.0%', pv:30.0, h:40, l:20, install:'底流泵出口'},

{tag:'PT-503', equip:'P-503', type:'P', name:'钒盐压滤压力', range:'0~1.0 MPa', unit:'MPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:0.38, hh:0.60, h:0.50, l:0.15, install:'进料管'},
{tag:'FT-503', equip:'P-503', type:'F', name:'滤液流量', range:'0~20 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:9.5, h:16, l:2.0, install:'滤液汇集管'},

{tag:'TE-601A', equip:'K-601', type:'T', name:'煅烧一区温度', range:'0~800 ℃', unit:'℃',
 signal:'K型热电偶', acc:'±0.4%', pv:480, hh:620, h:580, install:'炉膛一区',
 note:'SIS超温联锁（3取2）'},
{tag:'TE-601B', equip:'K-601', type:'T', name:'煅烧二区温度', range:'0~800 ℃', unit:'℃',
 signal:'K型热电偶', acc:'±0.4%', pv:550, hh:620, h:580, install:'炉膛二区', faultPv:580},
{tag:'TE-601C', equip:'K-601', type:'T', name:'煅烧三区温度', range:'0~800 ℃', unit:'℃',
 signal:'K型热电偶', acc:'±0.4%', pv:545, hh:620, h:580, install:'炉膛三区'},
{tag:'SI-601', equip:'K-601', type:'S', name:'推板推进速度', range:'0~1 m/min', unit:'m/min',
 signal:'4~20mA', acc:'±1.0%', pv:0.35, h:0.8, ll:0.02, install:'推板驱动机构',
 faultPv:0.0, note:'推板卡阻时速度归零'},
{tag:'PI-601', equip:'K-601', type:'P', name:'炉膛压力', range:'-100~100 Pa', unit:'Pa',
 signal:'微差压 4~20mA', acc:'±0.5%FS', pv:-15, hh:50, h:30, ll:-60, install:'炉顶'},
{tag:'FI-601', equip:'K-601', type:'F', name:'燃气流量', range:'0~200 m³/h', unit:'m³/h',
 signal:'涡街 4~20mA', acc:'±1.0%', pv:88, hh:170, h:150, ll:15, install:'燃气管'},

{tag:'VI-602', equip:'V-602', type:'V', name:'筛机振幅', range:'0~5 mm', unit:'mm',
 signal:'4~20mA', acc:'±2.0%', pv:1.8, h:3.5, l:0.8, install:'筛箱侧板'},
{tag:'II-602', equip:'V-602', type:'I', name:'振动电机电流', range:'0~50 A', unit:'A',
 signal:'4~20mA', acc:'0.5级', pv:22, hh:45, h:38, install:'控制柜'},

{tag:'WI-603', equip:'W-603', type:'W', name:'包装称重模块', range:'0~100 kg', unit:'kg',
 signal:'4~20mA', acc:'±0.1%', pv:50.0, hh:50.3, h:50.15, ll:49.7, l:49.85,
 install:'称量斗称重传感器'},
{tag:'SI-603', equip:'W-603', type:'S', name:'包装速度', range:'0~60 袋/min', unit:'袋/min',
 signal:'4~20mA', acc:'±1.0%', pv:45, h:55, l:20, install:'包装机主轴'},
{tag:'LI-603', equip:'W-603', type:'L', name:'成品料仓料位', range:'0~5 m', unit:'m',
 signal:'阻旋/雷达 4~20mA', acc:'±1.0%', pv:3.2, hh:4.5, h:4.0, ll:0.5, install:'料仓顶'},

{tag:'LI-604', equip:'Y-604', type:'L', name:'成品堆场料位', range:'0~4 m', unit:'m',
 signal:'超声波 4~20mA', acc:'±1.0%', pv:2.1, hh:3.5, h:3.0, install:'堆场上方'},

// ---------------- 6 环保 ----------------
{tag:'AT-701', equip:'A-701', type:'A', name:'洗涤液pH计', range:'0~14 pH', unit:'pH',
 signal:'4~20mA+HART', acc:'±0.05pH', pv:8.5, hh:10.5, h:9.8, ll:6.0, l:6.8,
 install:'循环液槽', faultPv:5.0, note:'SIS联锁：pH失控→SO₂超标'},
{tag:'AE-701', equip:'A-701', type:'A', name:'出口SO₂分析仪', range:'0~2000 mg/m³', unit:'mg/m³',
 signal:'4~20mA (紫外/红外)', acc:'±2.0%', pv:300, hh:800, h:550, install:'塔顶出口烟囱',
 faultPv:980, note:'环保排放监测'},
{tag:'PI-701', equip:'A-701', type:'P', name:'洗涤塔压差', range:'0~3 kPa', unit:'kPa',
 signal:'差压变送器 4~20mA', acc:'±0.5%FS', pv:0.85, hh:2.0, h:1.6, install:'塔进出口'},
{tag:'LT-701', equip:'A-701', type:'L', name:'塔底液位', range:'0~3 m', unit:'m',
 signal:'差压液位计 4~20mA', acc:'±0.5%', pv:1.5, hh:2.6, h:2.3, ll:0.4, l:0.7, install:'塔底'},
{tag:'FT-701', equip:'A-701', type:'F', name:'洗涤液循环量', range:'0~100 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:62.0, h:90, ll:25, install:'循环泵出口'},

{tag:'AT-702', equip:'A-702', type:'A', name:'氨回收塔pH计', range:'0~14 pH', unit:'pH',
 signal:'4~20mA', acc:'±0.05pH', pv:9.2, hh:11.0, h:10.5, ll:7.5, install:'塔底循环槽'},
{tag:'LT-702', equip:'A-702', type:'L', name:'氨回收塔液位', range:'0~3 m', unit:'m',
 signal:'差压液位计 4~20mA', acc:'±0.5%', pv:1.4, hh:2.5, h:2.2, l:0.5, install:'塔底'},
{tag:'AI-702', equip:'A-702', type:'A', name:'氨回收率计算', range:'0~100 %', unit:'%',
 signal:'DCS 内部计算', acc:'—', pv:94, ll:85, l:90, install:'DCS 运算块'},

{tag:'AT-703', equip:'W-703', type:'A', name:'出水pH计', range:'0~14 pH', unit:'pH',
 signal:'4~20mA', acc:'±0.05pH', pv:7.2, hh:9.5, h:9.0, ll:5.5, l:6.0, install:'总排口',
 note:'环保排放监测'},
{tag:'AI-703', equip:'W-703', type:'A', name:'出水SS(悬浮物)', range:'0~100 mg/L', unit:'mg/L',
 signal:'4~20mA', acc:'±2.0%', pv:30, hh:70, h:50, install:'总排口在线监测'},
{tag:'LT-703', equip:'W-703', type:'L', name:'调节池液位', range:'0~4 m', unit:'m',
 signal:'超声波 4~20mA', acc:'±1.0%', pv:2.4, hh:3.6, h:3.3, l:0.6, install:'调节池顶'},
{tag:'FT-703', equip:'W-703', type:'F', name:'废水处理量', range:'0~200 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:120, h:170, l:40, install:'进水总管'},

{tag:'TE-704A', equip:'C-704', type:'T', name:'冷却塔进水温度', range:'0~60 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.3℃', pv:42, hh:55, h:50, install:'进水管'},
{tag:'TE-704B', equip:'C-704', type:'T', name:'冷却塔出水温度', range:'0~60 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.3℃', pv:34, hh:45, h:40, install:'出水管',
 note:'进出水温差 8℃'},
{tag:'LI-704', equip:'C-704', type:'L', name:'集水池液位', range:'0~2 m', unit:'m',
 signal:'超声波 4~20mA', acc:'±1.0%', pv:1.2, hh:1.8, h:1.6, ll:0.4, l:0.6, install:'集水池'},
{tag:'FI-704', equip:'C-704', type:'F', name:'循环水量', range:'0~1000 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:800, h:950, l:400, install:'循环水总管'},

// ---------------- 7 公辅 ----------------
{tag:'LT-801', equip:'S-801', type:'L', name:'硫酸罐液位', range:'0~6 m', unit:'m',
 signal:'雷达液位计 4~20mA', acc:'±0.5%', pv:4.68, hh:5.6, h:5.2, ll:0.6, l:1.0,
 install:'罐顶雷达', note:'78%液位'},
{tag:'FT-801', equip:'S-801', type:'F', name:'硫酸输出流量', range:'0~10 m³/h', unit:'m³/h',
 signal:'电磁(衬PTFE) 4~20mA', acc:'±0.5%', pv:3.2, h:8.0, l:0.5, install:'输出总管'},
{tag:'AT-801', equip:'S-801', type:'A', name:'硫酸浓度计', range:'90~100 %', unit:'%',
 signal:'4~20mA', acc:'±0.5%', pv:98.0, l:92, install:'罐区取样回路'},

{tag:'LT-802', equip:'S-802', type:'L', name:'铵盐罐液位', range:'0~7 m', unit:'m',
 signal:'雷达液位计 4~20mA', acc:'±0.5%', pv:4.55, hh:6.5, h:6.0, ll:0.7, l:1.2,
 install:'罐顶雷达', note:'65%液位'},
{tag:'FT-802', equip:'S-802', type:'F', name:'铵盐输出流量', range:'0~10 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:1.8, h:7.0, l:0.4, install:'输出总管'},

{tag:'PT-804', equip:'U-804', type:'P', name:'总管压力', range:'0~1.0 MPa', unit:'MPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:0.45, hh:0.80, h:0.65, ll:0.10, install:'管廊总管'},
{tag:'FT-804', equip:'U-804', type:'F', name:'总管流量', range:'0~600 m³/h', unit:'m³/h',
 signal:'电磁流量计 4~20mA', acc:'±0.5%', pv:520, h:580, l:200, install:'管廊总管'},
{tag:'PI-804', equip:'U-804', type:'P', name:'泵出口压力', range:'0~1.0 MPa', unit:'MPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:0.45, hh:0.75, h:0.62, ll:0.08, install:'泵出口',
 note:'扬程45m≈0.45MPa'},

{tag:'II-805', equip:'E-805', type:'I', name:'进线电流', range:'0~500 A', unit:'A',
 signal:'4~20mA', acc:'0.5级', pv:320, hh:460, h:420, install:'高压柜CT'},
{tag:'EI-805', equip:'E-805', type:'E', name:'母线电压', range:'0~12 kV', unit:'kV',
 signal:'4~20mA', acc:'0.5级', pv:10.2, hh:11.5, h:11.0, ll:9.0, l:9.5, install:'高压柜PT'},
{tag:'TI-805', equip:'E-805', type:'T', name:'变压器油温', range:'0~120 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.5℃', pv:56, hh:95, h:85, install:'变压器本体'},

{tag:'TI-806', equip:'C-806', type:'T', name:'DCS机房温度', range:'0~50 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.5℃', pv:23, hh:35, h:30, ll:15, l:18, install:'机房空调区'},

{tag:'PT-807', equip:'A-807', type:'P', name:'空压机排气压力', range:'0~1.6 MPa', unit:'MPa',
 signal:'4~20mA', acc:'±0.5%FS', pv:0.80, hh:1.20, h:1.05, ll:0.45, l:0.55,
 install:'储气罐', note:'压力控制回路'},
{tag:'TE-807', equip:'A-807', type:'T', name:'排气温度', range:'0~150 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.5℃', pv:82, hh:120, h:105, install:'排气口'},
{tag:'LI-807', equip:'A-807', type:'L', name:'储气罐液位(凝水)', range:'0~1 m', unit:'m',
 signal:'4~20mA', acc:'±1.0%', pv:0.15, hh:0.8, h:0.6, install:'储气罐底部',
 note:'凝水排放监控'},

{tag:'PT-808', equip:'B-808', type:'P', name:'蒸汽压力', range:'0~1.6 MPa', unit:'MPa',
 signal:'4~20mA+HART', acc:'±0.5%FS', pv:0.60, hh:0.85, h:0.75, ll:0.30, l:0.40,
 install:'锅炉本体', note:'SIS联锁'} ,
{tag:'TE-808', equip:'B-808', type:'T', name:'蒸汽温度', range:'0~250 ℃', unit:'℃',
 signal:'K型热电偶', acc:'±0.4%', pv:165, hh:210, h:195, install:'主蒸汽管'},
{tag:'LT-808', equip:'B-808', type:'L', name:'锅炉水位', range:'-300~300 mm', unit:'mm',
 signal:'差压水位计 4~20mA', acc:'±1.0%', pv:0, hh:150, h:100, ll:-150, l:-100,
 install:'锅炉汽包', note:'SIS联锁（三冲量控制）'},
{tag:'FT-808', equip:'B-808', type:'F', name:'蒸汽流量', range:'0~2 t/h', unit:'t/h',
 signal:'涡街 4~20mA', acc:'±1.0%', pv:1.2, hh:1.8, h:1.6, l:0.3, install:'主蒸汽管'},
{tag:'AE-808', equip:'B-808', type:'A', name:'烟气氧含量', range:'0~25 %', unit:'%',
 signal:'氧化锆 4~20mA', acc:'±1.0%', pv:4.2, h:9, l:1.5, install:'锅炉烟道'},

// ---------------- 8 化验室 ----------------
{tag:'AI-901', equip:'L-901', type:'A', name:'V₂O₅纯度分析', range:'90~100 %', unit:'%',
 signal:'化验数据人工录入', acc:'±0.2%', pv:98.0, ll:96.0, l:97.0, install:'化验室分光光度计',
 faultPv:94.0},
{tag:'AT-901', equip:'L-901', type:'A', name:'化验室pH计', range:'0~14 pH', unit:'pH',
 signal:'台式 人工录入', acc:'±0.01pH', pv:7.0, install:'化验台'},

// ---------------- 火气系统 F&G（安全相关） ----------------
{tag:'GT-202', equip:'K-202', type:'G', name:'窑头燃气泄漏检测', range:'0~100 %LEL', unit:'%LEL',
 signal:'4~20mA', acc:'±3.0%FS', pv:2, hh:25, h:10, install:'窑头燃烧器区',
 note:'SIS联锁：≥25%LEL切断燃气总阀'},
{tag:'BS-202', equip:'K-202', type:'B', name:'窑头火焰检测', range:'有/无', unit:'—',
 signal:'开关量(干接点)', acc:'—', pv:1, install:'窑头看火孔',
 note:'SIS联锁：火焰丧失→熄火保护'},
{tag:'GT-808', equip:'B-808', type:'G', name:'锅炉房燃气检测', range:'0~100 %LEL', unit:'%LEL',
 signal:'4~20mA', acc:'±3.0%FS', pv:1, hh:25, h:10, install:'锅炉燃烧器区',
 note:'SIS联锁：≥25%LEL切断燃气'},
{tag:'BS-808', equip:'B-808', type:'B', name:'锅炉火焰检测', range:'有/无', unit:'—',
 signal:'开关量(干接点)', acc:'—', pv:1, install:'锅炉炉膛',
 note:'SIS联锁：熄火→MFT'},

// ---------------- 补充：焙烧烟气系统与新增工序设备 ----------------
// P-204 窑尾排烟引风机
{tag:'PT-204', equip:'P-204', type:'P', name:'引风机出口压力', range:'-6~0 kPa', unit:'kPa',
 signal:'4~20mA', acc:'±0.5%', pv:-3.2, hh:-0.5, h:-1.2, l:-5.5, ll:-6.0,
 install:'引风机出口风道', faultPv:-0.8},
{tag:'FT-204', equip:'P-204', type:'F', name:'窑尾烟气流量', range:'0~90000 m³/h', unit:'m³/h',
 signal:'4~20mA+HART', acc:'±1.5%', pv:68000, h:82000, l:42000, install:'引风机入口风道'},
{tag:'TI-204A', equip:'P-204', type:'T', name:'引风机轴承温度(驱动端)', range:'0~120 ℃', unit:'℃',
 signal:'Pt100', acc:'±1.0%', pv:52, hh:95, h:80, install:'风机轴承座', faultPv:88},
{tag:'II-204', equip:'P-204', type:'I', name:'引风机电机电流', range:'0~250 A', unit:'A',
 signal:'4~20mA', acc:'±1.0%', pv:168, hh:230, h:210, l:60, install:'配电所 10kV 柜'},
{tag:'VI-204', equip:'P-204', type:'V', name:'引风机振动', range:'0~20 mm/s', unit:'mm/s',
 signal:'4~20mA', acc:'±2.0%', pv:2.6, hh:11.0, h:7.1, install:'风机轴承座垂直方向'},
// M-205 熟料湿式球磨机
{tag:'II-205', equip:'M-205', type:'I', name:'球磨机电机电流', range:'0~300 A', unit:'A',
 signal:'4~20mA', acc:'±1.0%', pv:186, hh:270, h:250, l:70, install:'配电所低压柜'},
{tag:'TI-205A', equip:'M-205', type:'T', name:'主轴承温度(进料端)', range:'0~100 ℃', unit:'℃',
 signal:'Pt100', acc:'±1.0%', pv:48, hh:75, h:65, install:'进料端主轴承瓦背'},
{tag:'TI-205B', equip:'M-205', type:'T', name:'主轴承温度(出料端)', range:'0~100 ℃', unit:'℃',
 signal:'Pt100', acc:'±1.0%', pv:50, hh:75, h:65, install:'出料端主轴承瓦背'},
{tag:'SI-205', equip:'M-205', type:'S', name:'筒体转速', range:'0~30 r/min', unit:'r/min',
 signal:'4~20mA', acc:'±0.5%', pv:21.5, h:24.0, l:18.0, install:'筒体端部测速齿轮'},
{tag:'FI-205', equip:'M-205', type:'F', name:'磨矿给水流量', range:'0~40 m³/h', unit:'m³/h',
 signal:'4~20mA', acc:'±1.0%', pv:16.5, h:32, l:8, install:'给水管道'},
// R-305 除杂反应槽
{tag:'AT-305', equip:'R-305', type:'A', name:'除杂反应 pH', range:'0~14 pH', unit:'pH',
 signal:'4~20mA+HART', acc:'±0.05pH', pv:9.2, hh:10.5, h:10.0, l:8.6, ll:8.2,
 install:'槽体侧壁浸没式', faultPv:8.2},
{tag:'TI-305', equip:'R-305', type:'T', name:'除杂反应温度', range:'0~100 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.5%', pv:60, hh:85, h:75, l:45, install:'槽体下部'},
{tag:'LT-305', equip:'R-305', type:'L', name:'除杂槽液位', range:'0~5.5 m', unit:'m',
 signal:'4~20mA', acc:'±0.5%', pv:4.1, hh:5.2, h:4.9, l:1.2, ll:0.8, install:'槽顶雷达液位计'},
{tag:'II-305', equip:'R-305', type:'I', name:'除杂搅拌电机电流', range:'0~80 A', unit:'A',
 signal:'4~20mA', acc:'±1.0%', pv:42, hh:70, h:62, l:15, install:'现场操作柱'},
{tag:'FT-305', equip:'R-305', type:'F', name:'除杂剂(MgSO4)加入流量', range:'0~2 m³/h', unit:'m³/h',
 signal:'4~20mA', acc:'±1.0%', pv:0.62, h:1.6, l:0.15, install:'加药计量泵出口'},
// F-305 除杂渣压滤机
{tag:'PI-305', equip:'F-305', type:'P', name:'压滤机进料压力', range:'0~1.6 MPa', unit:'MPa',
 signal:'4~20mA', acc:'±0.5%', pv:0.60, hh:1.20, h:0.95, l:0.20,
 install:'进料总管', faultPv:1.28},
{tag:'FI-305', equip:'F-305', type:'F', name:'滤液流量', range:'0~60 m³/h', unit:'m³/h',
 signal:'4~20mA', acc:'±1.5%', pv:24.5, h:52, l:5, install:'滤液汇集管'},
{tag:'WI-305', equip:'F-305', type:'W', name:'滤饼称重', range:'0~5 t', unit:'t',
 signal:'4~20mA', acc:'±1.0%', pv:1.8, h:4.2, install:'滤饼输送皮带秤'},
// E-504 三效蒸发结晶
{tag:'TI-504A', equip:'E-504', type:'T', name:'一效蒸发温度', range:'0~150 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.5%', pv:108, hh:135, h:125, l:85, install:'一效分离室'},
{tag:'TI-504B', equip:'E-504', type:'T', name:'二效蒸发温度', range:'0~150 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.5%', pv:92, hh:120, h:110, l:70, install:'二效分离室'},
{tag:'TI-504C', equip:'E-504', type:'T', name:'三效蒸发温度', range:'0~150 ℃', unit:'℃',
 signal:'Pt100', acc:'±0.5%', pv:74, hh:105, h:96, l:55, install:'三效分离室'},
{tag:'PI-504', equip:'E-504', type:'P', name:'末效真空度', range:'-100~0 kPa', unit:'kPa',
 signal:'4~20mA', acc:'±0.5%', pv:-82, hh:-60, h:-70, l:-94, install:'真空泵入口'},
{tag:'LT-504', equip:'E-504', type:'L', name:'结晶器液位', range:'0~3 m', unit:'m',
 signal:'差压式', acc:'±1.0%', pv:1.6, hh:2.7, h:2.4, l:0.6, install:'结晶器侧壁'},
{tag:'AI-504', equip:'E-504', type:'A', name:'母液 Na2SO4 浓度', range:'0~40 %', unit:'%',
 signal:'4~20mA+HART', acc:'±1.0%', pv:26.5, h:36, l:12, install:'三效出料管'},

];

// ============================================================
//  二、自动控制系统 — 控制回路（DCS 实现）
//  字段: tag回路位号 name名称 equip type控制类型
//        pvTag测量点 mvTag执行机构(阀/变频)
//        sp设定值 pv测量值 mv阀位/输出%
//        mode自动/手动 pid参数
// ============================================================
var CONTROL_LOOPS = [
{tag:'TRC-202', name:'焙烧窑温度串级控制', equip:'K-202', type:'串级',
 pvTag:'TT-202', pvName:'窑尾温度', mvTag:'TV-202', mvName:'燃气调节阀',
 sp:950, pv:950, mv:62, unit:'℃', mode:'自动',
 pid:{Kp:1.8, Ti:120, Td:0}, sub:{pvTag:'FI-202', pvName:'燃气流量', sp:265, pv:265},
 note:'主环控温 → 副环控燃气流量，抗燃气压力波动'},

{tag:'FRC-101', name:'原料给料量控制', equip:'V-101', type:'单回路PID',
 pvTag:'WI-101', pvName:'皮带秤给料量', mvTag:'SC-101', mvName:'皮带机变频器',
 sp:1.2, pv:1.2, mv:55, unit:'t/h', mode:'自动', pid:{Kp:2.5, Ti:30, Td:0},
 note:'给料量直接影响焙烧产能'},

{tag:'TRC-301', name:'浸出温度控制', equip:'R-301', type:'单回路PID',
 pvTag:'TE-301', pvName:'浸出温度', mvTag:'TV-301', mvName:'蒸汽加热阀',
 sp:70, pv:70, mv:48, unit:'℃', mode:'自动', pid:{Kp:2.0, Ti:180, Td:0},
 note:'蒸汽盘管加热，保障浸出率'},

{tag:'LRC-301', name:'浸出槽液位控制', equip:'R-301', type:'单回路PID',
 pvTag:'LT-301', pvName:'浸出槽液位', mvTag:'LV-301', mvName:'进料调节阀',
 sp:3.1, pv:3.1, mv:52, unit:'m', mode:'自动', pid:{Kp:1.5, Ti:90, Td:0}},

{tag:'FFC-401', name:'萃取相比比值控制', equip:'E-401', type:'比值控制',
 pvTag:'AI-401', pvName:'相比 O/A', mvTag:'FV-402', mvName:'有机相流量阀',
 sp:1.00, pv:1.00, mv:50, unit:'—', mode:'自动', pid:{Kp:3.0, Ti:60, Td:0},
 note:'主流量 FT-401(料液)，从流量 FT-402(萃取剂)按比值跟随'},
 
{tag:'ARC-501', name:'沉钒pH控制', equip:'P-501', type:'单回路PID',
 pvTag:'AT-501', pvName:'沉钒pH', mvTag:'AV-501', mvName:'铵盐加入阀',
 sp:2.20, pv:2.20, mv:42, unit:'pH', mode:'自动', pid:{Kp:4.0, Ti:45, Td:0},
 note:'pH对沉钒率极敏感，需小比例度大积分'},

{tag:'PRC-303', name:'压滤机压力控制', equip:'P-303', type:'单回路PID',
 pvTag:'PT-303', pvName:'压滤压力', mvTag:'SC-303', mvName:'进料泵变频',
 sp:0.40, pv:0.40, mv:58, unit:'MPa', mode:'自动', pid:{Kp:2.2, Ti:40, Td:0}},

{tag:'LRC-305', name:'浓密机泥位控制', equip:'T-303', type:'单回路PID',
 pvTag:'LI-305', pvName:'泥位(泥水界面)', mvTag:'SC-305', mvName:'底流泵变频',
 sp:1.15, pv:1.15, mv:52, unit:'m', mode:'自动', pid:{Kp:1.6, Ti:150, Td:0},
 note:'泥位高→底流泵提速加大排泥；CCD洗涤的关键回路'},

{tag:'FFC-306', name:'絮凝剂比值加药控制', equip:'T-303', type:'比值控制',
 pvTag:'FI-306', pvName:'絮凝剂流量', mvTag:'FV-306', mvName:'加药计量泵',
 sp:0.45, pv:0.45, mv:45, unit:'m³/h', mode:'自动', pid:{Kp:2.0, Ti:30, Td:0},
 note:'主流量为浸出矿浆量，按 30 g/t 干矿比例投加，加速沉降'},

{tag:'TRC-601', name:'煅烧炉温度分程控制', equip:'K-601', type:'分程控制',
 pvTag:'TE-601B', pvName:'炉膛二区温度', mvTag:'TV-601', mvName:'燃气调节阀',
 sp:550, pv:550, mv:55, unit:'℃', mode:'自动', pid:{Kp:2.0, Ti:150, Td:0},
 note:'三区温度加权均值参与控制'},

{tag:'LRC-808', name:'锅炉汽包水位三冲量控制', equip:'B-808', type:'三冲量(串级+前馈)',
 pvTag:'LT-808', pvName:'汽包水位', mvTag:'LV-808', mvName:'给水调节阀',
 sp:0, pv:0, mv:50, unit:'mm', mode:'自动', pid:{Kp:3.5, Ti:60, Td:0},
 note:'水位主环 + 蒸汽流量前馈 + 给水流量副环，克服虚假水位'},

{tag:'PRC-807', name:'空压机排气压力控制', equip:'A-807', type:'单回路PID',
 pvTag:'PT-807', pvName:'储气罐压力', mvTag:'SC-807', mvName:'空压机加载/卸载',
 sp:0.80, pv:0.80, mv:60, unit:'MPa', mode:'自动', pid:{Kp:2.0, Ti:50, Td:0}},

{tag:'ARC-701', name:'洗涤塔pH控制', equip:'A-701', type:'单回路PID',
 pvTag:'AT-701', pvName:'洗涤液pH', mvTag:'AV-701', mvName:'加碱阀',
 sp:8.5, pv:8.5, mv:45, unit:'pH', mode:'自动', pid:{Kp:3.5, Ti:50, Td:0},
 note:'pH失控直接导致SO₂超标'},

{tag:'PRC-202', name:'窑尾负压控制', equip:'K-202', type:'单回路PID',
 pvTag:'PI-202', pvName:'窑尾负压', mvTag:'SV-203', mvName:'引风机变频器',
 sp:-120, pv:-120, mv:60, unit:'Pa', mode:'自动', pid:{Kp:1.2, Ti:80, Td:0}},

{tag:'PRC-204', name:'窑尾负压控制', equip:'P-204', type:'单回路PID',
 pvTag:'PT-204', pvName:'窑尾负压', mvTag:'SC-204', mvName:'引风机变频器',
 sp:-3.0, pv:-3.2, mv:58, unit:'kPa', mode:'自动', pid:{Kp:1.2, Ti:60, Td:0},
 note:'负压过低窑头返火、过高漏风增大，是焙烧系统最关键的控制回路'},

{tag:'ARC-305', name:'除杂反应 pH 控制', equip:'R-305', type:'单回路PID',
 pvTag:'AT-305', pvName:'除杂反应 pH', mvTag:'FV-305', mvName:'除杂剂计量泵变频',
 sp:9.2, pv:9.2, mv:52, unit:'pH', mode:'自动', pid:{Kp:3.0, Ti:150, Td:0},
 note:'pH 决定硅/磷沉淀完全程度，pH 偏低除杂不合格'},

{tag:'LRC-504', name:'结晶器液位控制', equip:'E-504', type:'单回路PID',
 pvTag:'LT-504', pvName:'结晶器液位', mvTag:'LV-504', mvName:'出料调节阀',
 sp:1.6, pv:1.6, mv:46, unit:'m', mode:'自动', pid:{Kp:1.8, Ti:120, Td:0}},

];

// ============================================================
//  三、安全仪表系统 SIS（独立于 DCS，依据 IEC 61511 / GB 50770）
//  字段: tag name equip sil等级 sensor传感器冗余 logic逻辑(1oo1/1oo2/2oo3)
//        trip触发条件 action联锁动作 valve执行机构
//        faultTag关联的故障剧本设备位号
// ============================================================
var INTERLOCKS = [
{tag:'SIS-202A', name:'焙烧窑超温联锁', equip:'K-202', sil:2,
 sensor:'TE-202A / TE-202B', logic:'1oo2',
 trip:'窑尾温度 ≥ 1080 ℃', action:'切断燃气切断阀 XV-202，停窑主电机，声光报警',
 valve:'XV-202（气开型FC，失气关）', faultTag:'K-202', faultName:'焙烧超温',
 note:'超温将导致耐火衬剥落、窑体变形'},

{tag:'SIS-202B', name:'窑头燃气压力低低联锁', equip:'K-202', sil:2,
 sensor:'PT-202（PSLL）', logic:'1oo1',
 trip:'燃气压力 ≤ 8 kPa', action:'熄火保护：切断 XV-202，禁止重新点火，吹扫',
 valve:'XV-202', faultTag:'K-202',
 note:'压力过低易回火闪爆'},

{tag:'SIS-202C', name:'窑头火焰丧失联锁', equip:'K-202', sil:2,
 sensor:'BS-202 火焰检测器', logic:'1oo1',
 trip:'火焰信号消失 ≥ 3 s', action:'切断 XV-202，燃气总管放散，强制通风吹扫',
 valve:'XV-202', faultTag:'K-202',
 note:'熄火后未切断燃气将积聚爆炸性混合物'},

{tag:'SIS-202D', name:'窑头燃气泄漏联锁', equip:'K-202', sil:2,
 sensor:'GT-202 可燃气体探测器', logic:'1oo1',
 trip:'燃气浓度 ≥ 25 %LEL', action:'切断燃气总阀 XV-201，启动事故风机，声光报警',
 valve:'XV-201（燃气总管）', faultTag:'K-202'},

{tag:'SIS-303A', name:'压滤机超压联锁', equip:'P-303', sil:1,
 sensor:'PT-303（PSHH）', logic:'1oo1',
 trip:'压滤压力 ≥ 0.60 MPa', action:'停进料泵，开启泄压阀，禁止继续加压',
 valve:'XV-303（泄压）', faultTag:'P-303', faultName:'压滤机滤布堵塞',
 note:'滤板爆板风险'},

{tag:'SIS-305A', name:'浓密机耙架过扭矩联锁', equip:'T-303', sil:2,
 sensor:'ST-305 扭矩传感器', logic:'1oo2',
 trip:'耙架扭矩 ≥ 70 % 额定', action:'耙架自动提升，加大底流泵频率排泥，声光报警',
 valve:'XV-305（底流排放）', faultTag:'T-303', faultName:'浓密机跑浑',
 note:'过扭矩继续运转将压耙、烧毁驱动减速机'},

{tag:'SIS-305B', name:'浓密机泥位高高联锁', equip:'T-303', sil:1,
 sensor:'LI-305 超声波泥位计', logic:'1oo1',
 trip:'泥位 ≥ 2.40 m', action:'底流泵切至工频满负荷，絮凝剂加药量加倍，停进料',
 valve:'XV-305', faultTag:'T-303', faultName:'浓密机跑浑',
 note:'泥位过高导致溢流跑浑，钒随溢流损失'},

{tag:'SIS-401A', name:'萃取界面破乳联锁', equip:'E-401', sil:1,
 sensor:'LT-401 界面计', logic:'1oo1',
 trip:'相界面 ≤ 0.60 m 或 ≥ 2.40 m', action:'停两相进料泵，切换至备用澄清槽，报警',
 valve:'XV-401 / XV-402', faultTag:'E-401', faultName:'萃取相比失调',
 note:'界面破乳导致有机相夹带损失'},

{tag:'SIS-501A', name:'沉钒pH失控联锁', equip:'P-501', sil:1,
 sensor:'AT-501 pH计', logic:'1oo1',
 trip:'pH ≥ 3.50 或 ≤ 1.20', action:'切断铵盐加入阀 XV-501，停止搅拌，转事故槽',
 valve:'XV-501', faultTag:'P-501', faultName:'沉钒pH失控',
 note:'pH失控沉钒率骤降至70%以下'},

{tag:'SIS-601A', name:'煅烧炉超温联锁', equip:'K-601', sil:2,
 sensor:'TE-601A / TE-601B / TE-601C', logic:'2oo3',
 trip:'任意两区温度 ≥ 620 ℃', action:'切断燃气 XV-601，停推板，启动冷却风机',
 valve:'XV-601', faultTag:'K-601', faultName:'煅烧推板卡',
 note:'2oo3 兼顾安全性与可用性'},

{tag:'SIS-601B', name:'推板停滞联锁', equip:'K-601', sil:1,
 sensor:'SI-601 推板速度', logic:'1oo1',
 trip:'推板速度 = 0 持续 ≥ 60 s', action:'切断燃气 XV-601，报警提示推板卡阻',
 valve:'XV-601', faultTag:'K-601'},

{tag:'SIS-701A', name:'洗涤塔pH失控联锁', equip:'A-701', sil:1,
 sensor:'AT-701 pH计 / AE-701 SO₂', logic:'1oo2',
 trip:'pH ≤ 6.00 或 SO₂ ≥ 800 mg/m³', action:'加大加碱阀开度至100%，报警；持续超标则降负荷',
 valve:'AV-701 / XV-701', faultTag:'A-701', faultName:'洗涤塔pH失控',
 note:'环保超标排放，触发环保联锁'},

{tag:'SIS-808A', name:'锅炉水位低低联锁(MFT)', equip:'B-808', sil:3,
 sensor:'LT-808 水位（三取二）', logic:'2oo3',
 trip:'汽包水位 ≤ -150 mm', action:'主燃料跳闸 MFT：切断燃烧器，停给水泵，紧急停炉',
 valve:'XV-808（燃气）', faultTag:'B-808',
 note:'干烧将造成爆管，SIL3 最高等级'},

{tag:'SIS-808B', name:'锅炉压力高高联锁', equip:'B-808', sil:2,
 sensor:'PT-808（PSHH）', logic:'1oo2',
 trip:'蒸汽压力 ≥ 0.85 MPa', action:'切断燃烧器，安全阀 PSV-808 起跳泄压',
 valve:'XV-808 + PSV-808', faultTag:'B-808'},

{tag:'SIS-808C', name:'锅炉熄火联锁', equip:'B-808', sil:2,
 sensor:'BS-808 火焰检测 / GT-808', logic:'1oo2',
 trip:'火焰丧失 或 燃气 ≥ 25 %LEL', action:'MFT：切断燃气 XV-808，通风吹扫',
 valve:'XV-808', faultTag:'B-808'},

{tag:'SIS-204', equip:'P-204', name:'引风机跳车联锁（窑尾正压保护）',
 cause:'引风机电机故障停机 / 轴承温度 >95℃ / 振动 >11mm/s',
 action:'停回转窑主传动 + 切断燃气电磁阀 + 打开窑头冷风阀 + 声光报警',
 sensor:'PT-204 / TI-204A / VI-204 / 电机综保',
 valve:'XV-202(燃气切断阀)', sil:'SIL2', pv:1,
 note:'防止窑内正压导致窑头返火伤人'},

{tag:'SIS-305', equip:'R-305', name:'除杂槽搅拌停机联锁',
 cause:'搅拌电机电流 >70A 或 <15A（过载/断轴）',
 action:'停搅拌并报警，禁止继续加药',
 sensor:'II-305', valve:'FV-305', sil:'SIL1', pv:1},

];

// ============================================================
//  四、机械保护装置（独立于仪表系统的最后一道防线）
// ============================================================
var PSV_LIST = [
{tag:'PSV-808', equip:'B-808', type:'安全阀', set:'0.80 MPa', name:'锅炉汽包安全阀',
 note:'SIS之上最后一道机械保护，超压起跳泄压'},
{tag:'PSV-303', equip:'P-303', type:'安全阀', set:'0.65 MPa', name:'压滤机进料安全阀',
 note:'防止滤板超压爆板'},
{tag:'PSV-807', equip:'A-807', type:'安全阀', set:'1.00 MPa', name:'储气罐安全阀',
 note:'空压机系统超压保护'},
{tag:'PSV-704', equip:'C-704', type:'爆破片', set:'0.30 MPa', name:'循环水系统爆破片'},
{tag:'PSV-601', equip:'K-601', type:'安全阀', set:'0.10 MPa', name:'煅烧炉燃气总管安全阀'},
];

// ============================================================
//  DCS 系统配置信息
// ============================================================
var DCS_INFO = {
  system:'DCS 集散控制系统（C-806 中控室）',
  ioTotal: INSTRUMENTS.length,
  ai: 0, ao: 0, di: 0, do_: 0,
  loops: CONTROL_LOOPS.length,
  sisLoops: INTERLOCKS.length,
  note:'AI 模拟量输入 / AO 模拟量输出 / DI 开关量输入 / DO 开关量输出'
};

// 统计函数
(function statIO(){
  var ai=0, ao=0, di=0, do_=0;
  INSTRUMENTS.forEach(function(m){
    var s = m.signal || '';
    if (s.indexOf('开关量') >= 0 || s.indexOf('干接点') >= 0) di++;
    else ai++;
  });
  CONTROL_LOOPS.forEach(function(){ ao++; });
  INTERLOCKS.forEach(function(){ do_++; });
  DCS_INFO.ai = ai; DCS_INFO.ao = ao; DCS_INFO.di = di; DCS_INFO.do_ = do_;
})();

console.log('[仪表系统] 检测仪表:', INSTRUMENTS.length,
            '| 控制回路:', CONTROL_LOOPS.length,
            '| SIS联锁:', INTERLOCKS.length,
            '| 机械保护:', PSV_LIST.length);
console.log('[DCS I/O] AI:', DCS_INFO.ai, 'AO:', DCS_INFO.ao,
            'DI:', DCS_INFO.di, 'DO:', DCS_INFO.do_);
