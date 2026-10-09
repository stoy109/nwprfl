// ─── Types ───────────────────────────────────────────────────────
export interface ChartLevel {
  title: string;
  artist: string;
  game: 'PULSUS' | 'PHIGROS' | 'ARCAEA';
  diff: string;
  youtubeUrl: string;
  youtubeId: string;
  chartUrl?: string;
  copyId?: string;       // Pulsus level ID for clipboard copy
  available: boolean;
}

export interface AudioTrack {
  title: string;
  artist: string;
  src: string;     // path under /audio/
  duration: number; // seconds (approximate, will be overridden by actual file)
}

// ─── Helpers ─────────────────────────────────────────────────────
function ytId(url: string): string {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : '';
}

// ─── Chart Levels ────────────────────────────────────────────────
export const GAME_FILTERS = ['ALL', 'ARCAEA', 'PULSUS', 'PHIGROS'] as const;
export type GameFilter = (typeof GAME_FILTERS)[number];

export const chartLevels: ChartLevel[] = [
  // Pulsus (with level IDs from pulsus.cc)
  { title: "Unwelcome School (takehirotei hardcore remix)", artist: "Mitsukiyo", game: "PULSUS", diff: "★ 8.35", youtubeUrl: "https://www.youtube.com/watch?v=cMKZER7eB9g", youtubeId: ytId("https://www.youtube.com/watch?v=cMKZER7eB9g"), copyId: "10700", available: true },
  { title: "チルノのパーフェクトさんすう教室 ⑨周年バージョン", artist: "IOSYS", game: "PULSUS", diff: "★ 3.22", youtubeUrl: "https://www.youtube.com/watch?v=zZ8TvaLg5lM", youtubeId: ytId("https://www.youtube.com/watch?v=zZ8TvaLg5lM"), copyId: "10871", available: true },
  { title: "Rrhar'il", artist: "Team Grimoire", game: "PULSUS", diff: "★ 11.08", youtubeUrl: "https://www.youtube.com/watch?v=0LWyNuuMv9U", youtubeId: ytId("https://www.youtube.com/watch?v=0LWyNuuMv9U"), copyId: "11087", available: true },
  { title: "You Are The Miserable (Cut Ver.)", artist: "t+pazolite", game: "PULSUS", diff: "★ 6.27", youtubeUrl: "https://www.youtube.com/watch?v=pztAPfhuZyM", youtubeId: ytId("https://www.youtube.com/watch?v=pztAPfhuZyM"), copyId: "11205", available: true },
  { title: "Crave Wave", artist: "LandRoot", game: "PULSUS", diff: "★ 5.31", youtubeUrl: "https://www.youtube.com/watch?v=7VKm3vXSphs", youtubeId: ytId("https://www.youtube.com/watch?v=7VKm3vXSphs"), copyId: "12272", available: true },
  { title: "The Chariot ~REVIIVAL~", artist: "Attoclef", game: "PULSUS", diff: "★ 6.32", youtubeUrl: "https://www.youtube.com/watch?v=H7R9NuUWKfA", youtubeId: ytId("https://www.youtube.com/watch?v=H7R9NuUWKfA"), copyId: "12466", available: true },
  { title: "Retribution", artist: "nm-y & Kry.exe", game: "PULSUS", diff: "★ 9.52", youtubeUrl: "https://www.youtube.com/watch?v=vPugvEFMImo", youtubeId: ytId("https://www.youtube.com/watch?v=vPugvEFMImo"), copyId: "13200", available: true },
  { title: "DESTRUCTION 3,2,1", artist: "Normal1zer vs. Broken Nerdz", game: "PULSUS", diff: "★ 15.67", youtubeUrl: "https://www.youtube.com/watch?v=rnvGmvxmH0w", youtubeId: ytId("https://www.youtube.com/watch?v=rnvGmvxmH0w"), copyId: "15895", available: true },
  { title: "神っぽいな (Covered by Kotoha)", artist: "ピノキオピー", game: "PULSUS", diff: "★ 4.21", youtubeUrl: "https://www.youtube.com/watch?v=CkfVVgWxIGQ", youtubeId: ytId("https://www.youtube.com/watch?v=CkfVVgWxIGQ"), copyId: "17440", available: true },
  { title: "SHANTI (シャンティ) (covered by Vivid BAD SQUAD.)", artist: "wotaku", game: "PULSUS", diff: "★ 5.54", youtubeUrl: "https://www.youtube.com/watch?v=Qu5OpcQA25k", youtubeId: ytId("https://www.youtube.com/watch?v=Qu5OpcQA25k"), copyId: "18079", available: true },
  { title: "イガク (IGAKU)", artist: "重音テト", game: "PULSUS", diff: "★ 3.71", youtubeUrl: "https://www.youtube.com/watch?v=DLxmpEdsUL4", youtubeId: ytId("https://www.youtube.com/watch?v=DLxmpEdsUL4"), copyId: "20858", available: true },
  // Phigros Fanmade
  { title: "Change (Feat. Zach Callison)", artist: "Rebecca Sugar, Jeff Liu, Aivi & Surasshu", game: "PHIGROS", diff: "IN Lv.10", youtubeUrl: "https://www.youtube.com/watch?v=_17ozsA2VjE", youtubeId: ytId("https://www.youtube.com/watch?v=_17ozsA2VjE"), chartUrl: "https://phira.moe/chart/14286", available: true },
  { title: "Sound Chimera", artist: "Laur", game: "PHIGROS", diff: "IN Lv.15", youtubeUrl: "https://www.youtube.com/watch?v=quMjucICxxw", youtubeId: ytId("https://www.youtube.com/watch?v=quMjucICxxw"), available: false },
  { title: "Kick Back (Tv Size)", artist: "米津玄師 (Kenshi Yonezu)", game: "PHIGROS", diff: "IN Lv.13", youtubeUrl: "https://www.youtube.com/watch?v=xNiantQMF2w", youtubeId: ytId("https://www.youtube.com/watch?v=xNiantQMF2w"), chartUrl: "https://phira.moe/chart/14572", available: true },
  { title: "Cradless", artist: "Sub Urban", game: "PHIGROS", diff: "IN Lv.13", youtubeUrl: "https://www.youtube.com/watch?v=ady-sPZscDE", youtubeId: ytId("https://www.youtube.com/watch?v=ady-sPZscDE"), chartUrl: "https://phira.moe/chart/24350", available: true },
  { title: "Tempestissimo", artist: "t+pazolite", game: "PHIGROS", diff: "IN Lv.16", youtubeUrl: "https://www.youtube.com/watch?v=AT5TkdQm6Aw", youtubeId: ytId("https://www.youtube.com/watch?v=AT5TkdQm6Aw"), available: false },
  // Arcaea Fanmade
  { title: "I Can't Fix You", artist: "The Living Tombstone & Crusher-P", game: "ARCAEA", diff: "Future 9+", youtubeUrl: "https://www.youtube.com/watch?v=-kRSDFzuh2M", youtubeId: ytId("https://www.youtube.com/watch?v=-kRSDFzuh2M"), available: false },
  { title: "It's Over, Isn't It?", artist: "Rebecca Sugar (feat. Deedee Magno)", game: "ARCAEA", diff: "Future 7+", youtubeUrl: "https://www.youtube.com/watch?v=eAN6e__MShg", youtubeId: ytId("https://www.youtube.com/watch?v=eAN6e__MShg"), available: false },
  { title: "Golden Hour (Xplosn Remix)", artist: "JVKE, Xplosn", game: "ARCAEA", diff: "Future 9", youtubeUrl: "https://www.youtube.com/watch?v=lElBERd-WmE", youtubeId: ytId("https://www.youtube.com/watch?v=lElBERd-WmE"), chartUrl: "/charts/goldenhourxplosn.arcpkg", available: true },
];

// ─── Audio Tracks (from upload folder) ──────────────────────────
export const audioTracks: AudioTrack[] = [
  { title: "title maybe", artist: "Original Soundtrack", src: "/audio/01-title-maybe.m4a", duration: 0 },
  { title: "let's do adventure i guess", artist: "Original Soundtrack", src: "/audio/02-lets-do-adventure-i-guess.m4a", duration: 0 },
  { title: "Be Hap̷̘̄py", artist: "Original Soundtrack", src: "/audio/03-be-happy.m4a", duration: 0 },
  { title: "The Preparing", artist: "Original Soundtrack", src: "/audio/04-the-preparing.m4a", duration: 0 },
  { title: "Shall We?", artist: "Original Soundtrack", src: "/audio/05-shall-we.m4a", duration: 0 },
  { title: "I have something to tell, but it's complicated", artist: "Original Soundtrack", src: "/audio/06-i-have-something-to-tell-but-its-complicated.m4a", duration: 0 },
  { title: "Forget it?", artist: "Original Soundtrack", src: "/audio/07-forget-it.m4a", duration: 0 },
];
