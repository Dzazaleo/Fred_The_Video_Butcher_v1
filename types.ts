export interface VideoAsset {
  file: File;
  previewUrl: string;
}

export type VideoFileHandler = (file: File, url: string) => void;

export enum UploadError {
  INVALID_TYPE = "Invalid file type. Please upload MP4 or QuickTime files.",
  GENERIC = "An error occurred while processing the file.",
}