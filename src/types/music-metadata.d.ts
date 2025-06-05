declare module 'music-metadata' {
  export interface IFormat {
    duration?: number;
    sampleRate?: number;
    bitsPerSample?: number;
    codec?: string;
    bitrate?: number;
  }

  export interface IPicture {
    format: string;
    data: Buffer;
  }

  export interface ICommon {
    title?: string;
    artist?: string;
    artists?: string[];
    album?: string;
    comment?: string[];
    picture?: IPicture[];
    lyrics?: string[];
  }

  export interface IAudioMetadata {
    format: IFormat;
    common: ICommon;
  }

  export interface IOptions {
    duration?: boolean;
    skipCovers?: boolean;
    skipPostHeaders?: boolean;
  }

  export function parseFile(path: string, options?: IOptions): Promise<IAudioMetadata>;
} 