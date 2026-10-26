export interface ImageGenerationRequest {
  jobId: string;
  sceneId: string;
  prompt: string;
  referenceImagePaths?: string[];
}

export interface ImageAsset {
  path: string;
  provider: string;
}

export interface ImageProvider {
  generate(request: ImageGenerationRequest): Promise<ImageAsset>;
}
