import Image from "next/image";
import { ExternalLink, Youtube } from "lucide-react";
import { MOBILE_VIDEO_COUNT, channelUrl, fetchLatestVideos, getYoutubeChannelId, videoItemClass } from "@/lib/youtube";
import { formatIsoDate } from "@/lib/reading";

/**
 * Latest uploads from the ProCoderJii channel (public Atom feed, refreshed hourly).
 * Renders nothing until YOUTUBE_CHANNEL_ID is set. If the feed is unavailable it
 * falls back to a plain "Watch on YouTube" link; it never shows made-up videos.
 */
export async function LatestVideos() {
    const channelId = getYoutubeChannelId();
    if (!channelId) return null;

    const videos = await fetchLatestVideos(channelId);
    const channel = channelUrl(channelId);

    return (
        <section id="videos" aria-labelledby="videos-heading" className="px-6 py-20 bg-white/80">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                    <h2 id="videos-heading" className="text-3xl sm:text-4xl font-black text-gray-900">
                        Latest videos
                    </h2>
                    <a
                        href={channel}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-primary"
                    >
                        <Youtube className="w-4 h-4" aria-hidden="true" /> Watch on YouTube
                        <span className="sr-only">(opens in a new tab)</span>
                    </a>
                </div>

                {videos.length === 0 ? (
                    <p className="text-gray-600">
                        We could not load the latest videos right now. You can watch every upload on the{" "}
                        <a href={channel} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                            ProCoderJii YouTube channel
                        </a>
                        .
                    </p>
                ) : (
                    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {videos.map((v, i) => {
                            const date = formatIsoDate(v.publishedAt.slice(0, 10));
                            return (
                                <li key={v.id} className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-gray-900 ${videoItemClass(i)}`}>
                                    <Image
                                        src={v.thumbnail}
                                        alt=""
                                        width={480}
                                        height={360}
                                        unoptimized
                                        loading="lazy"
                                        className="aspect-video w-full object-cover"
                                    />
                                    <div className="p-4">
                                        <h3 className="line-clamp-2 font-semibold text-gray-900">
                                            <a
                                                href={v.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="after:absolute after:inset-0 after:content-[''] focus:outline-none"
                                            >
                                                {v.title}
                                                <span className="sr-only"> (opens on YouTube in a new tab)</span>
                                            </a>
                                        </h3>
                                        <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                            {date ? `Published ${date}` : "YouTube"}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {videos.length > MOBILE_VIDEO_COUNT && (
                    // Phones show only the first few cards, so point them at the rest.
                    <p className="mt-6 sm:hidden">
                        <a
                            href={channel}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 underline underline-offset-4"
                        >
                            <Youtube className="w-4 h-4" aria-hidden="true" /> See more videos on YouTube
                            <span className="sr-only">(opens in a new tab)</span>
                        </a>
                    </p>
                )}
            </div>
        </section>
    );
}
