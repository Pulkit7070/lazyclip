// Pure caption builders (fully testable, no ffmpeg). Produce .ass / .srt strings that the
// `subtitles` filter burns on a full ffmpeg build; degrade to a bar on limited builds.
import type { Word } from '../types.js';

function ts(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = (sec % 60);
  const ss = s.toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${ss}`;
}

// Group words into short caption cues (~3 words each for karaoke feel).
export function wordsToCues(words: Word[], perCue = 3): { start: number; end: number; text: string }[] {
  const cues: { start: number; end: number; text: string }[] = [];
  for (let i = 0; i < words.length; i += perCue) {
    const chunk = words.slice(i, i + perCue);
    if (!chunk.length) break;
    cues.push({ start: chunk[0].start, end: chunk[chunk.length - 1].end, text: chunk.map((w) => w.text).join(' ') });
  }
  return cues;
}

const STYLES: Record<string, string> = {
  // name, fontsize, primary colour (&HBBGGRR), outline, alignment (2=bottom-center, 5=mid)
  karaoke: 'Style: Default,Arial,54,&H00FFFFFF,&H00000000,-1,0,0,0,100,100,0,0,1,3,0,2,40,40,120,1',
  meme:    'Style: Default,Arial,60,&H00FFFFFF,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,8,40,40,60,1',
  clean:   'Style: Default,Arial,46,&H00FFFFFF,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,40,40,90,1',
};

export function toAss(cues: { start: number; end: number; text: string }[], style: 'karaoke' | 'meme' | 'clean' = 'karaoke'): string {
  const header =
    '[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n' +
    '[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,OutlineColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n' +
    (STYLES[style] ?? STYLES.karaoke) + '\n\n' +
    '[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n';
  const events = cues
    .map((c) => `Dialogue: 0,${ts(c.start)},${ts(c.end)},Default,,0,0,0,,${c.text.replace(/\n/g, ' ')}`)
    .join('\n');
  return header + events + '\n';
}

export function toSrt(cues: { start: number; end: number; text: string }[]): string {
  const t = (s: number) => new Date(s * 1000).toISOString().substr(11, 12).replace('.', ',');
  return cues.map((c, i) => `${i + 1}\n${t(c.start)} --> ${t(c.end)}\n${c.text}\n`).join('\n');
}
