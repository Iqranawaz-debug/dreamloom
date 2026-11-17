import "server-only";

export type ImageRequest = {
  prompt: string;
  /** Optional style hint, e.g. "soft watercolor". */
  style?: string;
};

export type ImageResult = {
  /** PNG/JPEG bytes so the image can be stored locally. */
  data: Uint8Array;
  mimeType: string;
};

export interface ImageProvider {
  name: string;
  generate(req: ImageRequest): Promise<ImageResult>;
}

const providers: Record<string, () => ImageProvider> = {
  none: () => ({
    name: "none",
    async generate() {
      throw new Error("No image provider configured. Set IMAGE_PROVIDER in .env.local.");
    },
  }),
};

/** The single entry point the app uses. Swap providers via IMAGE_PROVIDER. */
export async function generateImage(req: ImageRequest): Promise<ImageResult> {
  const name = process.env.IMAGE_PROVIDER ?? "none";
  const make = providers[name];
  if (!make) throw new Error(`Unknown IMAGE_PROVIDER "${name}"`);
  return make().generate(req);
}
