import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import RiotProfilePage from "../../../pages/user/[riotId]";

vi.mock("next/router", () => ({
  useRouter: () => ({
    isReady: true,
    query: { riotId: "binh#NA1" },
    push: vi.fn(),
  }),
}));

vi.mock("@utils/socket", () => ({
  setSocketRiotId: vi.fn(),
}));

const jsonResponse = (data: unknown, init?: ResponseInit) =>
  Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
      ...init,
    })
  );

describe("Riot profile base render", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockImplementation((input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.url;

      if (url.startsWith("/api/player/account")) {
        return jsonResponse({
          puuid: "puuid-123",
          gameName: "binh",
          tagLine: "NA1",
        });
      }

      if (url.startsWith("/api/player/summoner")) {
        return jsonResponse({
          profileIconId: 1234,
          summonerLevel: 100,
        });
      }

      if (url.startsWith("/api/player/masteries")) {
        return jsonResponse({
          "1": { championPoints: 5000 },
          "64": { championPoints: 2500 },
        });
      }

      if (url.startsWith("/api/player/rank")) {
        return jsonResponse([
          {
            queueType: "RANKED_SOLO_5x5",
            tier: "Gold",
            rank: "IV",
            leaguePoints: 42,
            wins: 10,
            losses: 8,
          },
        ]);
      }

      if (url.startsWith("/api/player/winrate")) {
        return jsonResponse({
          gamesAnalyzed: 20,
          winrate: 55,
          wins: 11,
          losses: 9,
          remakes: 0,
          totalKills: 200,
          totalDeaths: 180,
          mostKills: 18,
          mostDeaths: 12,
          championStats: {
            Annie: { games: 4, wins: 3, kills: 30, deaths: 15, assists: 20 },
          },
          matchStats: {
            "NA1_123": {
              champName: "Annie",
              result: "win",
              queueType: 420,
              endGameTime: Date.now() - 1000 * 60 * 10,
              kills: 10,
              deaths: 2,
              assists: 8,
              creepScore: 200,
              win: true,
            },
          },
        });
      }

      if (url.startsWith("/api/sync")) {
        if (init?.method !== "POST") {
          return jsonResponse({ error: "Invalid method" }, { status: 405 });
        }
        return jsonResponse({ ok: true });
      }

      return jsonResponse({ error: `Unhandled request: ${url}` }, { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("renders the user page for binh#NA1 and calls the base APIs", async () => {
    render(<RiotProfilePage />);

    expect(
      await screen.findByText("Riot Profile for binh#NA1")
    ).toBeInTheDocument();

    await screen.findByText(/binh.*level 100/i);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/player/account?gameName=binh&tagLine=NA1",
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/player/summoner?puuid=puuid-123",
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/player/masteries?puuid=puuid-123&platformRegion=na1",
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/player/rank?puuid=puuid-123&platformRegion=na1",
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/player/winrate?puuid=puuid-123",
        expect.any(Object)
      );
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sync",
      expect.objectContaining({ method: "POST" })
    );
  });
});
