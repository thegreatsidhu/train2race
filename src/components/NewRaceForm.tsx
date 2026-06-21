"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const PRESET_DISTANCES: Record<string, number> = { "5K":5000,"10K":10000,"Half Marathon":21097.5,"Marathon":42195,"Ultra (50K)":50000,"Sprint Triathlon":25750,"Olympic Triathlon":51500,"70.3 Half Ironman":113000,"140.6 Full Ironman":226000 };
const MIN_WEEKS: Record<string, number> = { "5K":4,"10K":6,"Half Marathon":8,"Marathon":16,"Ultra (50K)":20,"Sprint Triathlon":8,"Olympic Triathlon":12,"70.3 Half Ironman":16,"140.6 Full Ironman":20 };
const TRIATHLON_DISTANCES = ["Sprint Triathlon","Olympic Triathlon","70.3 Half Ironman","140.6 Full Ironman"];
function distanceToKey(m: number): string {
  if(m<=5500)return"5K";if(m<=11000)return"10K";if(m<=22000)return"Half Marathon";if(m<=43000)return"Marathon";if(m<=55000)return"Ultra (50K)";if(m<=30000)return"Sprint Triathlon";if(m<=60000)return"Olympic Triathlon";if(m<=120000)return"70.3 Half Ironman";return"140.6 Full Ironman";
}

export function NewRaceForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [distance, setDistance] = useState("Half Marathon");
  const [raceType, setRaceType] = useState("main");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMajorRace, setSelectedMajorRace] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(true);

  useEffect(() => {
    if (!search || search.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/major-races?search=${encodeURIComponent(search)}&upcoming=1`).then(r=>r.json()).then(d=>{setSearchResults(d.races||[]);setSearching(false);});
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function selectMajorRace(race: any) {
    setSelectedMajorRace(race);
    setRaceName(race.name);
    setRaceDate(new Date(race.raceDate).toISOString().slice(0,10));
    setDistance(distanceToKey(race.distanceM));
    setSearch(""); setSearchResults([]); setShowSearch(false);
  }
  function clearMajorRace() { setSelectedMajorRace(null); setRaceName(""); setRaceDate(""); setShowSearch(true); }

  const isTriathlon = TRIATHLON_DISTANCES.includes(distance);
  const weeksToRace = raceDate ? Math.round((new Date(raceDate).getTime()-Date.now())/(7*24*60*60*1000)) : 0;
  const minWeeks = MIN_WEEKS[distance]||4;
  const tooSoon = raceDate && weeksToRace < minWeeks;

  async function handleSubmit() {
    if (tooSoon) return;
    setSubmitting(true); setError("");
    const res = await fetch("/api/races",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({raceName,raceDate,distanceM:PRESET_DISTANCES[distance],raceType,isTriathlon,trainingDaysPerWeek:5,majorRaceId:selectedMajorRace?.id||null})});
    if (!res.ok){const d=await res.json();setError(d.error||"Something went wrong");setSubmitting(false);return;}
    const{race}=await res.json();
    router.push(`/dashboard/races/${race.id}`);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
      <h2 className="text-sm font-medium">Add a race</h2>
      {showSearch && (
        <div className="relative">
          <label className="block text-xs text-foreground-dim mb-1">Search major races</label>
          <input placeholder="e.g. Boston Marathon, Ironman Arizona..." value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border outline-none focus:border-signal text-sm"/>
          {searching && <p className="text-xs text-foreground-dim mt-1">Searching...</p>}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-background shadow-xl overflow-hidden">
              {searchResults.slice(0,6).map(race=>(
                <button key={race.id} onClick={()=>selectMajorRace(race)} className="w-full text-left px-4 py-3 hover:bg-surface transition-colors border-b border-border last:border-0">
                  <p className="text-sm font-medium">{race.name}</p>
                  <p className="text-xs text-foreground-dim">{race.city}, {race.country} · {new Date(race.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-foreground-dim mt-1">Or <button onClick={()=>setShowSearch(false)} className="text-signal hover:underline">add a custom race</button></p>
        </div>
      )}
      {selectedMajorRace && (
        <div className="rounded-xl border border-signal/30 bg-signal/5 px-4 py-3 flex items-center justify-between">
          <div><p className="text-sm font-medium">{selectedMajorRace.name}</p><p className="text-xs text-foreground-dim">{selectedMajorRace.city} · {new Date(selectedMajorRace.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p></div>
          <button onClick={clearMajorRace} className="text-xs text-foreground-dim hover:text-foreground ml-4">Change</button>
        </div>
      )}
      {!selectedMajorRace && (
        <div className="space-y-3">
          {!showSearch && <button onClick={()=>setShowSearch(true)} className="text-xs text-signal hover:underline">Search major races instead</button>}
          <input placeholder="Race name" value={raceName} onChange={e=>setRaceName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border outline-none focus:border-signal text-sm"/>
          <input type="date" value={raceDate} onChange={e=>setRaceDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border outline-none focus:border-signal text-sm"/>
        </div>
      )}
      {(selectedMajorRace || raceName) && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">{Object.keys(PRESET_DISTANCES).map(d=><button key={d} onClick={()=>setDistance(d)} className={"text-xs px-3 py-2 rounded-xl border transition-colors text-left "+(distance===d?"bg-signal text-background border-signal":"border-border hover:bg-surface")}>{d}</button>)}</div>
          <div className="grid grid-cols-3 gap-2">{[{value:"main",label:"Main race"},{value:"training",label:"Tune-up"},{value:"fun",label:"Fun run"}].map(opt=><button key={opt.value} onClick={()=>setRaceType(opt.value)} className={"text-xs px-3 py-2 rounded-xl border transition-colors "+(raceType===opt.value?"bg-signal text-background border-signal":"border-border hover:bg-surface")}>{opt.label}</button>)}</div>
          {tooSoon && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3"><p className="text-sm text-red-400 font-medium">Not enough time</p><p className="text-xs text-red-400/80 mt-1">A {distance} needs at least {minWeeks} weeks. Your race is {weeksToRace} week{weeksToRace===1?"":"s"} away.</p></div>}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleSubmit} disabled={!raceName||!raceDate||!!tooSoon||submitting} className="w-full py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{submitting?"Saving...":"Add race"}</button>
          <p className="text-xs text-foreground-dim text-center">You will build your training plan on the next page</p>
        </div>
      )}
    </div>
  );
}
