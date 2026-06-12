"use client";

import React, { useState } from "react";
import { H2HSummary } from "@/components/H2HSummary";
import { getH2HStats, Match } from "@/lib/h2h-stats";

interface Team {
  id: string;
  name: string;
}

interface H2HClientProps {
  teams: Team[];
  matches: Match[];
}

export function H2HClient({ teams, matches }: H2HClientProps) {
  const [teamA, setTeamA] = useState(teams[0]?.id || "");
  const [teamB, setTeamB] = useState(teams[1]?.id || "");

  const stats = getH2HStats(matches, teamA, teamB);

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-black text-center text-zinc-100 uppercase tracking-widest">
          Head to Head
        </h1>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <select 
            value={teamA} 
            onChange={e => setTeamA(e.target.value)}
            className="p-3 bg-zinc-800 text-white rounded border border-zinc-700 w-full sm:w-64"
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <button 
            onClick={() => { const t = teamA; setTeamA(teamB); setTeamB(t); }}
            className="p-3 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"
            aria-label="Đảo chiều"
          >
            🔄
          </button>

          <select 
            value={teamB} 
            onChange={e => setTeamB(e.target.value)}
            className="p-3 bg-zinc-800 text-white rounded border border-zinc-700 w-full sm:w-64"
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <H2HSummary teamAId={teamA} teamBId={teamB} stats={stats} />
      </div>
    </div>
  );
}
