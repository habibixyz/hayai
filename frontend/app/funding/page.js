"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { assetColor } from "../../lib/api";

const HL = "https://api.hyperliquid.xyz/info";
function round(n,d=2){return Math.round((n||0)*10**d)/10**d;}
function fmt(n){if(!n&&n!==0)return"—";const a=Math.abs(n);if(a>=1e9)return`$${(n/1e9).toFixed(2)}B`;if(a>=1e6)return`$${(n/1e6).toFixed(2)}M`;if(a>=1e3)return`$${(n/1e3).toFixed(1)}K`;return`$${n.toFixed(2)}`;}

export default function FundingPage() {
  const [rates,setRates]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("all");

  useEffect(()=>{
    const fetch_=async()=>{
      try{
        const [mc,mids]=await Promise.all([
          fetch(HL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"metaAndAssetCtxs"})}).then(r=>r.json()),
          fetch(HL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"allMids"})}).then(r=>r.json()),
        ]);
        const universe=mc[0]?.universe||[],contexts=mc[1]||[];
        const data=universe.map((asset,i)=>{
          const ctx=contexts[i]||{},funding=parseFloat(ctx.funding||0),mid=parseFloat(mids[asset.name]||0);
          return{asset:asset.name,funding8h:round(funding*100,5),fundingAnnual:round(funding*100*3*365,2),
            openInterest:round(parseFloat(ctx.openInterest||0)*mid),mid:round(mid,mid>=100?2:5),
            sentiment:funding>0.0001?"LONG_HEAVY":funding<-0.0001?"SHORT_HEAVY":"NEUTRAL"};
        }).filter(a=>a.mid>0).sort((a,b)=>Math.abs(b.funding8h)-Math.abs(a.funding8h));
        setRates(data);
      }catch(e){console.error(e);}
      finally{setLoading(false);}
    };
    fetch_();const t=setInterval(fetch_,15000);return()=>clearInterval(t);
  },[]);

  const filtered=rates.filter(r=>filter==="positive"?r.funding8h>0:filter==="negative"?r.funding8h<0:true);

  return(
    <div className="max-w-5xl mx-auto px-4 py-5">
      <Link href="/" className="text-[10px] font-mono text-[#2a4060] hover:text-[#5a7a9a]">← Markets</Link>
      <div className="flex items-center justify-between mt-4 mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#e8f0f8]">Funding Rates</h1>
          <p className="text-[11px] font-mono text-[#2a4060] mt-0.5">Positive = longs pay shorts · Negative = shorts pay longs · every 8h</p>
        </div>
        <div className="flex gap-0.5 bg-[#111720] border border-[#1e2a38] rounded-lg p-0.5">
          {[["all","All"],["positive","Long Heavy"],["negative","Short Heavy"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium transition-all ${filter===v?"bg-[#00e8c6]/12 text-[#00e8c6] border border-[#00e8c6]/20":"text-[#5a7a9a] hover:text-[#e8f0f8]"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e2a38]" style={{background:"#0d1420"}}>
              {["Asset","Funding/8h","Annualised","Sentiment","Open Interest","Price"].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-[#2a4060] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?Array.from({length:10}).map((_,i)=>(
              <tr key={i} className="border-b border-[#1e2a38]">
                {Array.from({length:6}).map((_,j)=>(<td key={j} className="px-4 py-3.5"><div className="h-3 shimmer rounded" style={{width:`${40+(j*15)%45}%`}}/></td>))}
              </tr>
            )):filtered.map(r=>{
              const color=assetColor(r.asset),pos=r.funding8h>=0,extreme=Math.abs(r.funding8h)>0.01;
              return(
                <tr key={r.asset} className="border-b border-[#1e2a38] hover:bg-[#111720] transition-colors cursor-pointer"
                  onClick={()=>window.location.href=`/market/${r.asset}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-mono font-bold"
                        style={{background:`${color}18`,border:`1px solid ${color}30`,color}}>{r.asset.slice(0,3)}</div>
                      <span className="text-[13px] font-semibold text-[#e8f0f8]">{r.asset}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[13px] font-mono font-bold ${pos?"text-[#0cd98a]":"text-[#f0444b]"}`}>
                      {pos?"+":""}{r.funding8h.toFixed(5)}%{extreme&&<span className="ml-1">🔥</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3.5"><span className={`text-[12px] font-mono ${pos?"text-[#0cd98a]/70":"text-[#f0444b]/70"}`}>{pos?"+":""}{r.fundingAnnual.toFixed(1)}%</span></td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-mono px-2 py-1 rounded font-semibold ${r.sentiment==="LONG_HEAVY"?"badge-long":r.sentiment==="SHORT_HEAVY"?"badge-short":"text-[#5a7a9a] bg-[#243040]/50 border border-[#243040]"}`}>
                      {r.sentiment.replace("_"," ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] font-mono text-[#5a7a9a]">{fmt(r.openInterest)}</td>
                  <td className="px-4 py-3.5 text-[12px] font-mono text-[#e8f0f8]">${r.mid>=100?r.mid.toFixed(2):r.mid.toFixed(5)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[9px] font-mono text-[#2a4060] text-center">Refreshes every 15s · click row to see chart</p>
    </div>
  );
}
