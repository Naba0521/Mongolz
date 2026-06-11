import type { Metadata } from "next";
import { headers } from "next/headers";
import ShareLanding from "./ShareLanding";

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const origin = await getOrigin();
  const pageUrl = `${origin}/share/${id}`;
  const imageUrl = `${origin}/api/share/${id}`;

  return {
    title: "The MongolZ",
    description: "Багтайгаа зургаа татуул",
    openGraph: {
      title: "The MongolZ",
      description: "Багтайгаа зургаа татуул",
      url: pageUrl,
      type: "website",
      images: [{ url: imageUrl, width: 1080, height: 1350, alt: "The MongolZ photo" }],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const origin = await getOrigin();
  const pageUrl = `${origin}/share/${id}`;

  return <ShareLanding id={id} pageUrl={pageUrl} />;
}
