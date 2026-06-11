import Link from "next/link";
import { TeamsDirectory } from "@/components/TeamsDirectory";
import teamsData from "../../../data/fifa-teams-squads.json";

export default function TeamsPage() {
  const teams = teamsData.teams
    .map((team) => ({
      id: team.id,
      code: team.code,
      name: team.name,
      slug: team.slug,
      confederationId: team.confederationId,
      group: team.group,
      worldRanking: team.worldRanking,
      appearances: team.appearances,
      hostTeam: team.hostTeam,
      squadCount: team.squad.length,
      headCoachName: team.headCoach?.alias ?? team.headCoach?.name ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="min-h-screen bg-[#0c0f14] text-zinc-100" style={{ zoom: 0.8 }}>
      <section className="border-b border-zinc-800 bg-[radial-gradient(circle_at_top_left,rgba(120,8,40,0.45),transparent_34rem)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:py-10">
          <Link 
            href="/" 
            className="group flex w-fit items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm font-semibold text-amber-400 backdrop-blur-md transition-all hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-300"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            Về mô phỏng
          </Link>
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-500">
              FIFA World Cup 2026
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              48 đội tuyển tham dự
            </h1>
            <p className="mt-4 text-lg text-zinc-400">
              Hồ sơ từng đội, bảng đấu, thứ hạng FIFA, số lần tham dự, HLV và danh sách 26 cầu thủ được lấy từ FIFA API.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-3xl font-black">{teamsData.count}</p>
              <p className="text-sm text-zinc-500">Đội tuyển</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-3xl font-black">
                {teamsData.teams.reduce((sum, team) => sum + team.squad.length, 0)}
              </p>
              <p className="text-sm text-zinc-500">Cầu thủ</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-3xl font-black">12</p>
              <p className="text-sm text-zinc-500">Bảng đấu</p>
            </div>
          </div>
        </div>
      </section>

      <TeamsDirectory teams={teams} />
    </main>
  );
}
