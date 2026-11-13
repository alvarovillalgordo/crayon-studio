export type Word = {
  text: string;
  start: number;
  end: number;
};

export type Line = {
  index: number;
  text: string;
  start: number;
  end: number;
  duration: number;
  words: Word[];
};

export type Scene = {
  frame: number;
  start: number;
  end: number;
  duration: number;
  text: string;
};

export type Timeline = {
  voice: string;
  gap: number;
  lines: Line[];
  total: number;
  video_duration: number;
  scenes: Scene[];
};
