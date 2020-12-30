export enum Action {
  CHANGE_THEME,
  TRANSCRIPT
}

export enum STATECHANGE {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  VIDEOCUED = 5,
}

export class Caption {
  dur!: string;
  start!: string;
  text!: string;
}
