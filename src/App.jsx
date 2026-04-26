import { useState, useReducer, useMemo } from "react";

/* ═══ CONFIG ═══ */
const biz={name:"Amapola",slogan:"Come bien, viví bien",currency:"ARS",locale:"es-AR",
  payMethods:[{id:"efectivo",label:"Efectivo"},{id:"debito",label:"Débito"},{id:"credito",label:"Crédito"},{id:"transferencia",label:"Transferencia"}],
  reportPin:"1234"
};
const DEF_CATS=["Frutos Secos","Semillas","Harinas","Cereales","Legumbres","Especias","Suplementos","Snacks","Aceites","Otros"];
const UT={
  weight:{label:"Por peso (granel)",units:["kg","g","100g"],def:"kg",step:0.01,min:0.01,ph:"kg",fs:v=>Number(v).toFixed(2)},
  unit:{label:"Por unidad",units:["unidad","paquete","botella","frasco","bolsa"],def:"unidad",step:0.01,min:0.01,ph:"cant",fs:v=>Number(v).toFixed(2)},
};

/* ═══ DATA ═══ */
const SP=[
  {id:1,name:"Almendras",category:"Frutos Secos",type:"weight",unit:"kg",costPrice:8500,salePrice:17000,stock:15.5,minStock:5,supplier:"NutriGranel",lots:[{lot:"L-2026-001",expiry:"2026-09-15",qty:15.5}]},
  {id:2,name:"Semillas de Chía",category:"Semillas",type:"weight",unit:"kg",costPrice:4200,salePrice:8400,stock:8.2,minStock:3,supplier:"SemillasOK",lots:[{lot:"CH-001",expiry:"2026-12-01",qty:8.2}]},
  {id:3,name:"Harina de Almendras",category:"Harinas",type:"weight",unit:"kg",costPrice:12000,salePrice:24000,stock:4.0,minStock:2,supplier:"NutriGranel",lots:[{lot:"HA-050",expiry:"2026-06-20",qty:4.0}]},
  {id:4,name:"Levadura Nutricional",category:"Suplementos",type:"unit",unit:"frasco",costPrice:3500,salePrice:7000,stock:20,minStock:8,supplier:"VidaSana",lots:[{lot:"LN-100",expiry:"2027-03-01",qty:20}]},
  {id:5,name:"Aceite de Coco",category:"Aceites",type:"unit",unit:"botella",costPrice:4800,salePrice:9600,stock:12,minStock:5,supplier:"VidaSana",lots:[{lot:"AC-200",expiry:"2026-05-10",qty:12}]},
  {id:6,name:"Granola Artesanal",category:"Cereales",type:"weight",unit:"kg",costPrice:3800,salePrice:7600,stock:6.5,minStock:3,supplier:"GranolaBA",lots:[{lot:"GA-010",expiry:"2026-07-30",qty:6.5}]},
  {id:7,name:"Mix de Frutos Secos",category:"Frutos Secos",type:"weight",unit:"kg",costPrice:7200,salePrice:14400,stock:10.0,minStock:4,supplier:"NutriGranel",lots:[{lot:"MF-005",expiry:"2026-08-15",qty:10.0}]},
  {id:8,name:"Pasta de Maní",category:"Snacks",type:"unit",unit:"frasco",costPrice:2800,salePrice:5600,stock:18,minStock:6,supplier:"GranolaBA",lots:[{lot:"PM-030",expiry:"2026-11-20",qty:18}]},
];
const SS=[
  {id:1,date:"2026-04-12T10:30:00",items:[{productId:1,name:"Almendras",qty:0.5,unit:"kg",unitPrice:17000,total:8500,costPrice:8500},{productId:4,name:"Levadura Nutricional",qty:2,unit:"frasco",unitPrice:7000,total:14000,costPrice:3500}],total:22500,payMethod:"efectivo"},
  {id:2,date:"2026-04-12T14:15:00",items:[{productId:6,name:"Granola Artesanal",qty:0.3,unit:"kg",unitPrice:7600,total:2280,costPrice:3800}],total:2280,payMethod:"transferencia"},
  {id:3,date:"2026-04-11T09:45:00",items:[{productId:5,name:"Aceite de Coco",qty:1,unit:"botella",unitPrice:9600,total:9600,costPrice:4800},{productId:2,name:"Semillas de Chía",qty:0.25,unit:"kg",unitPrice:8400,total:2100,costPrice:4200}],total:11700,payMethod:"debito"},
  {id:4,date:"2026-04-11T16:00:00",items:[{productId:8,name:"Pasta de Maní",qty:3,unit:"frasco",unitPrice:5600,total:16800,costPrice:2800}],total:16800,payMethod:"efectivo"},
  {id:5,date:"2026-04-10T11:20:00",items:[{productId:7,name:"Mix de Frutos Secos",qty:1,unit:"kg",unitPrice:14400,total:14400,costPrice:7200},{productId:3,name:"Harina de Almendras",qty:0.5,unit:"kg",unitPrice:24000,total:12000,costPrice:12000}],total:26400,payMethod:"credito"},
];
const SPO=[
  {id:1,date:"2026-04-05T09:00:00",supplier:"NutriGranel",items:[{productId:1,name:"Almendras",qty:10,unit:"kg",unitCost:8500,total:85000,lot:"L-2026-001",expiry:"2026-09-15"}],total:85000},
  {id:2,date:"2026-04-06T11:00:00",supplier:"VidaSana",items:[{productId:5,name:"Aceite de Coco",qty:6,unit:"botella",unitCost:4800,total:28800,lot:"AC-200",expiry:"2026-05-10"}],total:28800},
];

