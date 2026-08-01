/**
 * 자산 로더 (플랜 R5: 아트 자산 없음 — 도형 + 단색 팔레트로 시작).
 * 지금은 폰트 준비만 기다리고, 스프라이트가 생기면 images 맵만 채우면 된다.
 */
export class AssetLoader {
  readonly images = new Map<string, HTMLImageElement>();
  progress = 0;

  async load(): Promise<void> {
    // 이미지 자산이 없으므로 로딩은 폰트 준비 대기 + 최소 프레임 확보만 한다.
    const jobs: Promise<unknown>[] = [];
    if ('fonts' in document) {
      jobs.push((document as Document & { fonts: FontFaceSet }).fonts.ready);
    }
    jobs.push(new Promise<void>((r) => requestAnimationFrame(() => r())));
    await Promise.all(jobs);
    this.progress = 1;
  }

  /** 후속 작업(스프라이트 교체)용 훅. */
  async loadImage(key: string, url: string): Promise<void> {
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => undefined);
    this.images.set(key, img);
  }
}
