import Link from "next/link";
import { notFound } from "next/navigation";
import { flagUrl } from "@/lib/data";
import { RecentMatches } from "@/components/RecentMatches";
import { TeamStatsBoard } from "@/components/TeamStatsBoard";
import { TeamRoster } from "@/components/TeamRoster";
import { FloatingBackButton } from "@/components/FloatingBackButton";
import { fetchTeamMatches } from "@/lib/espn";
import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";
import teamsData from "../../../../data/fifa-teams-squads.json";

type Team = (typeof teamsData.teams)[number];
type Player = Team["squad"][number];

const positionOrder = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

function playersByPosition(players: Player[]) {
  return positionOrder.map((position) => ({
    position,
    players: players
      .filter((player) => player.position === position)
      .sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)),
  }));
}

export function generateStaticParams() {
  return teamsData.teams.map((team) => ({ slug: team.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = teamsData.teams.find((item) => item.slug === slug);
  return {
    title: team ? `${team.name} squad | WC 2026` : "Team squad | WC 2026",
  };
}

export default async function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = teamsData.teams.find((item) => item.slug === slug);

  if (!team) notFound();

  const groupedPlayers = playersByPosition(team.squad);
  const headCoach = team.headCoach;

  const espnId = ESPN_TEAM_MAP[team.id];
  let recentMatches: any[] = [];
  if (espnId) {
    try {
      recentMatches = await fetchTeamMatches(espnId);
    } catch (err) {
      console.error("Failed to fetch recent matches", err);
    }
  }

  return (
    <>
      <FloatingBackButton />
      <main className="min-h-screen bg-[#0c0f14] text-zinc-100">
      <section
        className="border-b border-zinc-800"
        style={{
          background: `linear-gradient(135deg, ${team.colors.primary ?? "#6a041f"}55, #0c0f14 45%, #0c0f14)`,
        }}
      >
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <Link
              href="/teams"
              className="group flex w-fit items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-xs font-semibold text-amber-400 backdrop-blur-md transition-all hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-300 sm:px-4 sm:py-2 sm:text-sm"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span>
              Đội tuyển
            </Link>
          </div>

          <div className="mt-4 sm:mt-8">
            <div className="flex items-center gap-3 sm:gap-5">
              <img
                src={flagUrl(team.code)}
                alt={`Cờ ${team.name}`}
                loading="lazy"
                decoding="async"
                className="h-16 w-24 shrink-0 rounded-xl object-cover ring-1 ring-white/20 sm:h-24 sm:w-32 sm:rounded-2xl"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300 sm:text-sm sm:tracking-[0.22em]">
                  Bảng {team.group} · {team.confederationId}
                </p>
                <h1 className="mt-1 truncate text-3xl font-black tracking-tight sm:mt-2 sm:text-5xl">{team.name}</h1>
                <p className="mt-1 text-sm text-zinc-300 sm:mt-3 sm:text-lg">
                  FIFA #{team.worldRanking} · {team.appearances} lần tham dự · {team.hostTeam ? "Chủ nhà" : "Vượt qua vòng loại"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl min-w-0 gap-4 px-3 py-4 sm:px-4 sm:py-6 lg:grid-cols-[18rem_1fr]">
        <aside className="min-w-0 space-y-3 sm:space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:rounded-3xl sm:p-5">
            <h2 className="text-lg font-black sm:text-xl">Thông tin đội</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:mt-4 sm:block sm:space-y-3">
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Mã đội</dt><dd className="font-semibold">{team.code}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Bảng</dt><dd className="font-semibold">{team.group}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Liên đoàn</dt><dd className="font-semibold">{team.confederationId}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Cầu thủ</dt><dd className="font-semibold">{team.squad.length}</dd></div>
            </dl>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:rounded-3xl sm:p-5">
            <h2 className="text-lg font-black sm:text-xl">Ban huấn luyện</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:block sm:space-y-3">
              {team.officials.map((official) => (
                <div key={official.id} className="rounded-xl bg-zinc-900/70 p-2 sm:rounded-2xl sm:p-3">
                  <p className="truncate text-xs font-bold sm:text-base">{official.alias ?? official.name}</p>
                  <p className="truncate text-[10px] text-zinc-500 sm:text-sm">{official.roleLabel} · {official.countryCode}</p>
                </div>
              ))}
            </div>
          </div>

          <RecentMatches recentMatches={recentMatches} />
        </aside>

        <TeamRoster
          team={{ name: team.name, code: team.code, colors: team.colors }}
          headCoach={headCoach}
          groupedPlayers={groupedPlayers}
        />
      </section>

      {espnId && (
        <section className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
          <TeamStatsBoard espnId={espnId} />
        </section>
      )}
      </main>
    </>
  );
}
