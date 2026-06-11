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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/teams"
            className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-black text-amber-300 transition hover:border-amber-500 hover:text-amber-200"
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
        <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/" className="text-zinc-400 hover:text-zinc-200">
              Mô phỏng
            </Link>
          </div>

          <div className="mt-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <img
                src={flagUrl(team.code)}
                alt={`Cờ ${team.name}`}
                loading="lazy"
                decoding="async"
                className="h-24 w-32 rounded-2xl object-cover ring-1 ring-white/20"
              />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">
                  Bảng {team.group} · {team.confederationId}
                </p>
                <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{team.name}</h1>
                <p className="mt-3 text-lg text-zinc-300">
                  FIFA #{team.worldRanking} · {team.appearances} lần tham dự · {team.hostTeam ? "Chủ nhà" : "Vượt qua vòng loại"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="text-xl font-black">Thông tin đội</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Mã đội</dt><dd className="font-semibold">{team.code}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Bảng</dt><dd className="font-semibold">{team.group}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Liên đoàn</dt><dd className="font-semibold">{team.confederationId}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Cầu thủ</dt><dd className="font-semibold">{team.squad.length}</dd></div>
            </dl>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="text-xl font-black">Ban huấn luyện</h2>
            <div className="mt-4 space-y-3">
              {team.officials.map((official) => (
                <div key={official.id} className="rounded-2xl bg-zinc-900/70 p-3">
                  <p className="font-bold">{official.alias ?? official.name}</p>
                  <p className="text-sm text-zinc-500">{official.roleLabel} · {official.countryCode}</p>
                </div>
              ))}
            </div>
          </div>

          <RecentMatches recentMatches={recentMatches} />
          {espnId && (
            <div className="mt-8">
              <TeamStatsBoard espnId={espnId} />
            </div>
          )}
        </aside>

        <section className="space-y-6">
          {headCoach && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 className="text-2xl font-black">HLV trưởng</h2>
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-400">
                  {headCoach.countryCode}
                </span>
              </div>
              <article className="max-w-sm rounded-[1.5rem] border border-zinc-800 bg-[#11151d] p-3">
                <div className="relative overflow-hidden rounded-2xl bg-zinc-800">
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
                  <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-sm font-black uppercase text-zinc-950 shadow-lg shadow-black/30">
                    HLV
                  </span>
                </div>
                <div className="px-2 pb-1 pt-4 text-center">
                  <h3 className="text-lg font-black leading-tight">{headCoach.alias ?? headCoach.name}</h3>
                  <div className="mx-auto mt-4 h-px w-4/5 bg-zinc-800" />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Head coach{ageOn(headCoach.birthDate) ? ` · ${ageOn(headCoach.birthDate)} tuổi` : ""}
                  </p>
                </div>
              </article>
            </div>
          )}

          {groupedPlayers.map(({ position, players }) => (
            <div key={position} className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 className="text-2xl font-black">{translatePosition(position)}</h2>
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-400">{players.length} cầu thủ</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {players.map((player) => (
                  <article key={player.id} className="rounded-[1.5rem] border border-zinc-800 bg-[#11151d] p-3">
                    <div className="relative overflow-hidden rounded-2xl bg-zinc-800">
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
                      <span className="absolute right-2 top-2 sm:right-3 sm:top-3 rounded-full bg-amber-500 px-2 py-0.5 sm:px-3 sm:py-1 text-sm sm:text-base font-black text-zinc-950 shadow-lg shadow-black/30">
                        {player.jerseyNumber ?? "-"}
                      </span>
                    </div>
                    <div className="px-2 pb-1 pt-4 text-center">
                      <h3 className="text-sm sm:text-lg font-black leading-tight truncate">{player.name}</h3>
                      <div className="mx-auto mt-3 h-px w-4/5 bg-zinc-800" />
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                        {translatePosition(player.realPosition ?? player.position)}
                      </p>
                      <p className="mt-1 truncate text-[11px] sm:text-sm font-semibold text-amber-300">
                        {player.club?.name ?? "Chưa có CLB"}
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs text-zinc-500">
                      <div className="rounded-xl bg-zinc-900/70 p-1 sm:p-2"><b className="block text-xs sm:text-sm text-zinc-200">{ageOn(player.birthDate) ?? "-"}</b>Tuổi</div>
                      <div className="rounded-xl bg-zinc-900/70 p-1 sm:p-2"><b className="block text-xs sm:text-sm text-zinc-200">{player.heightCm ?? "-"}</b>cm</div>
                      <div className="rounded-xl bg-zinc-900/70 p-1 sm:p-2"><b className="block text-xs sm:text-sm text-zinc-200">{player.weightKg ?? "-"}</b>kg</div>
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
