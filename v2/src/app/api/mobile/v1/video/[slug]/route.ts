import { getVideoBySlug, incrementVideoViewCount } from "@/db/queries/videos";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);
  if (!video) {
    return mobileJson({ status: "not_found", message: "Video bulunamadı." }, { status: 404 });
  }

  incrementVideoViewCount(video.id).catch(() => {});
  return mobileJson({ status: "ok", video });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