/* ═══ HELPERS ═══ */
const fmt=n=>new Intl.NumberFormat(biz.locale,{style:"currency",currency:biz.currency,minimumFractionDigits:0}).format(n);
const fD=d=>new Date(d).toLocaleDateString(biz.locale,{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"});
const fDs=d=>new Date(d).toLocaleDateString(biz.locale,{day:"2-digit",month:"2-digit",year:"2-digit"});
const gId=()=>Date.now()+Math.floor(Math.random()*1000);
const fS=p=>UT[p.type]?.fs(p.stock)??String(p.stock);
// FIX: margin based on COST, not sale price. margin = (sale-cost)/cost*100
const calcMarginDisplay=(c,s)=>c>0?Math.round((s-c)/c*100):0;
const calcSaleFromMargin=(cost,margin)=>Math.round(cost*(1+margin/100));
function exCSV(fn,hd,rows){const B="\uFEFF";const csv=B+[hd.join(";"),...rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(";"))].join("\n");const b=new Blob([csv],{type:"text/csv;charset=utf-8;"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=fn;a.click();URL.revokeObjectURL(u);}
function daysUntil(ds){return Math.ceil((new Date(ds)-new Date())/(864e5));}
function getMonth(ds){const d=new Date(ds);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}
function monthLabel(ym){const[y,m]=ym.split("-");const ms=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];return`${ms[Number(m)-1]} ${y}`;}
const curMonth=getMonth(new Date().toISOString());
// Smart number input: handles 0-prefix
function numVal(v){const s=String(v);if(s==="")return"";return parseFloat(s);}

/* ═══ REDUCER ═══ */
function reducer(st,a){
  switch(a.type){
    case "ADD_PRODUCT":return{...st,products:[...st.products,{...a.payload,id:gId()}]};
    case "UPDATE_PRODUCT":{
      const old=st.products.find(p=>p.id===a.payload.id);
      const diff=old?(old.stock-a.payload.stock):0;
      let adj=[...st.stockAdjustments];
      if(diff!==0)adj.push({id:gId(),date:new Date().toISOString(),productId:a.payload.id,productName:a.payload.name,prevStock:old.stock,newStock:a.payload.stock,diff,costPrice:a.payload.costPrice});
      return{...st,products:st.products.map(p=>p.id===a.payload.id?a.payload:p),stockAdjustments:adj};
    }
    case "DELETE_PRODUCT":return{...st,products:st.products.filter(p=>p.id!==a.payload)};
    case "ADD_SALE":{const s=a.payload;const up=st.products.map(p=>{const i=s.items.find(x=>x.productId===p.id);return i?{...p,stock:Math.max(0,p.stock-i.qty)}:p;});return{...st,sales:[s,...st.sales],products:up};}
    case "DELETE_SALE":{const s=st.sales.find(x=>x.id===a.payload);if(!s)return st;const r=st.products.map(p=>{const i=s.items.find(x=>x.productId===p.id);return i?{...p,stock:p.stock+i.qty}:p;});return{...st,sales:st.sales.filter(x=>x.id!==a.payload),products:r};}
    case "ADD_PURCHASE":{
      const po=a.payload;
      const up=st.products.map(p=>{const item=po.items.find(i=>i.productId===p.id);if(!item)return p;return{...p,stock:p.stock+item.qty,lots:[...(p.lots||[]),{lot:item.lot,expiry:item.expiry,qty:item.qty}]};});
      return{...st,products:up,purchases:[po,...st.purchases]};
    }
    case "UPDATE_PURCHASE":{
      const po=a.payload;
      // Revert old purchase stock, apply new
      const oldPo=st.purchases.find(p=>p.id===po.id);
      let prods=[...st.products];
      if(oldPo){prods=prods.map(p=>{const oi=oldPo.items.find(i=>i.productId===p.id);if(!oi)return p;const lots=(p.lots||[]).filter(l=>!(l.lot===oi.lot&&l.qty===oi.qty));return{...p,stock:Math.max(0,p.stock-oi.qty),lots};});}
      prods=prods.map(p=>{const ni=po.items.find(i=>i.productId===p.id);if(!ni)return p;return{...p,stock:p.stock+ni.qty,lots:[...(p.lots||[]),{lot:ni.lot,expiry:ni.expiry,qty:ni.qty}]};});
      return{...st,products:prods,purchases:st.purchases.map(p=>p.id===po.id?po:p)};
    }
    default:return st;
  }
}

/* ═══ ICONS ═══ */
function Ic({name,size=20,color="currentColor"}){
  const s={width:size,height:size,display:"inline-block",verticalAlign:"middle"};
  const p={fill:"none",stroke:color,strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};
  const m={
    package:<svg style={s} viewBox="0 0 24 24" {...p}><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    cart:<svg style={s} viewBox="0 0 24 24" {...p}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
    chart:<svg style={s} viewBox="0 0 24 24" {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    plus:<svg style={s} viewBox="0 0 24 24" {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash:<svg style={s} viewBox="0 0 24 24" {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    edit:<svg style={s} viewBox="0 0 24 24" {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    alert:<svg style={s} viewBox="0 0 24 24" {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    search:<svg style={s} viewBox="0 0 24 24" {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    x:<svg style={s} viewBox="0 0 24 24" {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    check:<svg style={s} viewBox="0 0 24 24" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
    download:<svg style={s} viewBox="0 0 24 24" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    leaf:<svg style={s} viewBox="0 0 24 24" {...p}><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
    settings:<svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    truck:<svg style={s} viewBox="0 0 24 24" {...p}><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    clock:<svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    lock:<svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    eye:<svg style={s} viewBox="0 0 24 24" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    chevDown:<svg style={s} viewBox="0 0 24 24" {...p}><polyline points="6 9 12 15 18 9"/></svg>,
    chevUp:<svg style={s} viewBox="0 0 24 24" {...p}><polyline points="18 15 12 9 6 15"/></svg>,
    sort:<svg style={s} viewBox="0 0 24 24" {...p}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  };
  return m[name]||null;
}

/* ═══ CSS ═══ */
const CSS=`
:root{--bg:#faf8f4;--card:#fff;--inp:#f5f2ec;--brd:#e8e2d8;--brdL:#f0ebe3;--g:#5a8f3c;--gL:#6ba348;--gBg:#eaf4e2;--gD:#3d6628;--ac:#c4a35a;--acBg:#fdf6e8;--tx:#2c2c2c;--txM:#6b6356;--txL:#9e9589;--dg:#c4603a;--dgBg:#fdf0ea;--info:#5a7abf;--infoBg:#eef2fa;--wd:#b8956a;--r:10px;--rL:16px;--sh:0 1px 3px rgba(0,0,0,.04);--shM:0 4px 16px rgba(90,143,60,.12)}
*{box-sizing:border-box;margin:0;padding:0}
.inp{width:100%;padding:10px 14px;background:var(--inp);border:1px solid var(--brd);border-radius:var(--r);color:var(--tx);font-size:14px;font-family:'Nunito',sans-serif;outline:none;transition:border-color .2s}.inp:focus{border-color:var(--g)}
.card{background:var(--card);border:1px solid var(--brdL);border-radius:var(--rL);padding:20px;box-shadow:var(--sh)}
.badge{font-size:11px;padding:3px 10px;border-radius:20px;font-weight:700;text-transform:capitalize}
.badge-g{background:var(--gBg);color:var(--g)}.badge-a{background:var(--acBg);color:var(--ac)}.badge-d{background:var(--dgBg);color:var(--dg)}.badge-i{background:var(--infoBg);color:var(--info)}
.hdr{padding:14px 24px;background:var(--card);border-bottom:1px solid var(--brd);display:flex;justify-content:space-between;align-items:center;box-shadow:var(--sh);flex-wrap:wrap;gap:10px}
.brand{display:flex;align-items:center;gap:14px}
.logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--g),var(--gD));display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(90,143,60,.3)}
.sname{margin:0;font-size:24px;line-height:1.1;font-family:'Playfair Display',Georgia,serif;color:var(--gD)}
.slogan{font-size:11px;color:var(--txL);letter-spacing:2px;text-transform:uppercase;font-weight:700}
.sbtn{background:none;border:none;color:var(--txL);cursor:pointer;padding:2px;opacity:.4;transition:opacity .2s}.sbtn:hover{opacity:1}
.nav{display:flex;gap:6px;flex-wrap:wrap}
.nb{display:flex;align-items:center;gap:6px;padding:8px 16px;border:1.5px solid transparent;border-radius:12px;cursor:pointer;font-family:'Nunito',sans-serif;font-size:13px;font-weight:500;transition:all .2s;position:relative;background:transparent;color:var(--txM)}
.nb.act{background:var(--gBg);border-color:var(--g);color:var(--gD);font-weight:700}
.nba{position:absolute;top:-4px;right:-4px;background:var(--dg);color:#fff;font-size:10px;font-weight:800;border-radius:10px;padding:2px 7px}
.btnP{padding:10px 22px;background:linear-gradient(135deg,var(--g),var(--gD));border:none;border-radius:var(--r);color:#fff;cursor:pointer;font-size:14px;font-weight:700;font-family:'Nunito',sans-serif;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(90,143,60,.25)}
.btnO{padding:10px 20px;background:transparent;border:1px solid var(--brd);border-radius:var(--r);color:var(--txM);cursor:pointer;font-family:'Nunito',sans-serif}
.btnOG{padding:10px 22px;background:var(--card);border:1.5px solid var(--g);border-radius:var(--r);color:var(--g);cursor:pointer;font-size:13px;font-weight:700;font-family:'Nunito',sans-serif;display:inline-flex;align-items:center;gap:6px}
.posL{display:grid;grid-template-columns:1fr 340px;gap:20px;height:calc(100vh - 180px);min-height:400px}
.posP{overflow:hidden;display:flex;flex-direction:column}
.pgrid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;align-content:start}
.pc{background:var(--card);border:1px solid var(--brdL);border-radius:var(--rL);padding:14px;box-shadow:var(--sh);border-left:4px solid var(--g);transition:all .2s}
.pc:hover{box-shadow:var(--shM);transform:translateY(-1px)}.pc.low{border-left-color:var(--dg)}
.mOv{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
.mBk{position:absolute;inset:0;background:rgba(44,44,44,.4);backdrop-filter:blur(6px)}
.mCt{position:relative;background:var(--card);border:1px solid var(--brd);border-radius:20px;width:100%;max-width:640px;max-height:85vh;overflow:auto;padding:28px;box-shadow:0 24px 48px rgba(0,0,0,.12)}
.mHd{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.mTi{margin:0;font-size:20px;color:var(--gD);font-family:'Playfair Display',Georgia,serif}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fful{grid-column:1/-1}
.flab{display:block;margin-bottom:5px;font-size:12px;color:var(--txL);text-transform:uppercase;letter-spacing:1px;font-weight:700}
.fact{display:flex;gap:10px;justify-content:flex-end;margin-top:8px}
.toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px}
.tbL{display:flex;gap:10px;align-items:center;flex:1}
.kgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px}
.kc{background:var(--card);border:1px solid var(--brdL);border-radius:var(--rL);padding:16px;box-shadow:var(--sh);border-left:4px solid}
.kcL{font-size:11px;color:var(--txL);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:4px}
.kcV{font-size:24px;font-weight:800;color:var(--gD);font-family:'Playfair Display',Georgia,serif}
.chR{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.bi{margin-bottom:12px}.biH{display:flex;justify-content:space-between;margin-bottom:4px}
.biL{font-size:13px;color:var(--txM);font-weight:600;text-transform:capitalize}
.biV{font-size:13px;font-weight:800;color:var(--gD)}
.biTr{height:8px;background:var(--inp);border-radius:4px;overflow:hidden}
.biF{height:100%;border-radius:4px;transition:width .6s;background:linear-gradient(90deg,var(--g),var(--gL))}
.biG{background:linear-gradient(90deg,var(--ac),var(--wd))}
.rk{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--inp);color:var(--txM);font-size:11px;font-weight:800;margin-right:8px}
.rk1{background:var(--g);color:#fff}
.agrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.ai{padding:12px 16px;background:var(--dgBg);border-radius:var(--r)}
.aiN{font-weight:700;font-size:14px;color:var(--dg)}.aiD{font-size:12px;color:var(--txM);margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{padding:12px 14px;text-align:left;color:var(--txL);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid var(--brd)}
td{padding:12px 14px}tbody tr{border-bottom:1px solid var(--brdL)}
.hdrR{background:var(--inp)}.rDg{background:var(--dgBg)}
.btA{background:var(--inp);border:none;border-radius:6px;color:var(--txM);cursor:pointer;padding:6px}
.btAD{background:var(--dgBg);color:var(--dg)}
.tD{color:var(--dg)!important;font-weight:700}.tS{color:var(--g)!important;font-weight:800}.tB{font-weight:700;color:var(--tx)}.tM{color:var(--txM)}.tLt{color:var(--txL)}.tP{color:var(--gD)!important;font-weight:800}
.sgrid{display:grid;gap:20px}
.ctags{display:flex;flex-wrap:wrap;gap:8px}
.ctag{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--gBg);border:1px solid rgba(90,143,60,.2);border-radius:20px;font-size:13px;color:var(--gD);font-weight:600}
.ctagR{background:none;border:none;color:var(--dg);cursor:pointer;padding:0;line-height:1;font-size:16px;font-weight:700;display:flex;align-items:center}
.hint{font-size:11px;color:var(--txL);margin-top:8px}
.expAlert{padding:10px 14px;border-radius:var(--r);display:flex;flex-direction:column;gap:2px;font-size:13px;font-weight:600}
.expCrit{background:#fde8e8;color:#991b1b}.expWarn{background:#fef3cd;color:#856404}.expOk{background:var(--gBg);color:var(--gD)}
.abtn{display:flex;gap:4px}
.cart{background:var(--card);border:1px solid var(--brdL);border-radius:20px;padding:20px;display:flex;flex-direction:column;box-shadow:var(--sh);border-top:4px solid var(--g)}
.bpay{padding:8px 4px;background:transparent;border:1.5px solid var(--brd);border-radius:8px;color:var(--txM);cursor:pointer;font-size:11px;font-weight:600;font-family:'Nunito',sans-serif;transition:all .15s}.bpay.act{background:var(--g);border-color:var(--g);color:#fff}
.bconf{width:100%;padding:12px;background:linear-gradient(135deg,var(--g),var(--gD));border:none;border-radius:var(--r);color:#fff;cursor:pointer;font-size:15px;font-weight:700;font-family:'Nunito',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px}.bconf.dis{opacity:.4;cursor:default}
.brem{background:none;border:none;color:var(--dg);cursor:pointer;padding:2px;opacity:.6}.brem:hover{opacity:1}
.profitPos{color:var(--g);font-weight:800}.profitNeg{color:var(--dg);font-weight:800}
.sortH{cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:4px}.sortH:hover{color:var(--g)}
.loginBox{max-width:320px;margin:60px auto;text-align:center}
.saleRow{cursor:pointer;transition:background .15s}.saleRow:hover{background:var(--gBg)!important}
.saleDetail{background:var(--inp);padding:10px 14px;font-size:12px}
.poSearch{position:relative}.poSearch input{padding-left:36px}
.poSearch .sIco{position:absolute;left:10px;top:10px;color:var(--txL)}
`;

/* ═══ MODAL ═══ */
function Modal({isOpen,onClose,title,children}){
  if(!isOpen)return null;
  return<div className="mOv" onClick={onClose}><div className="mBk"/><div className="mCt" onClick={e=>e.stopPropagation()}><div className="mHd"><h3 className="mTi">{title}</h3><button style={{background:"none",border:"none",color:"var(--txL)",cursor:"pointer",padding:4}} onClick={onClose}><Ic name="x"/></button></div>{children}</div></div>;
}

/* ═══ PRODUCT FORM (with lot/expiry on new + margin fix) ═══ */
function ProductForm({product,categories,onSave,onCancel}){
  const dt=Object.keys(UT)[0];
  const im=product&&product.costPrice>0?Math.round((product.salePrice-product.costPrice)/product.costPrice*100):100;
  const [f,sF]=useState(product||{name:"",category:categories[0]||"",type:dt,unit:UT[dt].def,costPrice:"",salePrice:"",stock:"",minStock:"",supplier:"",lots:[]});
  const [margin,sM]=useState(im);
  const [lot,sLot]=useState("");
  const [expiry,sExp]=useState("");
  const u=(k,v)=>sF(p=>{const n={...p,[k]:v};if(k==="type"&&UT[v])n.unit=UT[v].def;if(k==="costPrice")n.salePrice=calcSaleFromMargin(Number(v),margin);return n;});
  const uM=v=>{sM(v);sF(p=>({...p,salePrice:p.costPrice?calcSaleFromMargin(Number(p.costPrice),v):0}));};
  const tc=UT[f.type];
  const disp=f.costPrice?fmt(f.salePrice||calcSaleFromMargin(Number(f.costPrice),margin)):"—";
  const isNew=!product;
  return(
    <div className="fgrid">
      <div className="fful"><label className="flab">Nombre</label><input className="inp" value={f.name} onChange={e=>u("name",e.target.value)} placeholder="Nombre del producto"/></div>
      <div><label className="flab">Categoría</label><select className="inp" value={f.category} onChange={e=>u("category",e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
      <div><label className="flab">Tipo de venta</label><select className="inp" value={f.type} onChange={e=>u("type",e.target.value)}>{Object.entries(UT).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
      <div><label className="flab">Unidad</label><select className="inp" value={f.unit} onChange={e=>u("unit",e.target.value)}>{tc.units.map(x=><option key={x}>{x}</option>)}</select></div>
      <div><label className="flab">Proveedor</label><input className="inp" value={f.supplier} onChange={e=>u("supplier",e.target.value)}/></div>
      <div><label className="flab">Precio Costo</label><input className="inp" type="number" step="0.01" value={f.costPrice} onChange={e=>u("costPrice",numVal(e.target.value))}/></div>
      <div><label className="flab">Margen (%)</label><input className="inp" type="number" step="1" value={margin} onChange={e=>uM(numVal(e.target.value))} style={{fontWeight:700,color:"var(--g)"}}/></div>
      <div className="fful" style={{background:"var(--gBg)",borderRadius:"var(--r)",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:"var(--txM)",fontWeight:600}}>Precio de Venta (calculado)</span><span style={{fontSize:22,fontWeight:800,color:"var(--gD)",fontFamily:"'Playfair Display',Georgia,serif"}}>{disp}</span></div>
      <div><label className="flab">Stock actual</label><input className="inp" type="number" step="0.01" value={f.stock} onChange={e=>u("stock",numVal(e.target.value))}/></div>
      <div><label className="flab">Stock mínimo</label><input className="inp" type="number" step="0.01" value={f.minStock} onChange={e=>u("minStock",numVal(e.target.value))}/></div>
      {isNew&&<><div><label className="flab">Nro de Lote (opcional)</label><input className="inp" value={lot} onChange={e=>sLot(e.target.value)} placeholder="Ej: L-2026-050"/></div>
      <div><label className="flab">Vencimiento (opcional)</label><input className="inp" type="date" value={expiry} onChange={e=>sExp(e.target.value)}/></div></>}
      <div className="fful fact"><button className="btnO" onClick={onCancel}>Cancelar</button><button className="btnP" onClick={()=>{const sp=f.salePrice||calcSaleFromMargin(Number(f.costPrice),margin);if(!f.name||!f.costPrice)return;let lots=f.lots||[];if(isNew&&(lot||expiry))lots=[{lot:lot||"S/L",expiry:expiry||"",qty:Number(f.stock)||0}];onSave({...f,salePrice:sp,lots})}}>Guardar</button></div>
    </div>
  );
}

/* ═══ PURCHASE FORM (with search, cost per item, edit mode) ═══ */
function PurchaseForm({products,purchase,onSave,onCancel}){
  const [supplier,setSup]=useState(purchase?.supplier||"");
  const [items,setItems]=useState(purchase?.items||[]);
  const [srch,sSrch]=useState("");
  const [sel,setSel]=useState("");
  const [qty,setQty]=useState("");
  const [cost,setCost]=useState("");
  const [lot,setLot]=useState("");
  const [expiry,setExp]=useState("");
  const filtered=products.filter(p=>p.name.toLowerCase().includes(srch.toLowerCase()));
  const addItem=()=>{
    const p=products.find(x=>x.id===Number(sel));
    if(!p||!qty||Number(qty)<=0)return;
    const uc=cost?Number(cost):p.costPrice;
    setItems([...items,{productId:p.id,name:p.name,qty:Number(qty),unit:p.unit,unitCost:uc,total:Number(qty)*uc,lot:lot||"S/L",expiry:expiry||""}]);
    setSel("");setQty("");setCost("");setLot("");setExp("");sSrch("");
    if(!supplier)setSup(p.supplier);
  };
  const remItem=i=>setItems(items.filter((_,x)=>x!==i));
  const total=items.reduce((s,i)=>s+i.total,0);
  return(
    <div style={{display:"grid",gap:16}}>
      <div><label className="flab">Proveedor</label><input className="inp" value={supplier} onChange={e=>setSup(e.target.value)} placeholder="Nombre del proveedor"/></div>
      <div style={{background:"var(--inp)",borderRadius:"var(--r)",padding:14,display:"grid",gap:10}}>
        <label className="flab">Agregar producto al pedido</label>
        <div className="poSearch"><span className="sIco"><Ic name="search" size={16}/></span><input className="inp" style={{paddingLeft:36}} placeholder="Buscar producto..." value={srch} onChange={e=>sSrch(e.target.value)}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 80px 100px",gap:8}}>
          <select className="inp" value={sel} onChange={e=>{setSel(e.target.value);const p=products.find(x=>x.id===Number(e.target.value));if(p)setCost(String(p.costPrice));}}><option value="">Seleccionar...</option>{filtered.map(p=><option key={p.id} value={p.id}>{p.name} (stock: {fS(p)})</option>)}</select>
          <input className="inp" type="number" step="0.01" placeholder="Cant" value={qty} onChange={e=>setQty(e.target.value)}/>
          <input className="inp" type="number" step="0.01" placeholder="Costo unit." value={cost} onChange={e=>setCost(e.target.value)}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div><label className="flab">Nro de Lote</label><input className="inp" value={lot} onChange={e=>setLot(e.target.value)} placeholder="Ej: L-2026-050"/></div>
          <div><label className="flab">Vencimiento</label><input className="inp" type="date" value={expiry} onChange={e=>setExp(e.target.value)}/></div>
        </div>
        <button className="btnP" style={{justifySelf:"start",padding:"8px 16px",fontSize:13}} onClick={addItem}><Ic name="plus" size={14} color="#fff"/> Agregar</button>
      </div>
      {items.length>0&&<div className="card" style={{padding:0,overflow:"hidden"}}><table><thead><tr className="hdrR"><th>Producto</th><th>Cant</th><th>Costo unit.</th><th>Lote</th><th>Vence</th><th>Total</th><th></th></tr></thead><tbody>{items.map((it,i)=><tr key={i}><td className="tB">{it.name}</td><td>{it.qty} {it.unit}</td><td className="tM">{fmt(it.unitCost)}</td><td style={{fontFamily:"monospace",fontSize:12}}>{it.lot}</td><td>{it.expiry?fDs(it.expiry):"—"}</td><td className="tP">{fmt(it.total)}</td><td><button className="btA btAD" onClick={()=>remItem(i)}><Ic name="x" size={14}/></button></td></tr>)}</tbody></table></div>}
      {items.length>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0"}}><span style={{fontSize:16,fontWeight:700,color:"var(--txM)"}}>Total del pedido</span><span style={{fontSize:24,fontWeight:800,color:"var(--gD)",fontFamily:"'Playfair Display',Georgia,serif"}}>{fmt(total)}</span></div>}
      <div className="fact"><button className="btnO" onClick={onCancel}>Cancelar</button><button className="btnP" onClick={()=>{if(!items.length||!supplier)return;onSave({id:purchase?.id||gId(),date:purchase?.date||new Date().toISOString(),supplier,items,total});}} style={{opacity:items.length&&supplier?1:.4}}>{purchase?"Guardar Cambios":"Confirmar Ingreso"}</button></div>
    </div>
  );
}

/* ═══ POS (with sales history + expandable rows + qty validation) ═══ */
function POS({products,sales,onSale}){
  const [cart,sCart]=useState([]);const [srch,sSrch]=useState("");const [pay,sPay]=useState(biz.payMethods[0].id);const [amts,sAmts]=useState({});
  const [tab,sTab]=useState("pos"); // "pos" or "history"
  const [expanded,setExp]=useState(null);
  const fl=products.filter(p=>p.name.toLowerCase().includes(srch.toLowerCase())&&p.stock>0);
  const mSales=sales.filter(s=>getMonth(s.date)===curMonth);

  const add=pr=>{
    const q=amts[pr.id];
    // FIX: don't add if no quantity entered
    if(!q||Number(q)<=0)return;
    const qty=Number(q);
    const ex=cart.find(c=>c.productId===pr.id);
    if(ex){sCart(cart.map(c=>c.productId===pr.id?{...c,qty:c.qty+qty,total:(c.qty+qty)*pr.salePrice}:c));}
    else{sCart([...cart,{productId:pr.id,name:pr.name,qty,unit:pr.unit,unitPrice:pr.salePrice,total:qty*pr.salePrice,type:pr.type,costPrice:pr.costPrice}]);}
    sAmts(a=>({...a,[pr.id]:""}));
  };
  const rem=i=>sCart(cart.filter((_,x)=>x!==i));const tot=cart.reduce((s,c)=>s+c.total,0);
  const done=()=>{if(!cart.length)return;onSale({id:gId(),date:new Date().toISOString(),items:cart,total:tot,payMethod:pay});sCart([]);};

  return(
    <div>
      {/* Tab switcher */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <button className={`nb ${tab==="pos"?"act":""}`} onClick={()=>sTab("pos")}><Ic name="cart" size={16}/> Nueva Venta</button>
        <button className={`nb ${tab==="history"?"act":""}`} onClick={()=>sTab("history")}><Ic name="clock" size={16}/> Ventas del Mes ({mSales.length})</button>
      </div>

      {tab==="pos"&&<div className="posL">
        <div className="posP">
          <div style={{position:"relative",marginBottom:16}}><span style={{position:"absolute",left:12,top:11,color:"var(--txL)"}}><Ic name="search" size={16}/></span><input className="inp" style={{paddingLeft:38}} placeholder="Buscar producto..." value={srch} onChange={e=>sSrch(e.target.value)}/></div>
          <div className="pgrid">{fl.map(p=>{const lo=p.stock<=p.minStock;const tc=UT[p.type];return(
            <div key={p.id} className={`pc ${lo?"low":""}`}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:4}}><span style={{fontWeight:700,fontSize:14,color:"var(--tx)"}}>{p.name}</span><span className={`badge ${p.type==="weight"?"badge-g":"badge-a"}`}>{p.unit}</span></div>
              <div style={{fontSize:20,fontWeight:800,color:"var(--gD)",fontFamily:"'Playfair Display',Georgia,serif",marginBottom:4}}>{fmt(p.salePrice)}<span style={{fontSize:12,fontWeight:400,color:"var(--txL)"}}>/{p.unit}</span></div>
              <div style={{fontSize:12,color:lo?"var(--dg)":"var(--txL)",marginBottom:8,fontWeight:lo?700:400}}>{lo&&"⚠ "}Stock: {fS(p)} {p.unit}</div>
              <div style={{display:"flex",gap:6}}>
                <input type="number" step="0.01" min="0.01" placeholder={tc.ph} value={amts[p.id]||""} onChange={e=>sAmts(a=>({...a,[p.id]:e.target.value}))} className="inp" style={{flex:1,padding:"8px 10px",fontSize:13}}/>
                <button className="btnP" style={{padding:"8px 14px",fontSize:16,opacity:amts[p.id]&&Number(amts[p.id])>0?1:.4}} onClick={()=>add(p)}>+</button>
              </div>
            </div>);})}</div>
        </div>
        <div className="cart">
          <h3 style={{margin:"0 0 14px",fontSize:17,color:"var(--gD)",fontFamily:"'Playfair Display',Georgia,serif",display:"flex",alignItems:"center",gap:8}}><Ic name="cart" size={20}/> Venta Actual</h3>
          <div style={{flex:1,overflow:"auto"}}>{cart.length===0?<div style={{textAlign:"center",padding:"40px 0",color:"var(--txL)",fontSize:13}}>Agregá productos</div>:cart.map((it,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--brdL)"}}><div><div style={{fontSize:14,color:"var(--tx)",fontWeight:600}}>{it.name}</div><div style={{fontSize:12,color:"var(--txL)"}}>{Number(it.qty).toFixed(2)} {it.unit} × {fmt(it.unitPrice)}</div></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontWeight:800,color:"var(--gD)",fontSize:14}}>{fmt(it.total)}</span><button className="brem" onClick={()=>rem(i)}><Ic name="x" size={16}/></button></div></div>)}</div>
          <div style={{borderTop:"2px solid var(--brd)",paddingTop:14,marginTop:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><span style={{fontSize:13,color:"var(--txM)",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Total</span><span style={{fontSize:26,fontWeight:800,color:"var(--gD)",fontFamily:"'Playfair Display',Georgia,serif"}}>{fmt(tot)}</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>{biz.payMethods.map(m=><button key={m.id} onClick={()=>sPay(m.id)} className={`bpay ${pay===m.id?"act":""}`}>{m.label}</button>)}</div>
            <button className={`bconf ${!cart.length?"dis":""}`} onClick={done} disabled={!cart.length}><Ic name="check" size={18} color="#fff"/> Confirmar Venta</button>
          </div>
        </div>
      </div>}

      {tab==="history"&&<div className="card" style={{padding:0,overflow:"hidden"}}>
        {mSales.length===0?<div style={{padding:"40px 20px",textAlign:"center",color:"var(--txL)"}}>Sin ventas este mes</div>:
        <table><thead><tr className="hdrR"><th></th><th>Fecha</th><th>Productos</th><th>Medio</th><th>Total</th></tr></thead><tbody>{mSales.map(s=><>
          <tr key={s.id} className="saleRow" onClick={()=>setExp(expanded===s.id?null:s.id)}>
            <td style={{width:30}}><Ic name={expanded===s.id?"chevUp":"chevDown"} size={14} color="var(--txL)"/></td>
            <td className="tM">{fD(s.date)}</td>
            <td>{s.items.map(i=>i.name).join(", ")}</td>
            <td><span className="badge badge-g">{s.payMethod}</span></td>
            <td className="tP">{fmt(s.total)}</td>
          </tr>
          {expanded===s.id&&<tr key={s.id+"d"}><td colSpan={5} className="saleDetail">
            <table style={{fontSize:12}}><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio unit.</th><th>Subtotal</th></tr></thead><tbody>{s.items.map((it,j)=><tr key={j}><td>{it.name}</td><td>{Number(it.qty).toFixed(2)} {it.unit}</td><td>{fmt(it.unitPrice)}</td><td className="tP">{fmt(it.total)}</td></tr>)}</tbody></table>
          </td></tr>}
        </>)}</tbody></table>}
      </div>}
    </div>
  );
}

/* ═══ REPORTS (with login) ═══ */
function Reports({sales,products,purchases,stockAdjustments,storeName,onDeleteSale,expiryDays}){
  const [auth,setAuth]=useState(false);
  const [pin,setPin]=useState("");
  const [pinErr,setPinErr]=useState(false);

  if(!auth)return(
    <div className="loginBox">
      <div className="card" style={{padding:30}}>
        <div style={{marginBottom:20}}><Ic name="lock" size={40} color="var(--g)"/></div>
        <h3 style={{fontSize:18,color:"var(--gD)",fontFamily:"'Playfair Display',Georgia,serif",marginBottom:8}}>Acceso a Reportes</h3>
        <p style={{fontSize:13,color:"var(--txM)",marginBottom:20}}>Ingresá el PIN de acceso</p>
        <input className="inp" type="password" maxLength={6} placeholder="PIN" value={pin} onChange={e=>{setPin(e.target.value);setPinErr(false);}} style={{textAlign:"center",fontSize:24,letterSpacing:8,marginBottom:12}} onKeyDown={e=>{if(e.key==="Enter"){if(pin===biz.reportPin)setAuth(true);else setPinErr(true);}}}/>
        {pinErr&&<div style={{color:"var(--dg)",fontSize:13,marginBottom:12}}>PIN incorrecto</div>}
        <button className="btnP" style={{width:"100%",justifyContent:"center"}} onClick={()=>{if(pin===biz.reportPin)setAuth(true);else setPinErr(true);}}>Ingresar</button>
        <div className="hint" style={{marginTop:12}}>PIN por defecto: 1234 (cambialo en config)</div>
      </div>
    </div>
  );

  return <ReportsContent sales={sales} products={products} purchases={purchases} stockAdjustments={stockAdjustments} storeName={storeName} onDeleteSale={onDeleteSale} expiryDays={expiryDays}/>;
}

function ReportsContent({sales,products,purchases,stockAdjustments,storeName,onDeleteSale,expiryDays}){
  const [cDel,sCDel]=useState(null);
  const [month,setMonth]=useState(curMonth);
  const mSales=sales.filter(s=>getMonth(s.date)===month);
  const mPurch=purchases.filter(p=>getMonth(p.date)===month);
  const mAdj=stockAdjustments.filter(a=>getMonth(a.date)===month&&a.diff>0);
  const revenue=mSales.reduce((s,v)=>s+v.total,0);
  const costOfSales=mSales.reduce((s,v)=>s+v.items.reduce((a,i)=>a+(i.costPrice||0)*i.qty,0),0);
  const supplierSpend=mPurch.reduce((s,p)=>s+p.total,0);
  const adjLoss=mAdj.reduce((s,a)=>s+a.diff*a.costPrice,0);
  const grossProfit=revenue-costOfSales;
  const netProfit=grossProfit-adjLoss;
  const bySupplier=mPurch.reduce((a,p)=>{a[p.supplier]=(a[p.supplier]||0)+p.total;return a;},{});
  const byPay=mSales.reduce((a,s)=>{a[s.payMethod]=(a[s.payMethod]||0)+s.total;return a;},{});
  const byProd=mSales.flatMap(s=>s.items).reduce((a,i)=>{a[i.name]=(a[i.name]||0)+i.total;return a;},{});
  const top5=Object.entries(byProd).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const low=products.filter(p=>p.stock<=p.minStock);
  const invVal=products.reduce((s,p)=>s+p.stock*p.costPrice,0);
  const mxP=Math.max(...Object.values(byPay),1);const mxPr=top5.length?top5[0][1]:1;const mxS=Math.max(...Object.values(bySupplier),1);
  const expAlerts=products.flatMap(p=>(p.lots||[]).map(l=>({...l,productName:p.name,days:l.expiry?daysUntil(l.expiry):999}))).filter(l=>l.days<=expiryDays&&l.days>-30).sort((a,b)=>a.days-b.days);
  const months=[...new Set([...sales.map(s=>getMonth(s.date)),...purchases.map(p=>getMonth(p.date)),curMonth])].sort().reverse();

  return(
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><label className="flab" style={{margin:0}}>Mes</label><select className="inp" style={{width:"auto"}} value={month} onChange={e=>setMonth(e.target.value)}>{months.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}</select></div>
        <div style={{display:"flex",gap:8}}><button className="btnOG" onClick={()=>exCSV(`${storeName}_ventas.csv`,["Fecha","Productos","Medio","Total"],mSales.map(s=>[fD(s.date),s.items.map(i=>`${i.name} x${i.qty}`).join(" | "),s.payMethod,s.total]))}><Ic name="download" size={15}/> Ventas</button><button className="btnOG" onClick={()=>exCSV(`${storeName}_inventario.csv`,["Producto","Categoría","Tipo","Costo","Venta","Margen%","Stock","Mín","Proveedor"],products.map(p=>[p.name,p.category,UT[p.type]?.label||p.type,p.costPrice,p.salePrice,calcMarginDisplay(p.costPrice,p.salePrice),p.stock,p.minStock,p.supplier]))}><Ic name="download" size={15}/> Inventario</button></div>
      </div>
      <div className="kgrid">
        <div className="kc" style={{borderLeftColor:"var(--g)"}}><div className="kcL">Ingresos</div><div className="kcV">{fmt(revenue)}</div></div>
        <div className="kc" style={{borderLeftColor:"var(--ac)"}}><div className="kcL">Gasto proveedores</div><div className="kcV">{fmt(supplierSpend)}</div></div>
        <div className="kc" style={{borderLeftColor:netProfit>=0?"var(--g)":"var(--dg)"}}><div className="kcL">Ganancia neta</div><div className={`kcV ${netProfit>=0?"profitPos":"profitNeg"}`}>{fmt(netProfit)}</div></div>
        <div className="kc" style={{borderLeftColor:"var(--info)"}}><div className="kcL">Valor inventario</div><div className="kcV">{fmt(invVal)}</div></div>
        {adjLoss>0&&<div className="kc" style={{borderLeftColor:"var(--dg)"}}><div className="kcL">Pérdida ajuste stock</div><div className="kcV profitNeg">{fmt(-adjLoss)}</div></div>}
        <div className="kc" style={{borderLeftColor:"var(--g)"}}><div className="kcL">Operaciones</div><div className="kcV">{mSales.length}</div></div>
      </div>
      {expAlerts.length>0&&<div className="card" style={{borderLeft:"4px solid var(--dg)"}}><h4 style={{margin:"0 0 12px",fontSize:16,color:"var(--dg)",fontFamily:"'Playfair Display',Georgia,serif",display:"flex",alignItems:"center",gap:8}}><Ic name="clock" size={18} color="var(--dg)"/> Alertas de vencimiento</h4><div className="agrid">{expAlerts.map((l,i)=><div key={i} className={`expAlert ${l.days<=0?"expCrit":l.days<=7?"expCrit":l.days<=30?"expWarn":"expOk"}`}><div style={{fontWeight:700}}>{l.productName}</div><div style={{fontSize:12,opacity:.8}}>Lote {l.lot} — {l.days<=0?`Venció hace ${Math.abs(l.days)} días`:l.days===1?"Vence mañana":`Vence en ${l.days} días`} ({l.expiry?fDs(l.expiry):""})</div></div>)}</div></div>}
      <div className="chR">
        <div className="card"><h4 style={{margin:"0 0 14px",fontSize:15,color:"var(--gD)",fontFamily:"'Playfair Display',Georgia,serif"}}>Por Medio de Pago</h4>{Object.entries(byPay).map(([m,t])=><div key={m} className="bi"><div className="biH"><span className="biL">{m}</span><span className="biV">{fmt(t)}</span></div><div className="biTr"><div className="biF" style={{width:`${(t/mxP)*100}%`}}/></div></div>)}{Object.keys(byPay).length===0&&<div style={{color:"var(--txL)",fontSize:13,padding:"20px 0",textAlign:"center"}}>Sin ventas</div>}</div>
        <div className="card"><h4 style={{margin:"0 0 14px",fontSize:15,color:"var(--gD)",fontFamily:"'Playfair Display',Georgia,serif"}}>Gasto por Proveedor</h4>{Object.entries(bySupplier).map(([s,t])=><div key={s} className="bi"><div className="biH"><span className="biL">{s}</span><span className="biV">{fmt(t)}</span></div><div className="biTr"><div className="biF biG" style={{width:`${(t/mxS)*100}%`}}/></div></div>)}{Object.keys(bySupplier).length===0&&<div style={{color:"var(--txL)",fontSize:13,padding:"20px 0",textAlign:"center"}}>Sin compras</div>}</div>
      </div>
      <div className="chR">
        <div className="card"><h4 style={{margin:"0 0 14px",fontSize:15,color:"var(--gD)",fontFamily:"'Playfair Display',Georgia,serif"}}>Top Productos</h4>{top5.map(([n,t],i)=><div key={n} className="bi"><div className="biH"><span className="biL"><span className={`rk ${i===0?"rk1":""}`}>{i+1}</span>{n}</span><span className="biV">{fmt(t)}</span></div><div className="biTr"><div className={`biF ${i===0?"biG":""}`} style={{width:`${(t/mxPr)*100}%`}}/></div></div>)}</div>
        {low.length>0&&<div className="card" style={{borderLeft:"4px solid var(--dg)"}}><h4 style={{margin:"0 0 12px",fontSize:15,color:"var(--dg)",fontFamily:"'Playfair Display',Georgia,serif",display:"flex",alignItems:"center",gap:8}}><Ic name="alert" size={16} color="var(--dg)"/> Stock Bajo ({low.length})</h4><div className="agrid">{low.map(p=><div key={p.id} className="ai"><div className="aiN">{p.name}</div><div className="aiD">Stock: {fS(p)} / Mín: {p.minStock} {p.unit}</div></div>)}</div></div>}
      </div>
      <div className="card"><h4 style={{margin:"0 0 14px",fontSize:15,color:"var(--gD)",fontFamily:"'Playfair Display',Georgia,serif"}}>Ventas del mes</h4><div style={{overflowX:"auto"}}><table><thead><tr>{["Fecha","Productos","Medio","Total",""].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{mSales.map(s=><tr key={s.id}><td className="tM">{fD(s.date)}</td><td>{s.items.map(i=>i.name).join(", ")}</td><td><span className="badge badge-g">{s.payMethod}</span></td><td className="tP">{fmt(s.total)}</td><td>{cDel===s.id?<div style={{display:"flex",gap:4,alignItems:"center"}}><button className="btnP" style={{padding:"4px 10px",fontSize:11,background:"var(--dg)"}} onClick={()=>{onDeleteSale(s.id);sCDel(null);}}>Sí</button><button className="btnO" style={{padding:"4px 10px",fontSize:11}} onClick={()=>sCDel(null)}>No</button></div>:<button className="btA btAD" onClick={()=>sCDel(s.id)}><Ic name="trash" size={14}/></button>}</td></tr>)}</tbody></table>{mSales.length===0&&<div style={{color:"var(--txL)",fontSize:13,padding:"20px 0",textAlign:"center"}}>Sin ventas</div>}</div></div>
      {mAdj.length>0&&<div className="card" style={{borderLeft:"4px solid var(--ac)"}}><h4 style={{margin:"0 0 12px",fontSize:15,color:"var(--ac)",fontFamily:"'Playfair Display',Georgia,serif"}}>Ajustes de Stock ({monthLabel(month)})</h4><table><thead><tr><th>Fecha</th><th>Producto</th><th>Antes</th><th>Después</th><th>Pérdida</th></tr></thead><tbody>{mAdj.map(a=><tr key={a.id}><td className="tM">{fDs(a.date)}</td><td className="tB">{a.productName}</td><td className="tM">{a.prevStock}</td><td className="tM">{a.newStock}</td><td className="tD">{fmt(a.diff*a.costPrice)}</td></tr>)}</tbody></table></div>}
    </div>
  );
}

/* ═══ SETTINGS ═══ */
function Settings({storeName,slogan,categories,products,expiryDays,reportPin,onSave,onClose}){
  const [tN,sTN]=useState(storeName);const [tS,sTS]=useState(slogan);const [tC,sTC]=useState([...categories]);const [nc,sNc]=useState("");const [tE,sTE]=useState(expiryDays);const [tP,sTP]=useState(reportPin);
  const addC=()=>{const t=nc.trim();if(t&&!tC.includes(t)){sTC([...tC,t]);sNc("");}};
  return(
    <div className="sgrid">
      <div><label className="flab">Nombre del negocio</label><input className="inp" value={tN} onChange={e=>sTN(e.target.value)}/></div>
      <div><label className="flab">Eslogan</label><input className="inp" value={tS} onChange={e=>sTS(e.target.value)}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div><label className="flab">Días alerta vencimiento</label><input className="inp" type="number" value={tE} onChange={e=>sTE(Number(e.target.value))} min="1"/><div className="hint">Aviso antes del vencimiento</div></div>
        <div><label className="flab">PIN de Reportes</label><input className="inp" type="text" maxLength={6} value={tP} onChange={e=>sTP(e.target.value)}/><div className="hint">Clave para acceder a reportes</div></div>
      </div>
      <div>
        <label className="flab">Categorías</label>
        <div style={{display:"flex",gap:8,marginBottom:10}}><input className="inp" style={{flex:1}} placeholder="Nueva categoría..." value={nc} onChange={e=>sNc(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addC()}/><button className="btnP" style={{padding:"10px 16px",fontSize:18,lineHeight:1}} onClick={addC}>+</button></div>
        <div className="ctags">{tC.map(c=>{const u=products.some(p=>p.category===c);return <span key={c} className="ctag">{c}{!u?<button className="ctagR" onClick={()=>sTC(tC.filter(x=>x!==c))}>×</button>:<span style={{fontSize:10,color:"var(--txL)"}} title="En uso">🔒</span>}</span>;})}</div>
        <div className="hint">Las categorías en uso no se pueden eliminar.</div>
      </div>
      <div className="fact" style={{borderTop:"1px solid var(--brd)",paddingTop:16}}><button className="btnO" onClick={onClose}>Cancelar</button><button className="btnP" onClick={()=>onSave({storeName:tN||"Mi Negocio",slogan:tS,categories:tC,expiryDays:tE,reportPin:tP||"1234"})}>Guardar</button></div>
    </div>
  );
}

/* ═══ APP ═══ */
export default function App(){
  const [state,dispatch]=useReducer(reducer,{products:SP,sales:SS,purchases:SPO,stockAdjustments:[]});
  const [view,setView]=useState("pos");
  const [mOpen,sMOpen]=useState(false);const [eProd,sEProd]=useState(null);
  const [poOpen,sPOOpen]=useState(false);const [editPo,sEditPo]=useState(null);
  const [srch,sSrch]=useState("");const [fCat,sFCat]=useState("Todas");
  const [sortBy,setSortBy]=useState("name");const [sortDir,setSortDir]=useState("asc");
  const [sOpen,sSOpen]=useState(false);
  const [sName,sSName]=useState(biz.name);const [slogan,sSlog]=useState(biz.slogan);
  const [cats,sCats]=useState(DEF_CATS);
  const [expiryDays,sExpDays]=useState(30);
  const [reportPin,sReportPin]=useState(biz.reportPin);

  const lsc=state.products.filter(p=>p.stock<=p.minStock).length;
  const expCount=state.products.flatMap(p=>(p.lots||[]).map(l=>({days:l.expiry?daysUntil(l.expiry):999}))).filter(l=>l.days<=expiryDays&&l.days>-30).length;

  // Sorted+filtered products for inventory
  const fp=useMemo(()=>{
    let list=state.products.filter(p=>p.name.toLowerCase().includes(srch.toLowerCase())&&(fCat==="Todas"||p.category===fCat));
    list.sort((a,b)=>{
      let va,vb;
      if(sortBy==="name"){va=a.name.toLowerCase();vb=b.name.toLowerCase();}
      else if(sortBy==="stock"){va=a.stock;vb=b.stock;}
      else if(sortBy==="supplier"){va=(a.supplier||"").toLowerCase();vb=(b.supplier||"").toLowerCase();}
      else{va=a.name.toLowerCase();vb=b.name.toLowerCase();}
      if(va<vb)return sortDir==="asc"?-1:1;
      if(va>vb)return sortDir==="asc"?1:-1;
      return 0;
    });
    return list;
  },[state.products,srch,fCat,sortBy,sortDir]);

  const toggleSort=col=>{if(sortBy===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortBy(col);setSortDir("asc");}};
  const sortIcon=col=>sortBy===col?<Ic name={sortDir==="asc"?"chevUp":"chevDown"} size={12}/>:null;

  const saveProd=p=>{if(eProd)dispatch({type:"UPDATE_PRODUCT",payload:{...p,id:eProd.id,lots:p.lots&&p.lots.length?p.lots:(eProd.lots||[])}});else dispatch({type:"ADD_PRODUCT",payload:p});sMOpen(false);};
  const saveSet=({storeName:n,slogan:s,categories:c,expiryDays:e,reportPin:rp})=>{sSName(n);sSlog(s);sCats(c);sExpDays(e);sReportPin(rp);sSOpen(false);};

  // Update reportPin in biz config reference
  biz.reportPin=reportPin;

  const navs=[
    {k:"pos",i:"cart",l:"Ventas",b:0},
    {k:"inventory",i:"package",l:"Inventario",b:lsc},
    {k:"purchases",i:"truck",l:"Pedidos",b:0},
    {k:"reports",i:"chart",l:"Reportes",b:expCount},
  ];

  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--tx)",fontFamily:"'Nunito',sans-serif"}}>
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet"/>
      <header className="hdr">
        <div className="brand"><div className="logo"><Ic name="leaf" size={22} color="#fff"/></div><div><div style={{display:"flex",alignItems:"center",gap:8}}><h1 className="sname">{sName}</h1><button className="sbtn" onClick={()=>sSOpen(true)}><Ic name="settings" size={14}/></button></div><span className="slogan">{slogan}</span></div></div>
        <nav className="nav">{navs.map(n=><button key={n.k} onClick={()=>setView(n.k)} className={`nb ${view===n.k?"act":""}`}><Ic name={n.i} size={16} color={view===n.k?"var(--g)":"var(--txL)"}/>{n.l}{n.b>0&&<span className="nba">{n.b}</span>}</button>)}</nav>
      </header>
      <main style={{padding:24}}>
        {view==="pos"&&<POS products={state.products} sales={state.sales} onSale={s=>dispatch({type:"ADD_SALE",payload:s})}/>}

        {view==="inventory"&&<div>
          <div className="toolbar"><div className="tbL"><div style={{position:"relative"}}><span style={{position:"absolute",left:12,top:11,color:"var(--txL)"}}><Ic name="search" size={16}/></span><input className="inp" style={{paddingLeft:38,width:280}} placeholder="Buscar producto..." value={srch} onChange={e=>sSrch(e.target.value)}/></div><select className="inp" style={{width:"auto"}} value={fCat} onChange={e=>sFCat(e.target.value)}><option>Todas</option>{cats.map(c=><option key={c}>{c}</option>)}</select></div><button className="btnP" onClick={()=>{sEProd(null);sMOpen(true);}}><Ic name="plus" size={16} color="#fff"/> Nuevo Producto</button></div>
          <div className="card" style={{padding:0,overflow:"hidden"}}><table><thead><tr className="hdrR">
            <th><span className="sortH" onClick={()=>toggleSort("name")}>Producto {sortIcon("name")}</span></th>
            <th>Categoría</th><th>Tipo</th><th>Costo</th><th>Venta</th><th>Margen</th>
            <th><span className="sortH" onClick={()=>toggleSort("stock")}>Stock {sortIcon("stock")}</span></th>
            <th>Lotes</th>
            <th><span className="sortH" onClick={()=>toggleSort("supplier")}>Proveedor {sortIcon("supplier")}</span></th>
            <th></th>
          </tr></thead><tbody>{fp.map(p=>{const mg=calcMarginDisplay(p.costPrice,p.salePrice);const lo=p.stock<=p.minStock;return(
            <tr key={p.id} className={lo?"rDg":""}>
              <td className="tB">{p.name}</td><td className="tM">{p.category}</td>
              <td><span className={`badge ${p.type==="weight"?"badge-g":"badge-a"}`}>{UT[p.type]?.label.split(" ")[0]}</span></td>
              <td className="tM">{fmt(p.costPrice)}</td><td className="tP">{fmt(p.salePrice)}</td>
              <td><span className={mg>=50?"tS":"tD"}>{mg}%</span></td>
              <td className={lo?"tD":"tM"}>{lo&&"⚠ "}{fS(p)} {p.unit}</td>
              <td>{(p.lots||[]).length>0?<div style={{display:"flex",flexDirection:"column",gap:2}}>{(p.lots||[]).map((l,i)=>{const d=l.expiry?daysUntil(l.expiry):999;return <span key={i} className={`badge ${d<=0?"badge-d":d<=expiryDays?"badge-d":"badge-i"}`} style={{fontSize:10}}>{l.lot} {l.expiry?`(${fDs(l.expiry)})`:""}</span>;})}</div>:<span className="tLt">—</span>}</td>
              <td className="tLt">{p.supplier}</td>
              <td><div className="abtn"><button className="btA" onClick={()=>{sEProd(p);sMOpen(true);}}><Ic name="edit" size={14}/></button><button className="btA btAD" onClick={()=>dispatch({type:"DELETE_PRODUCT",payload:p.id})}><Ic name="trash" size={14}/></button></div></td>
            </tr>);})}</tbody></table></div>
        </div>}

        {view==="purchases"&&<div>
          <div className="toolbar"><h2 style={{fontSize:20,color:"var(--gD)",fontFamily:"'Playfair Display',Georgia,serif"}}>Ingreso de Mercadería</h2><button className="btnP" onClick={()=>{sEditPo(null);sPOOpen(true);}}><Ic name="truck" size={16} color="#fff"/> Nuevo Pedido</button></div>
          {state.purchases.length>0?<div className="card" style={{padding:0,overflow:"hidden"}}><table><thead><tr className="hdrR"><th>Fecha</th><th>Proveedor</th><th>Productos</th><th>Total</th><th></th></tr></thead><tbody>{state.purchases.map(po=><tr key={po.id}><td className="tM">{fD(po.date)}</td><td className="tB">{po.supplier}</td><td>{po.items.map(i=>`${i.name} ×${i.qty} (${i.lot})`).join(", ")}</td><td className="tP">{fmt(po.total)}</td><td><button className="btA" onClick={()=>{sEditPo(po);sPOOpen(true);}}><Ic name="edit" size={14}/></button></td></tr>)}</tbody></table></div>
          :<div className="card" style={{textAlign:"center",padding:"40px 20px",color:"var(--txL)"}}>No hay pedidos registrados.</div>}
        </div>}

        {view==="reports"&&<Reports sales={state.sales} products={state.products} purchases={state.purchases} stockAdjustments={state.stockAdjustments} storeName={sName} onDeleteSale={id=>dispatch({type:"DELETE_SALE",payload:id})} expiryDays={expiryDays}/>}
      </main>
      <Modal isOpen={mOpen} onClose={()=>sMOpen(false)} title={eProd?"Editar Producto":"Nuevo Producto"}><ProductForm product={eProd} categories={cats} onSave={saveProd} onCancel={()=>sMOpen(false)}/></Modal>
      <Modal isOpen={poOpen} onClose={()=>sPOOpen(false)} title={editPo?"Editar Pedido":"Ingreso de Mercadería"}><PurchaseForm products={state.products} purchase={editPo} onSave={po=>{if(editPo)dispatch({type:"UPDATE_PURCHASE",payload:po});else dispatch({type:"ADD_PURCHASE",payload:po});sPOOpen(false);sEditPo(null);}} onCancel={()=>{sPOOpen(false);sEditPo(null);}}/></Modal>
      <Modal isOpen={sOpen} onClose={()=>sSOpen(false)} title="Configuración"><Settings storeName={sName} slogan={slogan} categories={cats} products={state.products} expiryDays={expiryDays} reportPin={reportPin} onSave={saveSet} onClose={()=>sSOpen(false)}/></Modal>
    </div>
  );
}
