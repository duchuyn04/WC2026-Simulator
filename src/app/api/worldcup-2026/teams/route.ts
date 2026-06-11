import teamsData from "../../../../../data/fifa-teams-squads.json";

export const dynamic = "force-static";

export function GET() {
  return Response.json(teamsData, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
