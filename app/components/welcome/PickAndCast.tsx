'use client';
import { useState, useEffect, useMemo } from 'react';
import {
    motion,
    AnimatePresence,
    PanInfo,
    useMotionValue,
    useTransform,
    animate,
} from 'framer-motion';
import Link from 'next/link';

interface Post {
    id: string | number;
    author: { name: string; username: string; avatar: string };
    image: string | null;
    content: string;
    hashtags: string[];
    likes: number;
    comments: number;
    code?: string;            // reels-only; used to resolve MP4
    takenAt?: number | null;  // for ordering
    mediaUrl?: string | null; // stories can include direct media URL
}

type ApiItem = {
    id: string;
    code?: string | null;
    thumbnail: string | null;
    mediaUrl?: string | null;
    stats?: { likeCount?: number | null; commentCount?: number | null; playCount?: number | null };
    takenAt?: number | null;
};

type ApiResponse = {
    items: ApiItem[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    error?: string;
};

const DEFAULT_AVATAR =
    'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face';
const USERNAME = "icc";

export default function PickAndCast() {
    const [queue, setQueue] = useState<Post[]>([]);
    const [index, setIndex] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [after, setAfter] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);

    const [tab, setTab] = useState<'post' | 'story'>('post');

    // Motion values
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12]);

    useEffect(() => {
        x.set(0); // reset swipe offset when index changes
    }, [index, x]);

    // API item -> UI Post
    const mapToPost = (m: ApiItem): Post => ({
        id: m.id, // backend already stabilizes id
        author: { name: USERNAME, username: USERNAME, avatar: DEFAULT_AVATAR },
        image: m.thumbnail ?? null,
        content: '',
        hashtags: [],
        likes: (m.stats?.likeCount ?? 0) || 0,
        comments: (m.stats?.commentCount ?? 0) || 0,
        code: m.code ?? undefined,
        takenAt: m.takenAt ?? null,
        mediaUrl: m.mediaUrl ?? null,
    });

    // Endpoint switcher
    const loadPage = async (cursor: string | null, mode: 'post' | 'story' = 'post') => {
        const endpoint = mode === 'story' ? '/api/stories' : '/api/posts';
        const payload: any = { username_or_url: USERNAME };
        if (mode === 'post' && cursor) payload.after = cursor; // posts paginate; stories don't

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        const data: ApiResponse = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to fetch ${mode}`);

        const newPosts = (data.items || [])
            .filter((m) => m.thumbnail || m.mediaUrl)   // <— allow video-only stories
            .map(mapToPost);

        // de-dupe by id, then newest-first
        setQueue((prev) => {
            const byId = new Map<string | number, Post>();
            [...prev, ...newPosts].forEach((p) => byId.set(p.id, p));
            const merged = Array.from(byId.values());
            merged.sort((a, b) => (b.takenAt ?? 0) - (a.takenAt ?? 0));
            return merged;
        });

        setHasMore(mode === 'post' ? Boolean(data.pageInfo?.hasNextPage) : false);
        setAfter(mode === 'post' ? data.pageInfo?.endCursor ?? null : null);

        if (mode === 'story' && (!data.items || data.items.length === 0)) {
            setNotice('No active stories right now.');
        }
    };

    // initial load + when tab changes
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                setNotice(null);

                // reset list and pagination on tab change
                setQueue([]);
                setIndex(0);
                setAfter(null);
                setHasMore(false);

                await loadPage(null, tab);
                if (!alive) return;
                setNotice(
                    tab === 'story' ? `Loaded stories for @${USERNAME}.` : `Loaded posts + reels for @${USERNAME}.`
                );
            } catch (e: any) {
                if (alive) setError(e?.message ?? `Unable to load ${tab}`);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [tab]);

    // prefetch next image
    useEffect(() => {
        const next = queue[index + 1]?.image;
        if (next) {
            const img = new Image();
            img.src = next;
        }
    }, [queue, index]);

    // auto-load more (posts only)
    useEffect(() => {
        if (tab === 'post' && index >= queue.length - 3 && hasMore) {
            loadPage(after, 'post').catch(() => { });
        }
    }, [index, queue.length, hasMore, after, tab]);

    const total = queue.length;
    const currentPost = queue[index];
    const empty = !loading && (total === 0 || index >= total);

    // navigation + swipe
    const advance = () => setIndex((i) => Math.min(i + 1, total));
    const snapBack = () => animate(x, 0, { type: 'spring', stiffness: 600, damping: 40 });

    const flyOutLeft = async () => {
        const width = typeof window !== 'undefined' ? window.innerWidth : 500;
        await animate(x, -width * 1.1, { duration: 0.22 });
        advance(); // index++ mounts the next card; x resets in the effect
    };

    const onDragEnd = (_: PointerEvent, info: PanInfo) => {
        const farLeft = info.offset.x < -120;
        const fastLeft = info.velocity.x < -600;
        if (farLeft || fastLeft) {
            flyOutLeft();
            return; // prevent any fallthrough
        }
        snapBack();
    };

    const handleIgnore = () => flyOutLeft();

    const handleCast = async () => {
        if (!currentPost) return;
        if (tab === 'story') {
            // Example: you could use currentPost.mediaUrl (image or video) if you exposed it
            console.log('Story mediaUrl:', currentPost.mediaUrl);
            advance();
            return;
        }
        // posts/reels; only reels have code
        const code = currentPost.code;
        if (!code) {
            advance();
            return;
        }
        try {
            const res = await fetch(`/api/reel-download?code=${encodeURIComponent(code)}`, {
                cache: 'no-store',
            });
            const data = await res.json();
            if (data?.videoUrl) {
                console.log('MP4:', data.videoUrl);
            } else {
                console.warn('No MP4 found for code:', code);
            }
        } catch (e) {
            console.error('Download error', e);
        } finally {
            advance();
        }
    };

    const handleEdit = () => currentPost && console.log('Edit post:', currentPost.id);

    const progressText = useMemo(() => {
        if (!total) return '0 of 0';
        return `${Math.min(index + 1, total)} of ${total}`;
    }, [index, total]);

    const primaryActionLabel = tab === 'story' ? 'Story' : 'Post';

    // Choose a reasonable default aspect for each type
    const getAspect = (p?: Post, tab?: 'post' | 'story') => {
        if (!p) return '1 / 1';
        if (tab === 'story') return '9 / 16';     // stories are vertical
        if (p.code) return '9 / 16';              // reels (code present) -> vertical
        return '4 / 5';                           // IG post portrait default
    };


    return (
        <div className="min-h-screen bg-[#e8e9eb] p-4">
            <div className="text-[#666] font-outfit text-base mb-6" />

            <div className="bg-white rounded-[32px] max-w-sm mx-auto overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-3">
                    <h1 className="text-black font-outfit text-xl font-medium">Pick and Post</h1>
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.32 5 13.38 5C10.1 5 7.1 5.81 4.77 7.28C2.68 8.61 2 10.88 2 12C2 13.12 2.68 15.39 4.77 16.72C7.1 18.19 10.1 19 13.38 19C14.32 19 15.24 18.94 17.33 18.83L13.5 21.5L15 23L21 17V15H19V9H21ZM17.33 17.97C16.5 18.16 15.56 18.2 14.59 18.2C11.34 18.2 8.67 17.45 6.81 16.36C5.21 15.42 4.8 14.58 4.8 14C4.8 13.42 5.21 12.58 6.81 11.64C8.67 10.55 11.34 9.8 14.59 9.8C15.56 9.8 16.5 9.84 17.33 10.03V17.97Z"
                                fill="white"
                            />
                        </svg>
                    </div>
                </div>

                {/* Segmented control */}
                <div className="px-6 pb-4">
                    <div className="flex items-center gap-6">
                        <button
                            type="button"
                            onClick={() => setTab('post')}
                            className={`rounded-full px-6 py-3 font-outfit text-[18px] transition-all ${tab === 'post'
                                ? 'bg-[#4a4653] text-white shadow-sm'
                                : 'bg-transparent text-[#bfbfc4] hover:text-black'
                                }`}
                            aria-pressed={tab === 'post'}
                            aria-label="Show Posts"
                        >
                            Post
                        </button>

                        <button
                            type="button"
                            onClick={() => setTab('story')}
                            className={`rounded-full px-6 py-3 font-outfit text-[18px] transition-all ${tab === 'story'
                                ? 'bg-[#4a4653] text-white shadow-sm'
                                : 'bg-transparent text-[#bfbfc4] hover:text-black'
                                }`}
                            aria-pressed={tab === 'story'}
                            aria-label="Show Stories"
                        >
                            Story
                        </button>
                    </div>
                </div>

                {/* Notices / errors */}
                {notice && (
                    <div className="px-6">
                        <div className="mb-4 rounded-2xl border border-blue-200/70 bg-blue-50 text-blue-700 text-sm p-4">
                            {notice}
                        </div>
                    </div>
                )}
                {error && (
                    <div className="px-6">
                        <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 text-red-700 text-sm p-4">
                            {error}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="px-6 select-none" style={{ touchAction: 'pan-y' }}>
                    {loading && (
                        <div className="bg-[#F8F8F8] rounded-3xl p-6 mb-6 animate-pulse text-[#666]">
                            {tab === 'story' ? 'Loading stories…' : 'Loading posts + reels…'}
                        </div>
                    )}

                    <AnimatePresence mode="wait" initial={false} presenceAffectsLayout={false}>
                        {currentPost && (
                            <motion.div
                                key={currentPost.id}
                                variants={{
                                    enter: { x: 300, opacity: 0, scale: 0.5 },
                                    center: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.3 } },
                                }}
                                initial="enter"
                                animate="center"
                                // no exit variant → avoid double animation
                                drag="x"
                                dragElastic={0.18}
                                dragMomentum={false}
                                style={{ x, rotate, willChange: 'transform' }}
                                onDragEnd={onDragEnd}
                                whileTap={{ scale: 0.995 }}
                                className="relative bg-[#F8F8F8] rounded-3xl p-4 mb-6"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={DEFAULT_AVATAR}
                                            alt={USERNAME}
                                            className="w-10 h-10 rounded-full object-cover"
                                            draggable={false}
                                        />
                                        <div>
                                            <div className="font-outfit text-sm font-medium text-black">{USERNAME}</div>
                                            <div className="font-outfit text-xs text-[#666]">@{USERNAME}</div>
                                        </div>
                                    </div>
                                    <button className="text-[#666] hover:text-black" aria-label="More">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor" />
                                        </svg>
                                    </button>
                                </div>
                                {/* Media Display */}
                                {(() => {
                                    const aspect = getAspect(currentPost, tab);
                                    const imgUrl =
                                        currentPost?.image
                                            ? `/api/proxy-media?url=${encodeURIComponent(currentPost.image)}`
                                            : null;
                                    const vidUrl =
                                        currentPost?.mediaUrl
                                            ? `/api/proxy-media?url=${encodeURIComponent(currentPost.mediaUrl)}`
                                            : null;

                                    return (
                                        <div
                                            className="rounded-2xl overflow-hidden mb-4 bg-[#f0f0f0] relative"
                                            style={{ aspectRatio: aspect, maxHeight: '70vh' }} // prevent overly tall cards
                                        >
                                            {vidUrl ? (
                                                <video
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                    src={vidUrl}
                                                    poster={imgUrl ?? undefined}
                                                    controls
                                                    muted
                                                    playsInline
                                                />
                                            ) : imgUrl ? (
                                                <img
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                    src={imgUrl}
                                                    alt={tab === 'story' ? 'Instagram story' : 'Instagram post'}
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="absolute inset-0 w-full h-full flex items-center justify-center text-[#666]">
                                                    Media unavailable
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}


                                {/* Caption (none from this API) */}
                                {currentPost.content && (
                                    <div className="text-[#333] font-outfit text-sm leading-relaxed mb-2">
                                        {currentPost.content}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Empty state */}
                    {!loading && (!currentPost || index >= total) && (
                        <div className="bg-[#F8F8F8] rounded-3xl p-6 mb-6 text-center">
                            <div className="font-outfit text-md text-[#333] mb-2">You’re all caught up</div>
                            <div className="text-[#666] text-sm">
                                {tab === 'story'
                                    ? 'No active stories right now.'
                                    : 'Try another Instagram username.'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0F0F0]">
                    <button
                        onClick={() => (currentPost ? handleIgnore() : undefined)}
                        className="flex flex-col items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <div className="w-8 h-8 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M18 6L6 18M6 6l12 12"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <span className="text-[#666] font-outfit text-xs">Ignore</span>
                    </button>

                    <button
                        onClick={handleEdit}
                        className="flex flex-col items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <div className="w-8 h-8 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <span className="text-[#666] font-outfit text-xs">Edit</span>
                    </button>

                    <button
                        onClick={() => (currentPost ? handleCast() : undefined)}
                        className="flex flex-col items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <div className="w-8 h-8 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M5 12h14m-7-7l7 7-7 7"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <span className="text-[#666] font-outfit text-xs">{primaryActionLabel}</span>
                    </button>
                </div>

                <div className="text-center py-3 text-[#666] font-outfit text-sm border-t border-[#F0F0F0]">
                    {progressText}
                </div>

                {/* Bottom nav */}
                <div className="flex items-center justify-around py-4 border-t border-[#F0F0F0]">
                    <button
                        className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                        aria-label="Add"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14m-7-7h14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <Link
                        href="/settings"
                        className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                        aria-label="Settings"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" />
                            <path
                                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                                stroke="white"
                                strokeWidth="2"
                            />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}
