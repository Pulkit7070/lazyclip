// reely — frozen shared contracts. Do NOT change without broadcasting (see ../../docs/PLAN.md §0).

export type Op =
  | { op: 'clip';      start: string; end: string }
  | { op: 'trim';      start: string; end: string }
  | { op: 'captions';  source: 'whisper' | 'script'; style: 'karaoke' | 'meme' | 'clean'; text?: string;
      cues?: { start: number; end: number; text: string }[] }   // timed cues (whisper words / paced script)
  | { op: 'format';    aspect: '9:16' | '1:1' | '16:9';
      mode?: 'crop' | 'fit';          // crop = fill frame (may cut edges), fit = blur-pad (keeps everything)
      focusX?: number }               // 0-1 horizontal subject center for crop (default 0.5 = center)
  | { op: 'speed';     factor: number }
  | { op: 'convert';   to: 'mp4' | 'mp3' | 'gif' | 'webm' }
  | { op: 'watermark'; text: string; show: boolean; position?: 'br' | 'bl' | 'tr' | 'tl' }
  | { op: 'sticker' }
  | { op: 'thumbnail'; at: string }
  | { op: 'voiceover'; voiceId: string; script: string }
  | { op: 'broll';     keywords: string[]; durationSec?: number }
  | { op: 'cutaways';  segments: BrollSegment[] };   // b-roll cutaways over an A-roll clip

// b-roll cutaway window: `at` seconds into the clip, `dur` seconds long
export interface BrollSegment { at: number; dur: number; keywords: string[] }

export type OpName = Op['op'];

export interface MediaMeta {
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  hasVideo: boolean;
  bytes: number;
}

export interface Word { text: string; start: number; end: number; }
export interface Angle { hook: string; premise: string; whyViral: string; }

export type Platform = 'telegram' | 'whatsapp' | 'discord' | 'cli';
export type Mode = 'generate' | 'edit' | 'clip';

export interface JobSpec {
  id: string;
  userId: string;
  platform: Platform;
  mode: Mode;
  source: { kind: 'upload' | 'youtube' | 'none'; path?: string; url?: string; sections?: string; topic?: string };
  ops: Op[];
  isPro: boolean;
  limits: { maxBytes: number; maxDurationSec: number; timeoutSec: number };
}

export interface JobResult {
  ok: boolean;
  outputPath?: string;
  meta?: { bytes: number; durationSec: number; ms: number };
  failedOp?: number;
  error?: string;
}

export interface JobCtx { tmpDir: string; isPro: boolean; signal?: AbortSignal; }
export interface ChatCtx { userId: string; platform: Platform; attachmentPath?: string; isPro: boolean; }

// Default per-job limits (safety caps). Overridable per job.
// timeoutSec covers the WHOLE job incl. the YouTube section download (~45s from a throttled
// datacenter IP) + whisper + 3 ffmpeg ops on 2 vCPUs — 120s flaked on real clip jobs
export const DEFAULT_LIMITS = { maxBytes: 50 * 1024 * 1024, maxDurationSec: 300, timeoutSec: 300 };

// ---- Module interfaces (each Batch B/A module implements one of these) ----
export interface MediaCore { runOp(inputPath: string, op: Op, ctx: JobCtx): Promise<{ outputPath: string }>; }
export interface Ingest {
  ingest(source: JobSpec['source'], limits: JobSpec['limits']): Promise<{ path: string; meta: MediaMeta }>;
  probe(path: string): Promise<MediaMeta>;
}
export interface Transcriber { transcribe(path: string): Promise<{ srt: string; words: Word[] }>; }
export interface Content {
  brainstorm(topic: string, facts?: string[]): Promise<Angle[]>;
  script(angle: Angle, facts?: string[]): Promise<{ script: string; captions: string }>;
  captionText(words: Word[], style: 'karaoke' | 'meme' | 'clean'): Promise<string>;
}
