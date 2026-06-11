import Link from "next/link";
import { notFound } from "next/navigation";
import { flagUrl } from "@/lib/data";
import { PortraitImage } from "@/components/PortraitImage";
import { RecentMatches } from "@/components/RecentMatches";
import { TeamStatsBoard } from "@/components/TeamStatsBoard";
import { fetchTeamMatches } from "@/lib/espn";
import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";
import teamsData from "../../../../data/fifa-teams-squads.json";

type Team = (typeof teamsData.teams)[number];
type Player = Team["squad"][number];

const positionOrder = ["Goalkeeper", "Defender", "Midfielder", "Forward"];
const positionMap: Record<string, string> = {
  Goalkeeper: "Thủ môn",
  Defender: "Hậu vệ",
  Midfielder: "Tiền vệ",
  Forward: "Tiền đạo",
};

function translatePosition(pos?: string | null) {
  if (!pos) return "Cầu thủ";
  return positionMap[pos] || pos;
}

const ageReference = new Date("2026-06-11T00:00:00Z");

function ageOn(date?: string | null) {
  if (!date) return null;
  const birthDate = new Date(date);
  let age = ageReference.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = ageReference.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ageReference.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  return age;
}


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
    <main className="min-h-screen bg-[#0c0f14] text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#0c0f14]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-3">
          <Link
            href="/teams"
            className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-black text-amber-300 transition hover:border-amber-500 hover:text-amber-200 sm:px-4 sm:py-2 sm:text-sm"
          >
            ← Back
          </Link>
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-black text-zinc-100">{team.name}</p>
            <p className="text-xs font-semibold text-zinc-500">Group {team.group} · {team.confederationId}</p>
          </div>
        </div>
      </header>

      <section
        className="border-b border-zinc-800"
        style={{
          background: `linear-gradient(135deg, ${team.colors.primary ?? "#6a041f"}55, #0c0f14 45%, #0c0f14)`,
        }}
      >
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/" className="text-zinc-400 hover:text-zinc-200">
              Mô phỏng
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
          {espnId && (
            <div className="mt-3 sm:mt-8">
              <TeamStatsBoard espnId={espnId} />
            </div>
          )}
        </aside>

        <section className="min-w-0 space-y-4 sm:space-y-6">
          {headCoach && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:rounded-3xl sm:p-4">
              <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2 sm:mb-4 sm:pb-3">
                <h2 className="text-xl font-black sm:text-2xl">HLV trưởng</h2>
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-400">
                  {headCoach.countryCode}
                </span>
              </div>
              <article className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-[#11151d] p-2 sm:block sm:max-w-sm sm:rounded-[1.5rem] sm:p-3">
                <div className="relative h-[86px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-zinc-800 sm:h-auto sm:w-full sm:rounded-2xl [&>div]:h-full [&>img]:h-full sm:[&>div]:h-64 sm:[&>img]:h-64">
                  <PortraitImage
                    src={headCoach.pictureUrl}
                    alt={headCoach.name ?? "HLV trưởng"}
                    placeholderProps={{
                      badge: "HLV",
                      label: "Head coach",
                      name: headCoach.alias ?? headCoach.name,
                      teamCode: team.code,
                      primaryColor: team.colors.primary,
                      secondaryColor: team.colors.secondary,
                    }}
                  />
                  <span className="hidden rounded-full bg-amber-500 px-2 py-0.5 text-xs font-black uppercase text-zinc-950 shadow-lg shadow-black/30 sm:absolute sm:right-3 sm:top-3 sm:inline-flex sm:px-3 sm:py-1 sm:text-sm">
                    HLV
                  </span>
                </div>
                <div className="min-w-0 flex-1 px-1 pb-1 text-left sm:px-2 sm:pt-4 sm:text-center">
                  <h3 className="truncate text-base font-black leading-tight sm:text-lg">{headCoach.alias ?? headCoach.name}</h3>
                  <div className="mt-2 h-px w-4/5 bg-zinc-800 sm:mx-auto sm:mt-4" />
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 sm:mt-3 sm:text-xs">
                    Head coach{ageOn(headCoach.birthDate) ? ` · ${ageOn(headCoach.birthDate)} tuổi` : ""}
                  </p>
                </div>
              </article>
            </div>
          )}

          {groupedPlayers.map(({ position, players }) => (
            <div key={position} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:rounded-3xl sm:p-4">
              <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2 sm:mb-4 sm:pb-3">
                <h2 className="text-xl font-black sm:text-2xl">{translatePosition(position)}</h2>
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-400">{players.length} cầu thủ</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {players.map((player) => (
                  <article key={player.id} className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-[#11151d] p-2 sm:block sm:rounded-[1.5rem] sm:p-3">
                    <div className="relative h-[72px] w-[56px] shrink-0 overflow-hidden rounded-xl bg-zinc-800 sm:h-auto sm:w-full sm:rounded-2xl [&>div]:h-full [&>img]:h-full sm:[&>div]:h-64 sm:[&>img]:h-64">
                      <PortraitImage
                        src={player.pictureUrl}
                        alt={player.name ?? "Cầu thủ"}
                        placeholderProps={{
                          badge: `#${player.jerseyNumber ?? "-"}`,
                          label: translatePosition(player.realPosition ?? player.position),
                          name: player.name,
                          teamCode: team.code,
                          primaryColor: team.colors.primary,
                          secondaryColor: team.colors.secondary,
                        }}
                      />
                      <span className="hidden rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-black text-zinc-950 shadow-lg shadow-black/30 sm:absolute sm:right-3 sm:top-3 sm:inline-flex sm:px-3 sm:py-1 sm:text-base">
                        {player.jerseyNumber ?? "-"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 px-1 text-left sm:px-2 sm:pb-1 sm:pt-4 sm:text-center">
                      <div className="flex min-w-0 items-center gap-1.5 sm:block">
                        <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-zinc-950 sm:hidden">
                          {player.jerseyNumber ?? "-"}
                        </span>
                        <h3 className="truncate text-sm font-black leading-tight sm:text-lg">{player.name}</h3>
                      </div>
                      <div className="mt-2 h-px w-4/5 bg-zinc-800 sm:mx-auto sm:mt-3" />
                      <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 sm:mt-2 sm:text-[11px] sm:tracking-[0.16em]">
                        {translatePosition(player.realPosition ?? player.position)}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-amber-300 sm:mt-1 sm:text-sm">
                        {player.club?.name ?? "Chưa có CLB"}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-zinc-500 sm:hidden">
                        {ageOn(player.birthDate) ?? "-"} tuổi · {player.heightCm ?? "-"}cm · {player.weightKg ?? "-"}kg
                      </p>
                    </div>
                    <div className="hidden text-center text-[10px] text-zinc-500 sm:mt-3 sm:grid sm:w-auto sm:grid-cols-3 sm:gap-2 sm:text-xs">
                      <div className="rounded-lg bg-zinc-900/70 px-1 py-0.5 sm:rounded-xl sm:p-2"><b className="block text-xs text-zinc-200 sm:text-sm">{ageOn(player.birthDate) ?? "-"}</b>Tuổi</div>
                      <div className="rounded-lg bg-zinc-900/70 px-1 py-0.5 sm:rounded-xl sm:p-2"><b className="block text-xs text-zinc-200 sm:text-sm">{player.heightCm ?? "-"}</b>cm</div>
                      <div className="rounded-lg bg-zinc-900/70 px-1 py-0.5 sm:rounded-xl sm:p-2"><b className="block text-xs text-zinc-200 sm:text-sm">{player.weightKg ?? "-"}</b>kg</div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}
