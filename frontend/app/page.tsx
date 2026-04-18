"use client";
import { useEffect, useState } from "react";
import AllocationEngine from "./AllocationEngine";

export default function Dashboard() {
  const API_BASE = "http://127.0.0.1:8000";

  const [sysHealth, setSysHealth] = useState({ internet: true, fyers_status: "BOOTING" });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/health`);
        if (res.ok) setSysHealth(await res.json());
        else setSysHealth({ internet: false, fyers_status: "BACKEND_DEAD" });
      } catch (err) { 
        setSysHealth({ internet: false, fyers_status: "BACKEND_DEAD" }); 
      }
      timeoutId = setTimeout(checkHealth, 3000); 
    };
    checkHealth();
    return () => clearTimeout(timeoutId);
  }, []);

  const [isDark, setIsDark] = useState(false);
  const [radarData, setRadarData] = useState<any>(null);
  const [activeTrade, setActiveTrade] = useState<any>(null); 
  const [isRadarActive, setIsRadarActive] = useState(false);
  
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [newTargetSymbol, setNewTargetSymbol] = useState("");
  
  const [newlySavedAsset, setNewlySavedAsset] = useState<any>(null);
  const [radarQueue, setRadarQueue] = useState<any[]>([]);
  const [dismissedSignals, setDismissedSignals] = useState<string[]>([]);
  
  const [customAssets, setCustomAssets] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [tempCustomAsset, setTempCustomAsset] = useState("");

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [vaultTab, setVaultTab] = useState("FYERS"); 
  const [fyersClientId, setFyersClientId] = useState("");
  const [fyersSecretKey, setFyersSecretKey] = useState("");
  const [fyersUrl, setFyersUrl] = useState("");
  const [vaultStatus, setVaultStatus] = useState<string | null>(null);
  const [fyersMaskedToken, setFyersMaskedToken] = useState("Not Configured");
  
  const [dhanClientId, setDhanClientId] = useState("");
  const [dhanToken, setDhanToken] = useState("");
  const [deltaKey, setDeltaKey] = useState("");
  const [deltaSecret, setDeltaSecret] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgBotToken, setTgBotToken] = useState("");

  const [tradingMode, setTradingMode] = useState("PAPER");
  const [scanStartDate, setScanStartDate] = useState("");
  const [scanEndDate, setScanEndDate] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [analytics, setAnalytics] = useState({ win_rate: "--%", profit_factor: "--", max_drawdown: "--", total_trades: "--", wins: "--", losses: "--" });

  const [dataBroker, setDataBroker] = useState("FYERS"); 
  const [execBrokers, setExecBrokers] = useState<string[]>([]); 
  const [market, setMarket] = useState("INDIAN");
  
  const [scanType, setScanType] = useState("INDEX");
  const [executionClass, setExecutionClass] = useState("FUTURES"); 
  const [targetAsset, setTargetAsset] = useState("NSE:NIFTY50-INDEX");
  const marketSymbols: Record<string, string[]> = { INDIAN: ['NSE:NIFTY50-INDEX', 'NSE:NIFTYBANK-INDEX', 'BSE:SENSEX-INDEX'], CRYPTO: ['BTCUSD', 'ETHUSD', 'SOLUSD'] };

  const [index, setIndex] = useState("NIFTY");
  const [optionType, setOptionType] = useState("CE");
  const [spotPrice, setSpotPrice] = useState("22000");
  const [strikeRange, setStrikeRange] = useState(2);
  const [strikeOptions, setStrikeOptions] = useState<string[]>([]);
  const [strike, setStrike] = useState("22000");
  const [activeTab, setActiveTab] = useState("market"); 

  const [lots, setLots] = useState(1);
  const [entryStyle, setEntryStyle] = useState("Non-Aggressive (Mid Entry)");
  const [midZone, setMidZone] = useState("0.00");
  const [bottomZone, setBottomZone] = useState("0.00");
  const [entryPrice, setEntryPrice] = useState("0.00"); 

  const [slType, setSlType] = useState("Auto"); 
  const [atrBuffer, setAtrBuffer] = useState("2.00"); 
  const [manualSL, setManualSL] = useState("0.00");
  const [targetMode, setTargetMode] = useState("HARD TARGET"); 
  const [targetPrice, setTargetPrice] = useState("0.00"); 
  const [trailingSL, setTrailingSL] = useState("0.00");   

  const [sysStatus, setSysStatus] = useState<string | null>(null);
  const [calcEntry, setCalcEntry] = useState(0);
  const [calcSL, setCalcSL] = useState(0);
  const [calcTarget, setCalcTarget] = useState(0); 

  const [accountCapital, setAccountCapital] = useState("150000");
  const [riskPercent, setRiskPercent] = useState("1.0");
  const [suggestedLots, setSuggestedLots] = useState(0);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvTargetAsset, setCsvTargetAsset] = useState("NSE:NIFTY50-INDEX");

  const [assetProfiles, setAssetProfiles] = useState<any>({});
  const [editProfileAsset, setEditProfileAsset] = useState("NSE:NIFTYBANK-INDEX");
  const [editProfileDirections, setEditProfileDirections] = useState<string[]>(["LONG", "SHORT"]);
  const [editProfileScore, setEditProfileScore] = useState("90");
  const [editProfileRisk, setEditProfileRisk] = useState("1.0");
  const [editProfileRr, setEditProfileRr] = useState("3.0");
  const [editProfileStartTime, setEditProfileStartTime] = useState("13:30");
  const [editProfileEndTime, setEditProfileEndTime] = useState("15:00");

  const theme = {
    bg: isDark ? "bg-[#0a0a0a]" : "bg-gray-100",
    text: isDark ? "text-gray-300" : "text-gray-800",
    heading: isDark ? "text-white" : "text-black",
    card: isDark ? "bg-[#111] border-gray-800" : "bg-white border-gray-300 shadow-md",
    input: isDark ? "bg-gray-900 border-gray-700 text-white focus:border-blue-500" : "bg-gray-50 border-gray-300 text-black",
    muted: isDark ? "text-gray-500" : "text-gray-500",
    divider: isDark ? "border-gray-800" : "border-gray-200"
  };

  useEffect(() => {
    const cachedFyersId = localStorage.getItem("fyersClientId");
    const cachedFyersSecret = localStorage.getItem("fyersSecretKey");
    const cachedDhanId = localStorage.getItem("dhanClientId");
    const cachedDeltaKey = localStorage.getItem("deltaKey");
    const cachedTgId = localStorage.getItem("tgChatId");
    const cachedTgToken = localStorage.getItem("tgBotToken");

    if (cachedFyersId) setFyersClientId(cachedFyersId);
    if (cachedFyersSecret) setFyersSecretKey(cachedFyersSecret);
    if (cachedDhanId) setDhanClientId(cachedDhanId);
    if (cachedDeltaKey) setDeltaKey(cachedDeltaKey);
    if (cachedTgId) setTgChatId(cachedTgId);
    if (cachedTgToken) setTgBotToken(cachedTgToken);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/keys/FYERS?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => { if (data.status === "success") setFyersMaskedToken(data.masked_token); })
      .catch(err => console.log("Waiting for Engine..."));
  }, [isSettingsOpen]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const fetchSystemState = async () => {
      try {
        const radarRes = await fetch(`${API_BASE}/api/radar?t=${Date.now()}`);
        if (radarRes.ok) {
            const radarJson = await radarRes.json();
            if (radarJson.status === "success") {
                setRadarData(radarJson.data);
                setIsRadarActive(radarJson.data.status === "ACTIVE"); 
                if (radarJson.data.watchlist) setWatchlist(radarJson.data.watchlist);
                if (radarJson.data.signals && Array.isArray(radarJson.data.signals)) setRadarQueue(radarJson.data.signals);
                else setRadarQueue([]);
            }
        }
        const tradeRes = await fetch(`${API_BASE}/api/trade?t=${Date.now()}`);
        if (tradeRes.ok) {
            const tradeJson = await tradeRes.json();
            if (tradeJson.status === "success") setActiveTrade(tradeJson.data);
        }
      } catch (err) {}
      timeoutId = setTimeout(fetchSystemState, 1000);
    };
    fetchSystemState();
    return () => clearTimeout(timeoutId);
  }, []);

  const handleStageSignal = (signal: any) => {
    const sym = signal.symbol.toUpperCase();
    if (!marketSymbols[market]?.includes(sym) && !customAssets.includes(sym)) {
        setCustomAssets(prev => [...prev, sym]);
    }
    
    setTargetAsset(sym);
    setEntryStyle("Aggressive (Bottom Entry)"); 
    setEntryPrice(signal.entry.toString());
    setSlType("Manual");
    setManualSL(signal.sl.toString());
    setTargetMode("HARD TARGET");
    setTargetPrice(signal.target.toString());
    
    if (signal.instrument === "FUTURES") setExecutionClass("FUTURES");
    else if (signal.instrument === "OPTIONS") setExecutionClass("OPTIONS");
    else setExecutionClass("SPOT");

    setSysStatus(`✅ Signal Staged: ${sym}. Size auto-calculated.`);
    setActiveTab("market"); 
  };

  const handleAddCustomAssetTag = () => {
      const clean = tempCustomAsset.trim().toUpperCase();
      const symbolPattern = /^[A-Z]+:[A-Z0-9_]+-[A-Z]+$/;
      if (!symbolPattern.test(clean)) {
          setSysStatus("❌ Invalid Format. Use EXCHANGE:SYMBOL-TYPE");
          setTimeout(() => setSysStatus(null), 3000);
          return;
      }
      if (!customAssets.includes(clean) && !marketSymbols[market]?.includes(clean)) {
          setCustomAssets([...customAssets, clean]);
          setTargetAsset(clean);
      }
      setTempCustomAsset("");
      setShowCustomInput(false);
  };

  const handleRemoveCustomAssetTag = (symToRemove: string) => {
      setCustomAssets(customAssets.filter(a => a !== symToRemove));
      if (targetAsset === symToRemove && marketSymbols[market]) {
          setTargetAsset(marketSymbols[market][0]);
      }
  };

  const loadAssetProfiles = async (retries = 10, delay = 1000) => {
    try {
      const res = await fetch(`${API_BASE}/api/profiles`);
      if (!res.ok) throw new Error(`Server Rejected`);
      const data = await res.json();
      setAssetProfiles(data || {});
    } catch (err) {
      if (retries > 0) setTimeout(() => loadAssetProfiles(retries - 1, delay), delay);
    }
  };

  useEffect(() => { loadAssetProfiles(); }, []);

  const saveAssetProfile = async () => {
    const riskVal = parseFloat(editProfileRisk);
    const rewardVal = parseFloat(editProfileRr);
    if (isNaN(riskVal) || riskVal <= 0 || isNaN(rewardVal)) {
        setSysStatus("❌ Safety Lock: Risk and Reward must be valid numbers > 0."); return;
    }
    const normalizedMultiplier = rewardVal / riskVal;
    const updatedProfiles = { ...assetProfiles };
    updatedProfiles[editProfileAsset] = { 
        directions: editProfileDirections, 
        min_score: parseInt(editProfileScore), 
        rr_multiplier: normalizedMultiplier,
        start_time: editProfileStartTime,
        end_time: editProfileEndTime
    };
    try {
        await fetch(`${API_BASE}/api/profiles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedProfiles) });
        setAssetProfiles(updatedProfiles);
        setSysStatus(`✅ Physics Override Saved for ${editProfileAsset}`);
        setNewlySavedAsset({ symbol: editProfileAsset, rrMultiplier: normalizedMultiplier, minScore: parseInt(editProfileScore) });
        setTimeout(() => setSysStatus(null), 4000);
    } catch (e) { setSysStatus("❌ Failed to save profile to Vault."); }
  };

  const toggleProfileDirection = (dir: string) => { setEditProfileDirections(prev => prev.includes(dir) ? prev.filter(d => d !== dir) : [...prev, dir]); };

  const populateEditForm = (asset: string) => {
    setEditProfileAsset(asset);
    if (assetProfiles[asset]) {
        setEditProfileDirections(assetProfiles[asset].directions);
        setEditProfileScore(assetProfiles[asset].min_score.toString());
        setEditProfileRr(assetProfiles[asset].rr_multiplier.toString());
        setEditProfileRisk("1.0"); 
        setEditProfileStartTime(assetProfiles[asset].start_time || "13:30");
        setEditProfileEndTime(assetProfiles[asset].end_time || "15:00");
    } else {
        setEditProfileDirections(["LONG", "SHORT"]);
        setEditProfileScore("90");
        setEditProfileRr("3.0");
        setEditProfileRisk("1.0");
        setEditProfileStartTime("13:30");
        setEditProfileEndTime("15:00");
    }
  };

  const handleFyersIdChange = (e: any) => { setFyersClientId(e.target.value); localStorage.setItem("fyersClientId", e.target.value); };
  const handleFyersSecretChange = (e: any) => { setFyersSecretKey(e.target.value); localStorage.setItem("fyersSecretKey", e.target.value); };
  const handleDhanIdChange = (e: any) => { setDhanClientId(e.target.value); localStorage.setItem("dhanClientId", e.target.value); };
  const handleDeltaKeyChange = (e: any) => { setDeltaKey(e.target.value); localStorage.setItem("deltaKey", e.target.value); };
  const handleTgIdChange = (e: any) => { setTgChatId(e.target.value); localStorage.setItem("tgChatId", e.target.value); };
  const handleTgTokenChange = (e: any) => { setTgBotToken(e.target.value); localStorage.setItem("tgBotToken", e.target.value); };

  const handleMarketChange = (e: any) => {
    const newMarket = e.target.value;
    const defaultAssets = marketSymbols[newMarket] || []; 
    setMarket(newMarket); 
    if (defaultAssets.length > 0) setTargetAsset(defaultAssets[0]); 
    setScanType(newMarket === 'INDIAN' ? 'INDEX' : 'CRYPTO'); 
    setExecutionClass(newMarket === 'INDIAN' ? 'FUTURES' : 'FUTURES');
    setExecBrokers([]); 
    setWatchlist(defaultAssets);
    syncWatchlistToBackend(defaultAssets, newMarket);
  };

  const handleIndexChange = (e: any) => {
    const newIndex = e.target.value; setIndex(newIndex);
    if (newIndex === "BANKNIFTY" && spotPrice === "22000") setSpotPrice("47000");
    if (newIndex === "NIFTY" && spotPrice === "47000") setSpotPrice("22000");
  };

  useEffect(() => {
    const spot = parseFloat(spotPrice);
    if (isNaN(spot)) return;
    const step = index === "BANKNIFTY" ? 100 : 50; 
    const atmStrike = Math.round(spot / step) * step;
    const options = [];
    for (let i = -strikeRange; i <= strikeRange; i++) options.push((atmStrike + (i * step)).toString());
    setStrikeOptions(options);
    if (!options.includes(strike)) setStrike(atmStrike.toString());
  }, [index, spotPrice, strikeRange]);

  useEffect(() => {
    const mid = parseFloat(midZone) || 0;
    const bottom = parseFloat(bottomZone) || 0;
    const aggressiveEntry = parseFloat(entryPrice) || 0;
    const isAggressive = entryStyle.includes("Aggressive (Bottom");

    let entry = isAggressive ? aggressiveEntry : mid;
    let sl = slType === "Auto" ? (isAggressive ? aggressiveEntry * 0.89 : bottom - (parseFloat(atrBuffer) || 0)) : parseFloat(manualSL) || 0;

    setCalcEntry(entry); setCalcSL(sl); setCalcTarget(parseFloat(targetPrice) || 0);

    const cap = parseFloat(accountCapital);
    const risk = parseFloat(riskPercent);
    const pointsAtRisk = Math.abs(entry - sl); 

    if (!isNaN(cap) && !isNaN(risk) && pointsAtRisk > 0 && sl > 0) {
        const riskAmount = cap * (risk / 100);
        let lotSize = 1; 
        if (market === "INDIAN" && executionClass === "OPTIONS") {
            lotSize = index === "BANKNIFTY" ? 15 : 50; 
        } else if (market === "INDIAN" && executionClass === "FUTURES" && targetAsset.includes("INDEX")) {
            lotSize = targetAsset.includes("BANK") ? 15 : 50;
        }

        const safeLots = Math.floor(riskAmount / (pointsAtRisk * lotSize));
        const finalSize = safeLots > 0 ? safeLots : 0;
        setSuggestedLots(finalSize);
        if (finalSize > 0) setLots(finalSize); 
    } else { 
        setSuggestedLots(0); 
    }
  }, [entryStyle, midZone, bottomZone, entryPrice, slType, atrBuffer, manualSL, targetPrice, accountCapital, riskPercent, index, market, executionClass, targetAsset]);

  const toggleBroker = (b: string) => { setExecBrokers(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]); };

  const handleArmSystem = async () => {
    setSysStatus("Arming...");
    const symbolPattern = /^[A-Z]+:[A-Z0-9_]+-[A-Z]+$/;
    if (!symbolPattern.test(targetAsset)) {
        setSysStatus("❌ Commander Error: Target Asset Invalid."); setTimeout(() => setSysStatus(null), 5000); return;
    }
    try {
      const payload = {
        trading_mode: tradingMode, data_broker: dataBroker, execution_brokers: execBrokers, 
        market: market, target_asset: targetAsset, index: index, option_type: optionType, strike: strike, 
        lots: lots || 1, entry_style: entryStyle, entry_price: calcEntry, mid_zone: parseFloat(midZone) || 0.0, 
        bottom_zone: parseFloat(bottomZone) || 0.0, sl_type: slType, atr_buffer: parseFloat(atrBuffer) || 0.0, 
        sl_price: calcSL, target_mode: targetMode, target_price: calcTarget, trailing_sl_points: parseFloat(trailingSL) || 0.0,
        asset_class: executionClass,
        armed_time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})
      };
      const response = await fetch(`${API_BASE}/api/arm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (response.ok && data.status === "success") {
          setSysStatus(`🟢 ARMED (${tradingMode}) & PENDING`); setTimeout(() => setSysStatus(null), 3000);
      } else { setSysStatus(data.message || "Backend Rejected Payload"); }
    } catch (err) { setSysStatus("❌ Network Error connecting to Engine."); }
  };

  const handleToggleRadar = async () => {
    const newAction = isRadarActive ? "stop" : "start";
    setIsRadarActive(!isRadarActive); 
    try {
      const response = await fetch(`${API_BASE}/api/radar/toggle`, {
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ action: newAction, market: market, watchlist: watchlist, data_broker: dataBroker }),
      });
      if (!response.ok) throw new Error("Backend Offline");
    } catch (err) { setIsRadarActive(isRadarActive); setSysStatus("❌ Engine is offline."); }
  };

  const syncWatchlistToBackend = async (updatedList: string[], forceMarket?: string) => {
    const activeMarket = forceMarket || market;
    if (!isRadarActive) return; 
    try {
      await fetch(`${API_BASE}/api/radar/toggle`, {
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ action: "start", market: activeMarket, watchlist: updatedList, data_broker: dataBroker }),
      });
    } catch (err) {}
  };

  const handleAddWatchlistTarget = () => {
      const cleanSymbol = newTargetSymbol.trim().toUpperCase();
      if (!cleanSymbol) return;
      const symbolPattern = /^[A-Z]+:[A-Z0-9_]+-[A-Z]+$/;
      if (!symbolPattern.test(cleanSymbol)) {
          setSysStatus("❌ Radar Error: Invalid Format.");
          setTimeout(() => setSysStatus(null), 4000);
          return;
      }
      if (!watchlist.includes(cleanSymbol)) {
          const newList = [...watchlist, cleanSymbol];
          setWatchlist(newList);
          syncWatchlistToBackend(newList);
      }
      setNewTargetSymbol("");
  };

  const handleRemoveWatchlistTarget = (symToRemove: string) => {
      const newList = watchlist.filter(sym => sym !== symToRemove);
      setWatchlist(newList);
      syncWatchlistToBackend(newList);
  };

  const handleGlobalDisarm = async () => {
    setSysStatus("Disarming all pending...");
    try { await fetch(`${API_BASE}/api/disarm`, { method: "POST" }); setSysStatus("🔴 ALL PENDING DISARMED"); setTimeout(() => setSysStatus(null), 3000);} 
    catch (err) { setSysStatus("❌ Error"); }
  };

  const handleGlobalForceExit = async () => {
    if (!window.confirm("🚨 WARNING: This will instantly liquidate ALL active positions at MARKET price. Proceed?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/force-exit`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") setSysStatus("🚨 ENTIRE BOOK FLATTENED VIA FORCE EXIT.");
      else alert(`❌ Failed: ${data.message}`);
    } catch (err) { alert("❌ ERROR: Could not reach execution server."); }
  };

  const handleSpecificTradeAction = async (trade_id: string, action: string) => {
    if (action === "FORCE_EXIT" && !window.confirm(`⚠️ Liquidate position ${trade_id} at Market?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/trade/action`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trade_id, action }) });
      const data = await res.json();
      if (data.status !== "success") alert(`❌ Failed: ${data.message}`);
    } catch (err) { alert("❌ ERROR: Could not reach execution server."); }
  };

  const handleClearDeadReceipts = async () => {
    try {
      await fetch(`${API_BASE}/api/trade/clear_dead`, { method: "POST" });
      setSysStatus("🧹 Blotter Swept Clean."); setTimeout(() => setSysStatus(null), 3000);
    } catch (err) { alert("❌ ERROR: Could not reach execution server."); }
  };

  const handleFyersLogin = async () => {
    if (!fyersClientId) { setVaultStatus("❌ Please enter your Fyers Client ID first."); return; }
    try {
      const res = await fetch(`${API_BASE}/api/settings/fyers/login?client_id=${fyersClientId}`);
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank"); 
    } catch (e) { setVaultStatus("❌ Failed to get login URL."); }
  };

  const handleSaveFyersUrl = async () => {
    if (!fyersClientId || !fyersSecretKey || !fyersUrl) { setVaultStatus("❌ Complete all 3 fields."); return; }
    setVaultStatus("Initiating Secure Handshake...");
    try {
      const response = await fetch(`${API_BASE}/api/settings/fyers/extract`, {
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ client_id: fyersClientId, secret_key: fyersSecretKey, redirect_url: fyersUrl }),
      });
      const data = await response.json();
      setVaultStatus(data.status === "success" ? `✅ ${data.message}` : `❌ ${data.message}`);
      if (data.status === "success") setFyersUrl("");
    } catch (e) { setVaultStatus("❌ Connection to Vault failed."); }
  };

  const saveStaticKeys = async (brokerName: string, clientId: string, token: string) => {
    setVaultStatus(`Securing ${brokerName} credentials...`);
    try {
      const response = await fetch(`${API_BASE}/api/settings/keys/save`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ broker: brokerName, client_id: clientId, access_token: token }),
      });
      const data = await response.json();
      setVaultStatus(data.status === "success" ? `✅ ${data.message}` : `❌ Error`);
    } catch (e) { setVaultStatus("❌ Connection to Vault failed."); }
  };

  const handleHistoricalScan = async () => {
      if (!scanStartDate || !scanEndDate) { setSysStatus("❌ Select Start Date and End Date."); return; }
      setScanResults(null); setAnalytics({ win_rate: "--%", profit_factor: "--", max_drawdown: "--", total_trades: "--", wins: "--", losses: "--" });
      setIsScanning(true); setSysStatus(`⏳ Running Historical Matrix for ${targetAsset}...`);
      try {
          const response = await fetch(`${API_BASE}/api/analytics/historical-scan`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ market: market, target_asset: targetAsset, data_broker: dataBroker, start_date: scanStartDate, end_date: scanEndDate })
          });
          const data = await response.json();
          if (data.status === "success") { setScanResults(data.data); setAnalytics(data.data.metrics); setSysStatus("✅ Historical Scan Complete."); } 
          else { setSysStatus(`❌ Scan Failed: ${data.message}`); }
      } catch (err) { setSysStatus("❌ Connection lost during scan."); }
      setIsScanning(false);
  };

  const handleCustomScan = async () => {
      if (!selectedFile) { setSysStatus("❌ Please select a CSV file first."); return; }
      setSysStatus(`⏳ Uploading & Scanning ${selectedFile.name}...`);
      setIsScanning(true); setScanResults(null); setAnalytics({ win_rate: "--%", profit_factor: "--", max_drawdown: "--", total_trades: "--", wins: "--", losses: "--" });
      const formData = new FormData(); formData.append("file", selectedFile); formData.append("target_asset", csvTargetAsset);
      try {
          const response = await fetch(`${API_BASE}/api/analytics/custom-scan`, { method: "POST", body: formData });
          const data = await response.json();
          if (data.status === "success") { setScanResults(data.data); setAnalytics(data.data.metrics); setSysStatus(`✅ Custom Scan Complete. Profit Factor: ${data.data.metrics.profit_factor}`); } 
          else { setSysStatus(`❌ Scan Failed`); }
      } catch (err) { setSysStatus("❌ Network error during custom scan."); }
      setIsScanning(false);
  };
  
  const downloadCustomLedger = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/download-ledger`);
      if (!response.ok) throw new Error("Ledger file not found");
      const blob = await response.blob(); const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `V11_Custom_Ledger_${csvTargetAsset.replace(":", "_")}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch (err) { setSysStatus("❌ Failed to download custom ledger."); }
  };

  const downloadExcel = () => {
    if (!scanResults || !scanResults.ledger || scanResults.ledger.length === 0) { setSysStatus("❌ No data to export."); return; }
    const headers = ["Entry Time", "Asset", "Type", "Setup", "Zone Bottom", "Zone Top", "Entry Price", "Stop Loss", "Target", "Exit Time", "Outcome", "Net PnL"];
    const csvRows = [headers.join(",")];
    scanResults.ledger.forEach((t: any) => { csvRows.push(`${t.entry_time},${t.asset},${t.type},"${t.setup}",${t.zone_bot},${t.zone_top},${t.entry},${t.sl},${t.target},${t.exit_time},${t.outcome},${t.pnl}`); });
    if (typeof window !== "undefined" && typeof document !== "undefined") {
        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" }); const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `Quant_Ledger_${targetAsset}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} p-8 font-sans relative`}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
      `}</style>
      
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className={`w-full max-w-lg p-6 rounded-lg border shadow-2xl ${isDark ? 'bg-[#111] border-gray-700' : 'bg-white border-gray-300'}`}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold flex items-center gap-2">🔐 Security Vault</h2><button onClick={() => {setIsSettingsOpen(false); setVaultStatus(null);}} className="text-gray-500 hover:text-red-500 font-bold">✕ Close</button></div>
            <div className="flex border-b border-gray-700 mb-6"><button onClick={()=>setVaultTab("FYERS")} className={`flex-1 py-2 text-[10px] font-bold tracking-wider ${vaultTab === 'FYERS' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500'}`}>FYERS</button><button onClick={()=>setVaultTab("DHAN")} className={`flex-1 py-2 text-[10px] font-bold tracking-wider ${vaultTab === 'DHAN' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}>DHAN</button><button onClick={()=>setVaultTab("DELTA")} className={`flex-1 py-2 text-[10px] font-bold tracking-wider ${vaultTab === 'DELTA' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-500'}`}>DELTA</button><button onClick={()=>setVaultTab("TELEGRAM")} className={`flex-1 py-2 text-[10px] font-bold tracking-wider ${vaultTab === 'TELEGRAM' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-500'}`}>ALERTS</button></div>
            <div className={`p-4 rounded-md border mb-6 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              {vaultTab === "FYERS" && ( <div><div className="grid grid-cols-2 gap-2 mb-3"><div><label className={`block text-[10px] uppercase tracking-wider ${theme.muted} mb-1 font-bold`}>Client ID (App ID)</label><input type="text" value={fyersClientId} onChange={handleFyersIdChange} className={`w-full p-2 text-xs rounded border ${theme.input} outline-none`} /></div><div><label className={`block text-[10px] uppercase tracking-wider ${theme.muted} mb-1 font-bold`}>App Secret Key</label><input type="password" value={fyersSecretKey} onChange={handleFyersSecretChange} className={`w-full p-2 text-xs rounded border ${theme.input} outline-none`} /></div></div><button onClick={handleFyersLogin} disabled={!fyersClientId} className={`w-full py-2 mb-4 text-sm font-bold rounded transition-colors ${fyersClientId ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>1. Open Fyers Login Link</button><label className={`block text-xs ${theme.muted} mb-1`}>2. Paste Redirect URL Here:</label><textarea value={fyersUrl} onChange={(e) => setFyersUrl(e.target.value)} className={`w-full p-2 h-16 text-xs rounded border ${theme.input} outline-none resize-none mb-2`} /><button onClick={handleSaveFyersUrl} disabled={!fyersUrl || !fyersClientId || !fyersSecretKey} className={`w-full py-2 text-sm font-bold rounded transition-colors ${(fyersUrl && fyersClientId && fyersSecretKey) ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>3. Extract & Secure Token</button><div className="mt-4 text-xs text-center text-gray-500">Current Token: <span className="font-mono text-emerald-500">{fyersMaskedToken}</span></div></div> )}
              {vaultTab === "DHAN" && ( <div><label className={`block text-xs ${theme.muted} mb-1 font-bold`}>Dhan Client ID</label><input type="text" value={dhanClientId} onChange={handleDhanIdChange} className={`w-full p-2 mb-3 text-xs rounded-md border ${theme.input} outline-none`} /><label className={`block text-xs ${theme.muted} mb-1 font-bold`}>API Access Token</label><input type="password" value={dhanToken} onChange={(e)=>setDhanToken(e.target.value)} className={`w-full p-2 mb-4 text-xs rounded-md border ${theme.input} outline-none`} /><button onClick={() => saveStaticKeys("DHAN", dhanClientId, dhanToken)} disabled={!dhanClientId || !dhanToken} className={`w-full py-2 text-sm font-bold rounded-md transition-colors ${dhanClientId && dhanToken ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>Secure Dhan Keys</button></div> )}
              {vaultTab === "DELTA" && ( <div><label className={`block text-xs ${theme.muted} mb-1 font-bold`}>API Key (Public)</label><input type="text" value={deltaKey} onChange={handleDeltaKeyChange} className={`w-full p-2 mb-3 text-xs rounded-md border ${theme.input} outline-none`} /><label className={`block text-xs ${theme.muted} mb-1 font-bold`}>API Secret (Private)</label><input type="password" value={deltaSecret} onChange={(e)=>setDeltaSecret(e.target.value)} className={`w-full p-2 mb-4 text-xs rounded-md border ${theme.input} outline-none`} /><button onClick={() => saveStaticKeys("DELTA", deltaKey, deltaSecret)} disabled={!deltaKey || !deltaSecret} className={`w-full py-2 text-sm font-bold rounded-md transition-colors ${deltaKey && deltaSecret ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>Secure Delta Keys</button></div> )}
              {vaultTab === "TELEGRAM" && ( <div><label className={`block text-xs ${theme.muted} mb-1 font-bold`}>Telegram Chat ID</label><input type="text" value={tgChatId} onChange={handleTgIdChange} className={`w-full p-2 mb-3 text-xs rounded-md border ${theme.input} outline-none`} /><label className={`block text-xs ${theme.muted} mb-1 font-bold`}>BotFather Access Token</label><input type="password" value={tgBotToken} onChange={handleTgTokenChange} className={`w-full p-2 mb-4 text-xs rounded-md border ${theme.input} outline-none`} /><button onClick={() => saveStaticKeys("TELEGRAM", tgChatId, tgBotToken)} disabled={!tgChatId || !tgBotToken} className={`w-full py-2 text-sm font-bold rounded-md transition-colors ${tgChatId && tgBotToken ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>Secure Mobile Alerts</button></div> )}
              {vaultStatus && <div className="mt-4 text-xs font-bold text-center border-t border-gray-700 pt-3">{vaultStatus}</div>}
            </div>
          </div>
        </div>
      )}

      {(!sysHealth.internet || sysHealth.fyers_status === "EXPIRED" || sysHealth.fyers_status === "MISSING_KEYS" || sysHealth.fyers_status === "BACKEND_DEAD") && (
          <div className="mb-6 p-4 rounded-md bg-red-900/80 border border-red-500 flex items-center justify-center shadow-lg shadow-red-900/50 z-50">
              <div className="text-center font-mono">
                  {!sysHealth.internet || sysHealth.fyers_status === "BACKEND_DEAD" ? (
                      <><p className="text-white text-xl font-bold tracking-widest animate-pulse">⚠️ CRITICAL: SYSTEM OFFLINE</p><p className="text-red-200 text-sm mt-1">No internet connection detected, or the backend engine is dead.</p></>
                  ) : (
                      <><p className="text-yellow-400 text-xl font-bold tracking-widest animate-pulse">🔒 FYERS UNAUTHORIZED</p><p className="text-yellow-200 text-sm mt-1">API Token expired or missing. Please navigate to Settings and Re-Login.</p></>
                  )}
              </div>
          </div>
      )}

      <header className={`mb-6 border-b ${theme.divider} pb-4 flex justify-between items-center`}>
        <h1 className={`text-2xl font-bold ${theme.heading}`}>ALGO // COMMAND</h1>
        <div className="flex space-x-4">
            <button onClick={() => setIsSettingsOpen(true)} className={`px-4 py-1 text-xs font-bold rounded-md border flex items-center gap-2 ${isDark ? 'border-gray-700 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 bg-white hover:bg-gray-100'}`}>⚙️ Vault Settings</button>
            <button onClick={() => setIsDark(!isDark)} className={`px-3 py-1 text-xs rounded-full border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}>Theme</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: THE COMMANDER & BACKTESTER */}
        <div className="lg:col-span-2">
          <div className={`border ${theme.card} rounded-lg p-6 mb-6 shadow-sm`}>
            
            <div className={`flex justify-between items-center mb-6 border-b ${theme.divider} pb-4`}>
                <h2 className={`text-xl font-bold ${theme.heading} flex items-center gap-2`}><span className="text-orange-500">⚡</span> Smart Bracket Commander _Taraka_K_</h2>
                <div className="flex items-center gap-6">
                  <div className={`flex items-center rounded-lg p-1 border ${tradingMode === 'PAPER' ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                     <button onClick={() => setTradingMode("PAPER")} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${tradingMode === 'PAPER' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>👻 PAPER</button>
                     <button onClick={() => setTradingMode("LIVE")} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${tradingMode === 'LIVE' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>🔥 LIVE</button>
                  </div>
                  <div className="flex space-x-3 text-sm">
                      <label className="flex items-center space-x-1"><input type="checkbox" checked={execBrokers.includes("DHAN")} onChange={() => toggleBroker("DHAN")} className="accent-blue-500" /> <span className="font-bold text-blue-500">DHAN</span></label>
                      <label className="flex items-center space-x-1"><input type="checkbox" checked={execBrokers.includes("FYERS")} onChange={() => toggleBroker("FYERS")} className="accent-orange-500" /> <span className="font-bold text-orange-500">FYERS</span></label>
                  </div>
                </div>
            </div>

            <div className={`flex border-b ${theme.divider} mb-6 overflow-x-auto`}>
              <button onClick={() => setActiveTab("market")} className={`pb-2 px-4 whitespace-nowrap text-sm font-semibold flex items-center gap-2 ${activeTab === "market" ? "text-blue-500 border-b-2 border-blue-500" : theme.muted}`}>🛒 Parameters</button>
              <button onClick={() => setActiveTab("sl")} className={`pb-2 px-4 whitespace-nowrap text-sm font-semibold flex items-center gap-2 ${activeTab === "sl" ? "text-blue-500 border-b-2 border-blue-500" : theme.muted}`}>🛡️ Limit (SL)</button>
              <button onClick={() => setActiveTab("target")} className={`pb-2 px-4 whitespace-nowrap text-sm font-semibold flex items-center gap-2 ${activeTab === "target" ? "text-blue-500 border-b-2 border-blue-500" : theme.muted}`}>🎯 Target & Exit</button>
              <button onClick={() => setActiveTab("portfolio")} className={`pb-2 px-4 whitespace-nowrap text-sm font-semibold flex items-center gap-2 ${activeTab === "portfolio" ? "text-blue-500 border-b-2 border-blue-500" : theme.muted}`}>📋 Positions & Orders</button>
              <button onClick={() => setActiveTab("analytics")} className={`pb-2 px-4 whitespace-nowrap text-sm font-semibold flex items-center gap-2 ${activeTab === "analytics" ? "text-indigo-500 border-b-2 border-indigo-500" : theme.muted}`}>📊 Analytics</button>
              <button onClick={() => setActiveTab("profiles")} className={`pb-2 px-4 whitespace-nowrap text-sm font-semibold flex items-center gap-2 ${activeTab === "profiles" ? "text-purple-500 border-b-2 border-purple-500" : theme.muted}`}>⚙️ Physics</button>
            </div>

            {activeTab === "market" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-700/50">
                  <div>
                    <label className={`block text-xs ${theme.muted} mb-2 font-bold`}>Data Feed Market</label>
                    <select value={market} onChange={handleMarketChange} className={`w-full max-w-xs p-2 rounded-md border font-bold ${market === 'CRYPTO' ? 'text-yellow-500' : 'text-blue-500'} ${theme.input} outline-none`}>
                      <option value="INDIAN">🇮🇳 INDIAN NSE/BSE</option>
                      <option value="CRYPTO">🪙 CRYPTO (Delta)</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs ${theme.muted} mb-2 font-bold flex items-center gap-2`}>
                       <span>Commander Target Asset</span>
                    </label>
                    <div className="flex flex-wrap gap-2 items-center">
                       {marketSymbols[market]?.map(sym => (
                          <button key={sym} onClick={() => setTargetAsset(sym)} className={`px-3 py-1.5 text-xs font-bold font-mono rounded border transition-colors ${targetAsset === sym ? 'bg-blue-600 text-white border-blue-600 shadow-md' : (isDark ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100')}`}>{sym}</button>
                       ))}
                       {customAssets.map(sym => (
                          <div key={sym} className={`flex items-center rounded border transition-colors overflow-hidden ${targetAsset === sym ? 'bg-blue-600 text-white border-blue-600 shadow-md' : (isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-300 text-gray-600')}`}>
                            <button onClick={() => setTargetAsset(sym)} className="px-3 py-1.5 text-xs font-bold font-mono">{sym}</button>
                            <button onClick={() => handleRemoveCustomAssetTag(sym)} className={`px-2 py-1.5 text-xs border-l transition-colors ${targetAsset === sym ? 'border-blue-500 hover:bg-blue-700' : (isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100')}`}>✕</button>
                          </div>
                       ))}
                       {showCustomInput ? (
                          <div className="flex items-center gap-1">
                            <input type="text" autoFocus value={tempCustomAsset} onChange={e=>setTempCustomAsset(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCustomAssetTag()} placeholder="EXCHANGE:SYMBOL-EQ" className={`w-44 px-2 py-1.5 text-[10px] font-mono rounded border ${theme.input} outline-none uppercase`} />
                            <button onClick={handleAddCustomAssetTag} className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold">ADD</button>
                            <button onClick={() => setShowCustomInput(false)} className="px-2 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-[10px] font-bold">✕</button>
                          </div>
                       ) : (
                          <button onClick={() => setShowCustomInput(true)} className={`px-3 py-1.5 text-xs font-bold border border-dashed rounded transition-colors ${isDark ? 'border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-400' : 'border-gray-400 text-gray-500 hover:text-gray-700 hover:border-gray-600'}`}>+ Custom</button>
                       )}
                    </div>
                  </div>
                </div>

                <div className="mb-6 pb-4 border-b border-gray-700/50">
                  <label className={`block text-xs ${theme.muted} mb-2 font-bold`}>Execution Asset Class (Routing)</label>
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="executionClass" value="OPTIONS" checked={executionClass === "OPTIONS"} onChange={(e) => setExecutionClass(e.target.value)} className="accent-blue-500" /><span className="text-sm font-bold text-gray-400">Options</span></label>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="executionClass" value="SPOT" checked={executionClass === "SPOT"} onChange={(e) => setExecutionClass(e.target.value)} className="accent-emerald-500" /><span className="text-sm font-bold text-gray-400">Spot / Equity</span></label>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="executionClass" value="FUTURES" checked={executionClass === "FUTURES"} onChange={(e) => setExecutionClass(e.target.value)} className="accent-yellow-500" /><span className="text-sm font-bold text-gray-400">Futures</span></label>
                  </div>
                </div>

                {executionClass === "OPTIONS" && (
                  <>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div><label className={`block text-xs ${theme.muted} mb-1`}>Index</label><select value={index} onChange={handleIndexChange} className={`w-full p-2 rounded-md border ${theme.input} outline-none`}><option>NIFTY</option><option>BANKNIFTY</option></select></div>
                      <div><label className={`block text-xs ${theme.muted} mb-1`}>Type</label><div className="flex space-x-4 mt-2"><label className="flex items-center space-x-1"><input type="radio" checked={optionType==="CE"} onChange={()=>setOptionType("CE")} className="accent-red-500" /> <span>CE</span></label><label className="flex items-center space-x-1"><input type="radio" checked={optionType==="PE"} onChange={()=>setOptionType("PE")} className="accent-red-500" /> <span>PE</span></label></div></div>
                      <div><label className={`block text-xs ${theme.muted} mb-1`}>Spot Price</label><input type="number" value={spotPrice} onChange={(e)=>setSpotPrice(e.target.value)} className={`w-full p-2 rounded-md border ${theme.input} outline-none`} /></div>
                      <div><div className="flex justify-between items-center mb-1"><label className={`block text-xs ${theme.muted}`}>Range</label><span className="text-xs text-red-500 font-bold">{strikeRange}</span></div><input type="range" min="1" max="6" value={strikeRange} onChange={(e) => setStrikeRange(parseInt(e.target.value))} className="w-full accent-red-500 mt-2" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div><label className={`block text-xs ${theme.muted} mb-1`}>Select Strike</label><select value={strike} onChange={(e)=>setStrike(e.target.value)} className={`w-full p-2 rounded-md border ${theme.input} outline-none`}>{strikeOptions.map((opt) => ( <option key={opt} value={opt}>{opt}</option> ))}</select></div>
                    </div>
                  </>
                )}

                <div className="mb-4">
                  <label className={`block text-xs ${theme.muted} mb-2`}>Entry Style:</label>
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2"><input type="radio" checked={entryStyle === "Non-Aggressive (Mid Entry)"} onChange={()=>setEntryStyle("Non-Aggressive (Mid Entry)")} className="accent-red-500" /> <span>Non-Aggressive (Mid Entry)</span></label>
                    <label className="flex items-center space-x-2"><input type="radio" checked={entryStyle === "Aggressive (Bottom Entry)"} onChange={()=>setEntryStyle("Aggressive (Bottom Entry)")} className="accent-red-500" /> <span>Aggressive (Explicit Entry)</span></label>
                  </div>
                </div>

                {entryStyle === "Non-Aggressive (Mid Entry)" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={`block text-xs ${theme.muted} mb-1`}>Mid Zone</label><input type="number" value={midZone} onChange={(e)=>setMidZone(e.target.value)} className={`w-full p-2 rounded-md border ${theme.input} outline-none`} step="0.05" /></div>
                      <div><label className={`block text-xs ${theme.muted} mb-1`}>Bottom Zone</label><input type="number" value={bottomZone} onChange={(e)=>setBottomZone(e.target.value)} className={`w-full p-2 rounded-md border ${theme.input} outline-none`} step="0.05" /></div>
                    </div>
                ) : (
                    <div><label className={`block text-xs ${theme.muted} mb-1`}>Entry Price</label><input type="number" value={entryPrice} onChange={(e)=>setEntryPrice(e.target.value)} className={`w-full p-2 rounded-md border ${theme.input} outline-none`} step="0.05" /></div>
                )}

                <div className="mt-6 border-t border-gray-700/50 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${theme.heading}`}><span className="text-orange-500 text-lg">🏦</span> Master Node Allocation</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2"><span className={`text-[9px] font-bold uppercase ${theme.muted}`}>Capital:</span><input type="number" value={accountCapital} onChange={(e)=>setAccountCapital(e.target.value)} className={`w-24 px-2 py-0.5 text-[10px] rounded border font-mono ${theme.input} outline-none`} /></div>
                            <div className="flex items-center gap-2"><span className={`text-[9px] font-bold uppercase ${theme.muted}`}>Risk:</span><input type="number" value={riskPercent} onChange={(e)=>setRiskPercent(e.target.value)} className={`w-14 px-2 py-0.5 text-[10px] rounded border font-mono ${theme.input} outline-none`} step="0.5" /><span className={`text-[9px] font-bold ${theme.muted}`}>%</span></div>
                        </div>
                    </div>
                    <div className={`border rounded-lg overflow-hidden shadow-sm h-[200px] ${isDark ? 'border-gray-800 bg-[#0f1115]' : 'border-gray-200 bg-white'}`}>
                       <AllocationEngine isDark={isDark} execBrokers={execBrokers} newlySavedAsset={newlySavedAsset} />
                    </div>
                </div>
              </>
            )}

            {activeTab === "sl" && (
              <div className="mb-6">
                <label className={`block text-xs ${theme.muted} mb-2`}>SL Type:</label>
                <div className="flex space-x-6 mb-4">
                  <label className="flex items-center space-x-2"><input type="radio" checked={slType === "Auto"} onChange={()=>setSlType("Auto")} className="accent-red-500" /> <span>Auto</span></label>
                  <label className="flex items-center space-x-2"><input type="radio" checked={slType === "Manual"} onChange={()=>setSlType("Manual")} className="accent-red-500" /> <span>Manual</span></label>
                </div>
                {slType === "Auto" && entryStyle.includes("Non") && ( <div><label className={`block text-xs text-blue-500 font-bold mb-1`}>ATR Buffer</label><input type="number" value={atrBuffer} onChange={(e)=>setAtrBuffer(e.target.value)} className={`w-full p-2 rounded-md border ${theme.input} outline-none`} step="0.5" /></div> )}
                {slType === "Auto" && !entryStyle.includes("Non") && ( <div className="text-sm text-red-400 font-bold bg-red-900/20 p-3 rounded-md border border-red-900/50">Aggressive Rule Active.</div> )}
                {slType === "Manual" && ( <div><label className={`block text-xs ${theme.muted} mb-1`}>Manual SL Price</label><input type="number" value={manualSL} onChange={(e)=>setManualSL(e.target.value)} className={`w-full p-2 rounded-md border ${theme.input} outline-none`} step="0.05" /></div> )}
              </div>
            )}

            {activeTab === "target" && (
              <div className="mb-6">
                <label className={`block text-xs ${theme.muted} mb-2`}>Choose Exit Mode:</label>
                <div className="flex space-x-6 mb-4">
                  <label className="flex items-center space-x-2"><input type="radio" checked={targetMode === "HARD TARGET"} onChange={()=>setTargetMode("HARD TARGET")} className="accent-red-500" /> <span>HARD TARGET</span></label>
                  <label className="flex items-center space-x-2"><input type="radio" checked={targetMode === "TRAILING SL"} onChange={()=>setTargetMode("TRAILING SL")} className="accent-red-500" /> <span className="text-red-500 font-bold">TRAILING SL</span></label>
                </div>
                <div className="mb-4"><label className={`block text-xs ${theme.muted} mb-1`}>📈 Target Ref Price</label><input type="number" value={targetPrice} onChange={(e)=>setTargetPrice(e.target.value)} className={`w-full p-2 rounded-md border ${theme.input} outline-none`} step="0.05"/></div>
                {targetMode === "TRAILING SL" && ( <div><label className={`block text-xs text-orange-500 font-bold mb-1`}>📉 Trailing SL Gap</label><input type="number" value={trailingSL} onChange={(e)=>setTrailingSL(e.target.value)} className={`w-full p-2 rounded-md border border-orange-500/50 bg-orange-900/10 text-white outline-none`} step="0.5" /></div> )}
              </div>
            )}

            {activeTab === "portfolio" && (
              <div className="mb-6">
                <div className={`flex justify-between items-center mb-3 pb-2 border-b ${theme.divider}`}>
                  <h3 className={`text-sm font-bold ${theme.muted} uppercase tracking-wider flex items-center gap-2`}>
                      <span>Live Operations Portfolio</span>
                      <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full text-[10px]">{Object.keys(activeTrade || {}).length} Tracked</span>
                  </h3>
                  {activeTrade && Object.values(activeTrade).some((t: any) => ["COMPLETED", "CLOSED_EOD", "DISARMED", "FORCE_EXIT", "FAILED_EXECUTION"].includes(t.status)) && (
                    <button onClick={handleClearDeadReceipts} className="px-3 py-1 bg-gray-500/10 text-gray-500 hover:bg-gray-500 hover:text-white border border-gray-500/30 rounded text-[9px] font-bold tracking-widest transition-all">🧹 CLEAR DEAD RECEIPTS</button>
                  )}
                </div>
                
                {(!activeTrade || Object.keys(activeTrade).length === 0) ? (
                  <div className={`p-8 rounded-md border text-center ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}><p className={`text-sm font-bold ${theme.muted}`}>No Active Operations.</p></div>
                ) : (
                  <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.values(activeTrade).sort((a:any, b:any) => {
                        const scoreA = a.status === "LIVE" ? 3 : (a.status === "ROUTING_PENDING" || a.status === "EXIT_PENDING") ? 2 : a.status === "SNIPER_WAITING" ? 1 : 0;
                        const scoreB = b.status === "LIVE" ? 3 : (b.status === "ROUTING_PENDING" || b.status === "EXIT_PENDING") ? 2 : b.status === "SNIPER_WAITING" ? 1 : 0;
                        return scoreB - scoreA;
                    }).map((trade: any) => {
                        
                        // 🚨 UI FIX: Mapped exact backend status logic to prevent UX glitches
                        const status = trade.status || "";
                        const isTradeCompleted = ["COMPLETED", "CLOSED_EOD", "DISARMED", "FORCE_EXIT", "FAILED_EXECUTION", "VETOED_ILLIQUID", "VETOED_CORRELATION", "VETOED_GOD_LIMIT"].includes(status);
                        const isTradeLive = status === "LIVE" || status === "EXIT_PENDING";
                        const isRouting = status === "ROUTING_PENDING";
                        const isSniper = status === "SNIPER_WAITING";
                        
                        return (
                          <div key={trade.trade_id} className={`p-5 rounded-md border shadow-sm transition-colors ${
                              isTradeCompleted ? (trade.exit_reason?.includes('TARGET') ? (isDark ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-emerald-50 border-emerald-300') : (isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-300')) 
                              : isTradeLive ? (isDark ? 'bg-[#0f1115] border-emerald-500/50 shadow-emerald-500/10' : 'bg-white border-emerald-500/50 shadow-emerald-500/10') 
                              : (isDark ? 'bg-[#0f1115] border-yellow-500/30' : 'bg-white border-yellow-500/30')
                          }`}>
                            <div className="flex justify-between items-center mb-4 border-b border-gray-700/50 pb-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isTradeCompleted ? (trade.exit_reason?.includes('TARGET') ? 'bg-emerald-500' : 'bg-gray-500') : isTradeLive ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                                <div className="flex flex-col">
                                    <span className={`font-bold text-sm tracking-widest ${isTradeCompleted ? (trade.exit_reason?.includes('TARGET') ? 'text-emerald-500' : 'text-gray-500') : isTradeLive ? 'text-emerald-500' : isRouting ? 'text-blue-500' : 'text-yellow-500'}`}>
                                        {isTradeCompleted ? 'TRADE CONCLUDED' : isTradeLive ? 'LIVE IN MARKET' : isRouting ? 'ROUTING ORDER...' : 'SNIPER ARMED'}
                                    </span>
                                    {(trade.execution_time || trade.armed_time) && (
                                        <span className="text-[9px] text-gray-500 font-mono mt-0.5">
                                            {isTradeCompleted ? `Exited: ${trade.exit_time || '--:--'}` : isTradeLive ? `Placed: ${trade.execution_time}` : `Armed: ${trade.armed_time}`}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-widest ${trade.setup_direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-500' : trade.setup_direction === 'SHORT' ? 'bg-red-500/20 text-red-500' : 'bg-gray-500/20 text-gray-500'}`}>{trade.setup_direction || 'ORDER'}</span>
                                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${trade.is_paper ? 'bg-indigo-500 text-white' : 'bg-red-500 text-white'}`}>{trade.is_paper ? 'PAPER' : 'LIVE'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  {!isTradeCompleted ? (
                                      <><button onClick={() => handleSpecificTradeAction(trade.trade_id, "DISARM")} className="px-2 py-1 bg-yellow-600/10 text-yellow-600 border border-yellow-600/30 rounded text-[9px] hover:bg-yellow-600 hover:text-white transition-colors font-bold tracking-widest">🛑 DISARM</button><button onClick={() => handleSpecificTradeAction(trade.trade_id, "FORCE_EXIT")} className="px-2 py-1 bg-red-600/10 text-red-500 border border-red-600/30 rounded text-[9px] hover:bg-red-600 hover:text-white transition-colors font-bold tracking-widest">⚠️ EJECT</button></>
                                  ) : (
                                      <button onClick={() => handleSpecificTradeAction(trade.trade_id, "DISMISS")} className="text-gray-500 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                  )}
                              </div>
                            </div>
                            
                            {isTradeCompleted ? (
                                <div className="flex flex-col gap-4">
                                  <div><p className={`text-xs ${theme.muted} uppercase font-semibold`}>Final Outcome</p><p className={`text-xl font-bold ${trade.exit_reason?.includes('TARGET') ? 'text-emerald-500' : trade.exit_reason?.includes('STOP') ? 'text-red-500' : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>{trade.exit_reason || "TERMINATED"}</p></div>
                                  <div className="grid grid-cols-4 gap-4 border-t border-gray-700/50 pt-4">
                                     <div><p className={`text-xs ${theme.muted} font-semibold`}>Asset</p><p className={`text-sm font-bold ${theme.heading}`}>{trade.target_asset || trade.index_symbol}</p></div>
                                     <div><p className={`text-xs ${theme.muted} font-semibold`}>Direction</p><p className={`text-sm font-bold ${trade.setup_direction === 'LONG' ? 'text-emerald-500' : 'text-red-500'}`}>{trade.setup_direction || "ORDER"}</p></div>
                                     <div><p className={`text-xs ${theme.muted} font-semibold`}>Exit Price</p><p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>₹{Number(trade.exit_price || 0).toFixed(2)}</p></div>
                                     {trade.realized_pnl !== undefined ? (
                                        <div><p className={`text-xs ${theme.muted} font-semibold`}>Realized PnL</p><p className={`text-sm font-bold ${trade.realized_pnl > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{trade.realized_pnl > 0 ? '+' : ''}₹{trade.realized_pnl.toFixed(2)} <span className="text-[9px] text-gray-500 block">({trade.realized_pts.toFixed(2)} pts)</span></p></div>
                                     ) : (
                                        <div><p className={`text-xs ${theme.muted} font-semibold`}>Realized PnL</p><p className={`text-sm font-bold text-gray-500`}>--</p></div>
                                     )}
                                  </div>
                                </div>
                            ) : (
                                <>
                                {/* 🚨 UI FIX: Dynamic Status HUD (Sniper vs Routing vs Live) */}
                                {isSniper && ( 
                                   <div className={`mb-4 px-3 py-2 rounded text-xs font-mono border ${isDark ? 'bg-yellow-900/10 border-yellow-500/30 text-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                                      <span className="font-bold block mb-1">⏳ SNIPER WAITING</span>
                                      <span className="text-[10px]">Waiting for {trade.target_asset || trade.index_symbol} to cross ₹{Number(trade.index_trigger_price || trade.entry_price || 0).toFixed(2)} to fire limit order.</span>
                                   </div> 
                                )}
                                {isRouting && ( 
                                   <div className={`mb-4 px-3 py-2 rounded text-xs font-mono border ${isDark ? 'bg-blue-900/10 border-blue-500/30 text-blue-500' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                      <span className="font-bold block mb-1 animate-pulse">🔄 ROUTING ORDER TO EXCHANGE...</span>
                                      <span className="text-[10px]">Executing limit order at ₹{Number(trade.index_trigger_price || trade.entry_price || 0).toFixed(2)}. Awaiting broker confirmation.</span>
                                   </div> 
                                )}
                                {isTradeLive && (
                                   <div className={`mb-4 px-3 py-2 rounded text-xs font-mono border ${isDark ? 'bg-emerald-900/10 border-emerald-500/30 text-emerald-500' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <span className="font-bold block mb-1">🔥 LIVE IN MARKET {status === 'EXIT_PENDING' && <span className="text-red-500">(CLOSING POS...)</span>}</span>
                                              <span className="text-[10px] text-gray-500">Live Price: ₹{trade.live_price ? trade.live_price.toFixed(2) : '--'}</span>
                                          </div>
                                          <div className="text-right">
                                              <span className="text-[10px] text-gray-500 block mb-1 uppercase tracking-widest">Unrealized MTM</span>
                                              {trade.unrealized_pnl !== undefined ? (
                                                  <span className={`text-lg font-bold ${trade.unrealized_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                      {trade.unrealized_pnl >= 0 ? '+' : ''}₹{trade.unrealized_pnl.toFixed(2)}
                                                  </span>
                                              ) : (
                                                  <span className="text-lg font-bold text-gray-500">₹0.00</span>
                                              )}
                                              {trade.unrealized_pts !== undefined && (
                                                  <span className="block text-[9px] text-gray-500">({trade.unrealized_pts >= 0 ? '+' : ''}{trade.unrealized_pts.toFixed(2)} pts)</span>
                                              )}
                                          </div>
                                      </div>
                                   </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                  <div><p className={`text-xs ${theme.muted} uppercase font-semibold`}>Instrument</p><p className={`text-lg font-bold ${theme.heading}`}>{trade.target_asset || trade.index_symbol}</p></div>
                                  <div><p className={`text-xs ${theme.muted} uppercase font-semibold`}>Route</p><p className={`text-lg font-bold text-emerald-500`}>{trade.active_broker || trade.data_broker || "FYERS"}</p></div>
                                  <div className="col-span-2 grid grid-cols-4 gap-4 mt-2 border-t border-gray-700/50 pt-4">
                                     <div><p className={`text-xs ${theme.muted} font-semibold`}>{trade.asset_class === "EQUITY" ? "Shares" : "Lots"}</p><p className={`text-md font-bold ${theme.heading}`}>{trade.lots}</p></div>
                                     <div><p className={`text-xs ${theme.muted} font-semibold`}>Entry</p><p className={`text-md font-bold text-yellow-500`}>₹{Number(trade.index_trigger_price || trade.entry_price || 0).toFixed(2)}</p></div>
                                     <div><p className={`text-xs ${theme.muted} font-semibold`}>Limit (SL)</p><p className={`text-md font-bold text-blue-500`}>₹{Number(trade.index_sl || trade.sl_price || 0).toFixed(2)}</p></div>
                                     <div><p className={`text-xs ${theme.muted} font-semibold`}>Target</p><p className={`text-md font-bold text-pink-500`}>₹{Number(trade.index_target || trade.target_price || 0).toFixed(2)}</p></div>
                                  </div>
                                </div>
                                </>
                            )}
                          </div>
                        );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="mb-6">
                <div className={`flex justify-between items-center mb-4 pb-2 border-b ${theme.divider}`}>
                    <h3 className={`text-sm font-bold ${theme.muted} uppercase tracking-wider`}>Quantitative API Backtester</h3>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-1 rounded uppercase font-bold tracking-widest">Target: {targetAsset}</span>
                </div>
                <div className={`p-4 rounded-lg border mb-6 ${isDark ? 'bg-[#0f1115] border-gray-800' : 'bg-gray-50 border-gray-200'} flex items-end gap-4`}>
                    <div className="flex-1"><label className={`block text-xs font-bold uppercase ${theme.muted} mb-1`}>Start Date</label><input type="date" value={scanStartDate} onChange={(e) => setScanStartDate(e.target.value)} className={`w-full p-2 text-sm rounded border ${theme.input} outline-none`} /></div>
                    <div className="flex-1"><label className={`block text-xs font-bold uppercase ${theme.muted} mb-1`}>End Date</label><input type="date" value={scanEndDate} onChange={(e) => setScanEndDate(e.target.value)} className={`w-full p-2 text-sm rounded border ${theme.input} outline-none`} /></div>
                    <button onClick={handleHistoricalScan} disabled={isScanning} className={`px-6 py-2 h-[38px] text-sm font-bold tracking-wider rounded-md transition-colors ${isScanning ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'}`}>API SCAN</button>
                    <button onClick={downloadExcel} disabled={isScanning || !scanResults} className={`px-4 py-2 h-[38px] text-sm font-bold tracking-wider rounded-md transition-colors ${!scanResults ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'}`}>⬇️ CSV</button>
                </div>
                <div className={`p-4 mt-4 rounded-lg border mb-6 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${theme.muted} mb-3 flex items-center gap-2`}><span className="text-purple-500">⚡</span> Dynamic Offline Engine (Deep Matrix)</h4>
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className={`block text-[10px] font-bold uppercase ${theme.muted} mb-1`}>Asset Name (For Ledger)</label>
                            <input type="text" value={csvTargetAsset} onChange={(e) => setCsvTargetAsset(e.target.value)} className={`w-full p-2 text-sm rounded border ${theme.input} outline-none uppercase font-mono`} />
                        </div>
                        <div className="flex-1">
                            <label className={`block text-[10px] font-bold uppercase ${theme.muted} mb-1`}>Select Local CSV</label>
                            <input type="file" accept=".csv" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className={`w-full p-1.5 text-sm rounded border ${theme.input} outline-none`} />
                        </div>
                        <button onClick={handleCustomScan} disabled={isScanning || !selectedFile} className={`px-6 py-2 h-[38px] text-[10px] font-bold tracking-wider rounded-md transition-colors ${isScanning || !selectedFile ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'}`}>UPLOAD & SCAN</button>
                        <button onClick={downloadCustomLedger} disabled={isScanning || !scanResults} className={`px-4 py-2 h-[38px] flex items-center justify-center text-[10px] font-bold tracking-wider rounded-md transition-colors ${!scanResults ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'}`}>⬇️ V11 LEDGER</button>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}><p className={`text-[10px] ${theme.muted} font-bold uppercase tracking-wider mb-1`}>Win Rate</p><div className="flex items-end gap-2"><p className={`text-2xl font-bold ${analytics.win_rate !== '--%' ? 'text-emerald-500' : theme.muted}`}>{analytics.win_rate}</p><p className="text-xs text-gray-500 mb-1">({analytics.wins}W / {analytics.losses}L)</p></div></div>
                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}><p className={`text-[10px] ${theme.muted} font-bold uppercase tracking-wider mb-1`}>Profit Factor</p><div className="flex items-end gap-2"><p className={`text-2xl font-bold ${analytics.profit_factor !== '--' ? 'text-blue-500' : theme.muted}`}>{analytics.profit_factor}</p><p className="text-xs text-gray-500 mb-1">Gross W/L</p></div></div>
                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}><p className={`text-[10px] ${theme.muted} font-bold uppercase tracking-wider mb-1`}>Max Drawdown</p><div className="flex items-end gap-2"><p className={`text-2xl font-bold ${analytics.max_drawdown !== '--' ? 'text-red-500' : theme.muted}`}>{analytics.max_drawdown}</p><p className="text-xs text-gray-500 mb-1">Peak-to-Trough</p></div></div>
                </div>
                <div className={`mt-6 rounded-lg border ${isDark ? 'border-gray-800' : 'border-gray-200'} overflow-hidden`}>
                    <div className={`px-4 py-2 border-b ${theme.divider} ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}><h4 className={`text-xs font-bold uppercase tracking-widest ${theme.muted}`}>Trade Ledger</h4></div>
                    <div className={`max-h-64 overflow-y-auto ${isDark ? 'bg-[#0f1115]' : 'bg-white'} custom-scrollbar`}>
                        {isScanning ? ( <div className="flex flex-col items-center justify-center p-8 space-y-4"><div className="w-8 h-8 border-t-2 border-indigo-500 rounded-full animate-spin"></div></div>
                        ) : scanResults && scanResults.ledger && scanResults.ledger.length > 0 ? (
                            <table className="w-full text-left text-xs">
                                <thead className={`sticky top-0 shadow-sm z-10 ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}><tr><th className="p-3">Time</th><th className="p-3">Setup</th><th className="p-3">Zone/SL</th><th className="p-3">Entry/TG</th><th className="p-3 text-right">Outcome</th></tr></thead>
                                <tbody>
                                    {scanResults.ledger.map((trade: any, idx: number) => (
                                        <tr key={idx} className={`border-b ${isDark ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                            <td className="p-3 font-mono text-[10px] text-gray-500">{trade?.entry_time ? String(trade.entry_time).split('.')[0] : '--'}</td>
                                            <td className={`p-3 font-bold ${trade?.type?.includes('LONG') ? 'text-emerald-500' : 'text-red-500'}`}>{trade?.type} <span className="text-gray-500 font-normal text-[10px]">({trade?.setup})</span></td>
                                            <td className="p-3 text-gray-400 font-mono text-[10px]">Z: {trade?.zone_bot} - {trade?.zone_top}<br/><span className="text-red-400 font-bold">SL: {trade?.sl}</span></td>
                                            <td className="p-3 text-gray-400 font-mono text-[10px]">{trade?.entry} ➝ {trade?.target}</td>
                                            <td className="p-3 text-right"><span className={`px-2 py-1 rounded font-bold tracking-widest text-[9px] ${trade?.outcome === 'WIN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{trade?.outcome} {(trade?.pnl || 0) > 0 ? `(+${(trade?.pnl || 0).toFixed(1)})` : `(${(trade?.pnl || 0).toFixed(1)})`}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : ( <div className="p-8 text-center text-xs text-gray-500">No trades recorded.</div> )}
                    </div>
                </div>
              </div>
            )}

            {activeTab === "profiles" && (
              <div className="mb-6">
                <h3 className={`text-sm font-bold ${theme.muted} uppercase tracking-wider mb-4 flex items-center gap-2`}><span className="text-purple-500 text-lg">⚙️</span> Dynamic Asset Physics Matrix</h3>
                <div className="flex gap-4 mb-6">
                   <select value={editProfileAsset} onChange={(e) => populateEditForm(e.target.value)} className={`w-1/2 p-2 rounded border font-mono text-sm uppercase ${theme.input}`}>
                      <option value="NSE:NIFTYBANK-INDEX">NSE:NIFTYBANK-INDEX</option>
                      <option value="NSE:NIFTY50-INDEX">NSE:NIFTY50-INDEX</option>
                      {Object.keys(assetProfiles).map(k => !["NSE:NIFTYBANK-INDEX", "NSE:NIFTY50-INDEX"].includes(k) && <option key={k} value={k}>{k}</option>)}
                   </select>
                   <input type="text" placeholder="Or type custom (e.g. NSE:TCS-EQ)" onBlur={(e) => {if(e.target.value) populateEditForm(e.target.value.toUpperCase())}} className={`w-1/2 p-2 rounded border font-mono text-sm uppercase ${theme.input}`} />
                </div>
                <div className={`p-5 rounded-lg border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                      <div>
                         <label className={`block text-[10px] font-bold uppercase tracking-wider ${theme.muted} mb-3`}>Directional Bias</label>
                         <div className="flex gap-4">
                            <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${editProfileDirections.includes("LONG") ? 'bg-emerald-900/10 border-emerald-500/50' : (isDark ? 'border-gray-800' : 'border-gray-300')}`}><input type="checkbox" checked={editProfileDirections.includes("LONG")} onChange={() => toggleProfileDirection("LONG")} className="accent-emerald-500 w-4 h-4"/> <span className={`text-xs font-bold ${editProfileDirections.includes("LONG") ? 'text-emerald-500' : theme.muted}`}>LONG</span></label>
                            <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${editProfileDirections.includes("SHORT") ? 'bg-red-900/10 border-red-500/50' : (isDark ? 'border-gray-800' : 'border-gray-300')}`}><input type="checkbox" checked={editProfileDirections.includes("SHORT")} onChange={() => toggleProfileDirection("SHORT")} className="accent-red-500 w-4 h-4"/> <span className={`text-xs font-bold ${editProfileDirections.includes("SHORT") ? 'text-red-500' : theme.muted}`}>SHORT</span></label>
                         </div>
                      </div>
                      <div className="space-y-4">
                          <div><label className={`block text-[10px] font-bold uppercase tracking-wider ${theme.muted} mb-1 flex justify-between`}><span>Kinetic Score</span><span className="text-blue-500">{editProfileScore} / 100</span></label><input type="range" min="80" max="100" value={editProfileScore} onChange={(e) => setEditProfileScore(e.target.value)} className="w-full accent-blue-500" /></div>
                          <div>
                             <div className={`flex justify-between items-center mb-2`}><span className={`text-[10px] font-bold uppercase tracking-wider ${theme.muted}`}>Target Ratio (R:R)</span>
                                 <div className="flex items-center gap-2"><input type="number" min="0.1" step="0.1" value={editProfileRisk} onChange={(e) => setEditProfileRisk(e.target.value)} className={`w-14 p-1 text-xs text-center rounded border font-bold ${isDark ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-white border-gray-300'} outline-none`} /><span className="text-orange-500 font-bold text-xs">:</span><input type="number" min="0.1" step="0.1" value={editProfileRr} onChange={(e) => setEditProfileRr(e.target.value)} className={`w-14 p-1 text-xs text-center rounded border font-bold ${isDark ? 'bg-gray-900 border-gray-700 text-orange-500' : 'bg-white border-gray-300'} outline-none`} /></div>
                             </div>
                          </div>
                      </div>
                      
                      <div className="col-span-1 md:col-span-2 pt-5 border-t border-gray-700/50">
                          <label className={`block text-[10px] font-bold uppercase tracking-wider ${theme.muted} mb-3`}>Active Trading Window (Entry Time Gate)</label>
                          <div className="flex items-center gap-4 mb-3">
                              <input type="time" value={editProfileStartTime} onChange={(e) => setEditProfileStartTime(e.target.value)} className={`p-2 text-xs rounded border font-mono font-bold ${theme.input} outline-none`} />
                              <span className="text-gray-500 font-bold text-xs uppercase">to</span>
                              <input type="time" value={editProfileEndTime} onChange={(e) => setEditProfileEndTime(e.target.value)} className={`p-2 text-xs rounded border font-mono font-bold ${theme.input} outline-none`} />
                          </div>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 p-2 rounded inline-flex items-center gap-2">
                              <span className="text-yellow-500 text-sm">💡</span>
                              <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400">13:30 to 15:00 is the Golden Period. Expanding this exposes the engine to morning whipsaws and chop.</span>
                          </div>
                      </div>
                   </div>
                   <button onClick={saveAssetProfile} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold tracking-widest text-xs rounded shadow-md">💾 SAVE OVERRIDE</button>
                </div>
              </div>
            )}

            {activeTab !== "portfolio" && activeTab !== "analytics" && activeTab !== "profiles" && (
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                  <div className={`mb-4 p-3 rounded-md border shadow-sm flex items-center justify-between ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center gap-4 divide-x dark:divide-gray-700 divide-gray-200">
                          <div className="px-2">
                              <p className={`text-[9px] uppercase tracking-widest font-bold ${theme.muted} mb-0.5`}>Asset</p>
                              <p className={`text-xs font-bold font-mono ${theme.heading}`}>{targetAsset}</p>
                          </div>
                          <div className="px-4">
                              <p className={`text-[9px] uppercase tracking-widest font-bold ${theme.muted} mb-0.5`}>Entry</p>
                              <p className="text-xs font-bold font-mono text-yellow-500">{calcEntry.toFixed(2)}</p>
                          </div>
                          <div className="px-4">
                              <p className={`text-[9px] uppercase tracking-widest font-bold ${theme.muted} mb-0.5`}>Limit (SL)</p>
                              <p className="text-xs font-bold font-mono text-red-500">{calcSL.toFixed(2)}</p>
                          </div>
                          <div className="px-4">
                              <p className={`text-[9px] uppercase tracking-widest font-bold ${theme.muted} mb-0.5`}>Target</p>
                              <p className="text-xs font-bold font-mono text-emerald-500">{calcTarget.toFixed(2)}</p>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-emerald-500/10 px-3 py-1.5 rounded border border-emerald-500/30">
                          <span className={`text-[10px] font-bold uppercase text-emerald-500`}>Auto-Qty:</span>
                          <input type="number" value={lots} onChange={(e)=>setLots(Number(e.target.value))} className={`w-16 text-sm font-bold font-mono text-center bg-transparent text-emerald-400 outline-none`} />
                      </div>
                  </div>

                  {sysStatus && ( <div className={`text-center text-sm font-bold mb-4 ${sysStatus.includes("❌") ? "text-red-500 bg-red-900/10 p-2 rounded" : "text-emerald-500 bg-emerald-900/10 p-2 rounded"}`}>{sysStatus}</div> )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleArmSystem} className={`py-3 rounded-md font-bold tracking-wider flex items-center justify-center gap-2 border ${tradingMode === 'PAPER' ? 'bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-700 shadow-md' : 'bg-red-600 text-white hover:bg-red-500 border-red-700 shadow-md'}`}>🚀 ARM SYSTEM ({tradingMode})</button>
                    <button onClick={handleGlobalDisarm} className={`py-3 rounded-md font-bold tracking-wider flex items-center justify-center gap-2 border ${isDark ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-300 bg-white text-gray-700'}`}>🛑 DISARM ALL PENDING</button>
                  </div>
                  <button onClick={handleGlobalForceExit} className="w-full mt-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600 font-bold py-3 px-4 rounded transition-all flex justify-center items-center gap-2 shadow-sm">
                    🚨 FORCE EXIT (FLATTEN BOOK)
                  </button>
                </div>
            )}
            
          </div>
        </div>

        {/* RIGHT COLUMN: RADAR QUEUE */}
        <div className="flex flex-col gap-6 lg:col-span-1">
           <div className={`border ${theme.card} rounded-lg shadow-sm p-4 h-full`}>
             <div className={`flex justify-between items-center mb-4 border-b ${theme.divider} pb-2`}>
               <h3 className={`text-xs ${theme.muted} font-bold uppercase tracking-widest`}>Multi-Asset Radar</h3>
               <label className="flex items-center cursor-pointer">
                 <div className="relative">
                   <input type="checkbox" className="sr-only" checked={isRadarActive} onChange={handleToggleRadar} />
                   <div className={`block w-10 h-6 rounded-full ${isRadarActive ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
                   <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isRadarActive ? 'transform translate-x-4' : ''}`}></div>
                 </div>
               </label>
             </div>

             <div className="mb-4">
               <div className="flex gap-2 mb-3">
                 <input type="text" value={newTargetSymbol} onChange={(e) => setNewTargetSymbol(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddWatchlistTarget()} placeholder="e.g. NSE:TCS-EQ" className={`flex-1 p-2 text-xs rounded border ${theme.input} outline-none uppercase font-mono`} />
                 <button onClick={handleAddWatchlistTarget} disabled={!isRadarActive} className={`px-4 py-2 text-[10px] font-bold rounded uppercase tracking-wider transition-all ${isRadarActive ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>ADD</button>
               </div>
               
               <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                 {watchlist.map((sym) => (
                   <div key={sym} className={`flex items-center gap-2 px-2 py-1 rounded border text-[10px] font-mono font-bold ${isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                     {sym}
                     <button onClick={() => handleRemoveWatchlistTarget(sym)} disabled={!isRadarActive} className="text-red-500 hover:text-red-400 font-bold ml-1">✕</button>
                   </div>
                 ))}
                 {watchlist.length === 0 && <span className="text-[10px] text-gray-500 italic">Watchlist is empty. Radar is blind.</span>}
               </div>
             </div>

             {(!radarData || radarData.status === "STANDBY") && ( <div className={`flex flex-col items-center justify-center py-8 border-t ${theme.divider}`}><p className={`text-xs ${theme.muted}`}>Radar is in standby mode.</p></div> )}
             {radarData && radarData.status === "ACTIVE" && ( 
               <div className={`flex flex-col items-center justify-center py-4 border-t ${theme.divider}`}>
                 {!radarData.scan_error ? (
                   <div className="flex items-center gap-3">
                     <div className="w-4 h-4 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
                     <p className={`text-xs font-mono font-bold ${theme.muted}`}>{radarData.scan_status || `Awaiting 5-minute candle close...`}</p>
                   </div>
                 ) : (
                   <>
                     <div className="w-8 h-8 flex items-center justify-center text-red-500 text-2xl mb-2">⚠️</div>
                     <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">SCAN FAULT</p>
                     <p className="text-[10px] text-red-400 font-mono text-center px-4">{radarData.scan_error}</p>
                   </>
                 )}
               </div> 
             )}
             
             <div className={`mt-4 pt-4 border-t ${theme.divider} flex-1`}>
                <h3 className={`text-[10px] font-bold uppercase tracking-widest ${theme.muted} mb-3 flex items-center justify-between`}>
                    <span>📡 Active Signal Queue</span>
                    <span className="bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full">
                        {radarQueue.filter(s => !dismissedSignals.includes(s.id || `${s.symbol}-${s.timestamp}`)).length}
                    </span>
                </h3>
                
                {/* 🚨 UI FIX: Unique Key Fallback added to prevent entire queue from disappearing on dismiss */}
                {radarQueue.filter(s => !dismissedSignals.includes(s.id || `${s.symbol}-${s.timestamp}`)).length === 0 ? (
                  <p className="text-gray-500 text-xs italic text-center py-4">Waiting for kinetic setups...</p>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {radarQueue.filter(s => !dismissedSignals.includes(s.id || `${s.symbol}-${s.timestamp}`)).map((signal) => {
                      const sigId = signal.id || `${signal.symbol}-${signal.timestamp}`;
                      return (
                      <div 
                        key={sigId} 
                        onClick={() => handleStageSignal(signal)}
                        className={`shrink-0 cursor-pointer border transition-all rounded-lg p-3 relative overflow-hidden group ${isDark ? 'bg-gray-800/50 border-emerald-500/30 hover:border-emerald-500' : 'bg-emerald-50 border-emerald-200 hover:border-emerald-500 shadow-sm'}`}
                      >
                        <button 
                            onClick={(e) => { e.stopPropagation(); setDismissedSignals(prev => [...prev, sigId]); }}
                            className={`absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold z-20 transition-all ${isDark ? 'bg-gray-900 text-gray-500 hover:text-red-500 hover:bg-red-900/20' : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                        >
                            ✕
                        </button>
                        
                        <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                        <div className="flex justify-between items-center mb-2 relative z-10 pr-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{signal.symbol}</span>
                            <span className="text-[9px] text-gray-500 font-mono mt-0.5">
                                ⏱️ {new Date(signal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                            </span>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-600 border'}`}>
                            {signal.score} Pts
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 relative z-10">{signal.type} ({signal.instrument})</div>
                        <div className={`flex justify-between items-center text-[10px] font-mono relative z-10 p-2 rounded ${isDark ? 'bg-black/40' : 'bg-white/60 border border-emerald-200'}`}>
                          <div className="text-left">
                              <span className="text-gray-500 block text-[8px] mb-0.5 font-sans tracking-widest">ENTRY</span>
                              <span className={isDark ? 'text-gray-200' : 'text-gray-800'}>{Number(signal.entry).toFixed(2)}</span>
                          </div>
                          <div className="text-center">
                              <span className="text-gray-500 block text-[8px] mb-0.5 font-sans tracking-widest">STOP LOSS</span>
                              <span className="text-red-500">{Number(signal.sl).toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                              <span className="text-gray-500 block text-[8px] mb-0.5 font-sans tracking-widest">TARGET</span>
                              <span className="text-emerald-500">{Number(signal.target).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="mt-3 text-[9px] font-bold text-center text-emerald-600/70 dark:text-emerald-400/50 uppercase tracking-widest animate-pulse relative z-10">Click to Auto-Fill & Stage ⚡</div>
                      </div>
                    )})}
                  </div>
                )}
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}