import React, { useState, useEffect } from 'react';

interface Asset {
  symbol: string;
  rrMultiplier: number;
  minScore: number;
}

interface AllocationEngineProps {
  isDark: boolean;
  execBrokers: string[];
  newlySavedAsset: any; // Receives the new asset from page.tsx
}

export default function AllocationEngine({ isDark, execBrokers, newlySavedAsset }: AllocationEngineProps) {
  const [maxRiskPct, setMaxRiskPct] = useState<number>(0.02); 
  const [brokerMargins, setBrokerMargins] = useState<Record<string, number | string>>({});
  
  // THE FIX: All 6 historically verified assets are now default
  const [assets, setAssets] = useState<Asset[]>([
    { symbol: 'NSE:NIFTYBANK-INDEX', rrMultiplier: 3.0, minScore: 90 },
    { symbol: 'NSE:NIFTY50-INDEX', rrMultiplier: 3.0, minScore: 90 },
    { symbol: 'NSE:RELIANCE-EQ', rrMultiplier: 3.0, minScore: 90 },
    { symbol: 'NSE:HINDALCO-EQ', rrMultiplier: 3.0, minScore: 90 },
    { symbol: 'NSE:HAL-EQ', rrMultiplier: 2.5, minScore: 85 },
    { symbol: 'NSE:HDFCBANK-EQ', rrMultiplier: 2.0, minScore: 95 },
  ]);
  
  const [syncStatus, setSyncStatus] = useState<string>("STANDBY");

  // 1. Listen for new assets saved in the Physics Matrix and add them to the list
  useEffect(() => {
    if (newlySavedAsset) {
      setAssets((prevAssets) => {
        const existsIndex = prevAssets.findIndex(a => a.symbol === newlySavedAsset.symbol);
        if (existsIndex >= 0) {
          const updated = [...prevAssets];
          updated[existsIndex] = newlySavedAsset;
          return updated;
        } else {
          return [newlySavedAsset, ...prevAssets];
        }
      });
      setSyncStatus("UNSYNCED CHANGES"); 
    }
  }, [newlySavedAsset]);

  // 2. Fetch saved Matrix/Risk Rules on boot
  useEffect(() => {
    let isMounted = true;
    const fetchSavedAllocations = async (retries = 10, delay = 1000) => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/allocation");
        if (!response.ok) throw new Error("Backend not ready");
        const json = await response.json();
        
        if (isMounted && json.status === "success" && json.data) {
          setMaxRiskPct(json.data.max_risk_pct || 0.02);
          if (json.data.allocations && Object.keys(json.data.allocations).length > 0) {
             const loadedAssets = Object.keys(json.data.allocations).map(key => ({
               symbol: key,
               rrMultiplier: json.data.allocations[key].rr,
               minScore: json.data.allocations[key].minScore
             }));
             // Only overwrite if the database actually has custom saved allocations
             setAssets(loadedAssets);
          }
        }
      } catch (error) {
        if (retries > 0 && isMounted) {
           setTimeout(() => fetchSavedAllocations(retries - 1, delay), delay);
        }
      }
    };
    fetchSavedAllocations();
    return () => { isMounted = false; };
  }, []);

  // 3. Dynamically fetch live margins based on selected checkboxes
  useEffect(() => {
    const fetchLiveMargins = async () => {
      const currentMargins = { ...brokerMargins };
      
      for (const broker of execBrokers) {
        if (currentMargins[broker] === undefined || currentMargins[broker] === "ERROR") {
          currentMargins[broker] = "FETCHING...";
          setBrokerMargins({ ...currentMargins }); 
          
          try {
            const res = await fetch("http://127.0.0.1:8000/api/live_margin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ broker })
            });
            const data = await res.json();
            
            if (data.status === "success") {
              currentMargins[broker] = data.margin;
            } else {
              currentMargins[broker] = "ERROR";
            }
          } catch (e) {
            currentMargins[broker] = "OFFLINE";
          }
          setBrokerMargins({ ...currentMargins });
        }
      }
    };

    if (execBrokers.length > 0) {
      fetchLiveMargins();
    }
  }, [execBrokers]);

  const handleSyncToEngine = async () => {
    setSyncStatus("SYNCING...");
    try {
      const payload = {
        totalCapital: 0, // No longer used, margin is pulled live
        maxRiskPct: maxRiskPct,
        assets: assets.map(a => ({
          ...a,
          allocated_funds: 0 
        }))
      };

      const response = await fetch("http://127.0.0.1:8000/api/update_allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSyncStatus("SYNCED TO ENGINE");
      } else {
        setSyncStatus("SYNC FAILED");
      }
    } catch (error) {
      setSyncStatus("API DISCONNECTED");
    }
  };

  const handleRemoveAsset = (symbolToRemove: string) => {
    setAssets(assets.filter((a) => a.symbol !== symbolToRemove));
  };

  const theme = {
    bg: isDark ? "bg-gray-900" : "bg-white",
    text: isDark ? "text-white" : "text-gray-800",
    muted: isDark ? "text-gray-400" : "text-gray-500",
    cardBg: isDark ? "bg-gray-800/50" : "bg-gray-100",
    cardBorder: isDark ? "border-gray-700/50" : "border-gray-200",
    itemBg: isDark ? "bg-gray-800" : "bg-white",
    itemBorder: isDark ? "border-gray-700" : "border-gray-200",
  };

  return (
    <div className={`${theme.bg} ${theme.text} p-6 w-full h-full flex flex-col transition-colors duration-200`}>
      
      {/* DYNAMIC BROKER MARGIN FEED */}
      <div className="mb-4 min-h-[60px]">
        <label className={`${theme.muted} text-xs font-semibold uppercase tracking-wider mb-2 block`}>
          Live Node Allocations
        </label>
        
        {execBrokers.length === 0 ? (
           <div className={`p-3 text-xs text-center border rounded ${isDark ? 'border-gray-700 bg-gray-800/30 text-gray-500' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
              Check a broker (Fyers/Dhan) in the Commander to pull live margin.
           </div>
        ) : (
           <div className="grid grid-cols-2 gap-2">
             {execBrokers.map(broker => (
                <div key={broker} className={`p-2 rounded border flex flex-col justify-center items-center ${broker === 'FYERS' ? 'border-orange-500/30 bg-orange-500/10' : 'border-blue-500/30 bg-blue-500/10'}`}>
                   <span className={`text-[10px] font-bold tracking-widest ${broker === 'FYERS' ? 'text-orange-500' : 'text-blue-500'}`}>{broker} NODE</span>
                   <span className="font-mono font-bold text-sm text-green-500">
                     {typeof brokerMargins[broker] === 'number' ? `₹${brokerMargins[broker].toLocaleString()}` : brokerMargins[broker] || "..."}
                   </span>
                </div>
             ))}
           </div>
        )}
      </div>

      {/* RISK SLIDER */}
      <div className={`mb-6 ${theme.cardBg} p-3 rounded-lg border ${theme.cardBorder}`}>
        <div className="flex justify-between items-center mb-2">
          <label className={`${theme.muted} text-xs font-semibold uppercase tracking-wider`}>
            Max Risk Per Node
          </label>
          <span className="text-red-500 font-mono font-bold text-sm">{(maxRiskPct * 100).toFixed(1)}%</span>
        </div>
        <input 
          type="range" 
          min="0.005" 
          max="0.05" 
          step="0.005" 
          value={maxRiskPct} 
          onChange={(e) => {
            setMaxRiskPct(parseFloat(e.target.value));
            setSyncStatus("UNSYNCED CHANGES");
          }}
          className="w-full accent-red-500"
        />
        <p className={`text-[10px] ${theme.muted} mt-1`}>This % applies independently to each active broker's live margin.</p>
      </div>

      {/* BODY: Asset Physics List */}
      <div className="flex-grow overflow-y-auto pr-2 mb-4 space-y-2 custom-scrollbar">
        {assets.map((asset) => (
          <div key={asset.symbol} className={`${theme.itemBg} p-2 rounded flex items-center justify-between border ${theme.itemBorder}`}>
            <div>
              <span className="font-bold text-sm">{asset.symbol}</span>
              <div className={`text-[10px] ${theme.muted} space-x-2`}>
                <span>Score Req: {asset.minScore}</span>
                <span>Target: {asset.rrMultiplier}x</span>
              </div>
            </div>
            <button onClick={() => {
              handleRemoveAsset(asset.symbol);
              setSyncStatus("UNSYNCED CHANGES");
            }} className="text-red-500 hover:text-red-600 text-[10px] font-bold">
              [ REMOVE ]
            </button>
          </div>
        ))}
      </div>

      {/* FOOTER: Sync Button */}
      <button 
        onClick={handleSyncToEngine}
        className={`w-full py-3 rounded font-bold transition-colors ${
          syncStatus === 'SYNCED TO ENGINE' 
            ? 'bg-green-600/20 text-green-600 border border-green-500' 
            : (isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-800 hover:bg-gray-900 text-white')
        }`}
      >
        {syncStatus === "STANDBY" ? "SYNC MATRIX TO NODES" : syncStatus}
      </button>
    </div>
  );
}