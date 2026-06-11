import { TeamsDirectory } from "@/components/TeamsDirectory";
import { TeamsHeader } from "@/components/TeamsHeader";
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
    <main className="min-h-screen bg-[#0c0f14] text-zinc-100">
      <TeamsHeader />

      <section className="border-b border-zinc-800 bg-[radial-gradient(circle_at_top_left,rgba(120,8,40,0.45),transparent_34rem)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-5 sm:gap-6 sm:px-4 sm:py-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 sm:p-4">
              <p className="text-2xl font-black sm:text-3xl">{teamsData.count}</p>
              <p className="text-xs text-zinc-500 sm:text-sm">Đội tuyển</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 sm:p-4">
              <p className="text-2xl font-black sm:text-3xl">
                {teamsData.teams.reduce((sum, team) => sum + team.squad.length, 0)}
              </p>
              <p className="text-xs text-zinc-500 sm:text-sm">Cầu thủ</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 sm:p-4">
              <p className="text-2xl font-black sm:text-3xl">12</p>
              <p className="text-xs text-zinc-500 sm:text-sm">Bảng đấu</p>
            </div>
          </div>
        </div>
      </section>

      <TeamsDirectory teams={teams} />
    </main>
  );
}
