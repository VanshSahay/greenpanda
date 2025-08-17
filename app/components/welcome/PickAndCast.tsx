'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    motion,
    AnimatePresence,
    PanInfo,
    useMotionValue,
    useTransform,
    animate,
} from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createCoin, createMetadataBuilder, createZoraUploaderForCreator, CreateCoinArgs, CreateConstants, setApiKey } from "@zoralabs/coins-sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Set up your API key before making any SDK requests
setApiKey("zora_api_571e9584827faba1429cd4132e9559c5770afe1985d47abf71418d685f9ce204");

interface Post {
    id: string | number;
    author: { name: string; username: string; avatar: string };
    image: string | null;
    content: string;
    hashtags: string[];
    likes: number;
    comments: number;
    code?: string;
    takenAt?: number | null;
    mediaUrl?: string | null;
}

type ApiItem = {
    id: string;
    code?: string | null;
    thumbnail: string | null;
    mediaUrl?: string | null;
    caption?: string | null;
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

export default function PickAndCast() {
    const searchParams = useSearchParams();
    const USERNAME = searchParams.get('username') || 'icc'; // Fallback to 'icc' if no username provided
    const privateKeyParam = searchParams.get('privateKey');
    // Ensure private key has 0x prefix for viem compatibility
    const PRIVATE_KEY = privateKeyParam 
        ? (privateKeyParam.startsWith('0x') ? privateKeyParam : `0x${privateKeyParam}`) as `0x${string}`
        : null;
    
    // Debug logging
    console.log('PickAndCast initialized with:', { 
        USERNAME, 
        hasPrivateKey: !!PRIVATE_KEY,
        privateKeyLength: PRIVATE_KEY?.length || 0,
        privateKeyFormatted: PRIVATE_KEY ? `${PRIVATE_KEY.substring(0, 6)}...${PRIVATE_KEY.substring(PRIVATE_KEY.length - 4)}` : 'none'
    });
    const [queue, setQueue] = useState<Post[]>([]);
    const [index, setIndex] = useState(0);

    const [loading, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [, setNotice] = useState<string | null>(null);

    const [after, setAfter] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [tab, setTab] = useState<'post' | 'story'>('post');

    // Profile state
    const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // EDITOR state
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [draftCaption, setDraftCaption] = useState('');

    // COIN CREATION state
    const [coinCreationStatus, setCoinCreationStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [coinResult, setCoinResult] = useState<{hash: `0x${string}`; address: `0x${string}` | undefined} | null>(null);

    // Motion values
    const UP_TRIGGER = 120;                 // px to trigger editor
    const [upProgress, setUpProgress] = useState(0);

    // Motion values
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const opacity = useTransform(x, [-150, 0, 150], [0.7, 1, 0.7]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const scale = useTransform(x, [-150, 0, 150], [0.95, 1, 0.95]);
    
    // Visual feedback for swipe actions
    const leftActionOpacity = useTransform(x, [-150, -50, 0], [1, 0.3, 0]);
    const rightActionOpacity = useTransform(x, [0, 50, 150], [0, 0.3, 1]);

    // Helper function to generate coin details from caption
    const generateCoinDetails = (caption: string, isStory: boolean = false) => {
        if (!caption || caption.trim().length === 0) {
            const defaultName = isStory ? "Instagram Story" : "Instagram Post";
            const defaultSymbol = isStory ? "STORY" : "POST";
            const defaultDescription = isStory 
                ? "A coin created from an Instagram story" 
                : "A coin created from an Instagram post";
            
            return {
                name: defaultName,
                symbol: defaultSymbol,
                description: defaultDescription
            };
        }

        // Clean caption and extract meaningful words
        const cleanCaption = caption.replace(/[^\w\s#@]/g, ' ').trim();
        const words = cleanCaption.split(/\s+/).filter(word => 
            word.length > 2 && 
            !word.startsWith('#') && 
            !word.startsWith('@') &&
            !/^(the|and|but|for|are|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|two|way|who|boy|did|man|how|too|any|may|say|she|use|her|now|oil|sit|set)$/i.test(word)
        );

        // Generate name (first 2-3 meaningful words, capitalize first letters)
        const nameWords = words.slice(0, 3);
        const name = nameWords.length > 0 
            ? nameWords.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            : "Instagram Post";

        // Generate symbol (first letters of name words, max 6 chars)
        const symbol = nameWords.length > 0
            ? nameWords.map(word => word.charAt(0).toUpperCase()).join('').slice(0, 6)
            : "POST";

        // Use original caption as description
        const description = caption.trim();

        return { name, symbol, description };
    };

    // Helper function to detect if URL is a video
    const isVideoUrl = (url: string): boolean => {
        const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
        const lowerUrl = url.toLowerCase();
        return videoExtensions.some(ext => lowerUrl.includes(ext)) || 
               lowerUrl.includes('video') || 
               lowerUrl.includes('reel') ||
               lowerUrl.includes('.mp4');
    };

    // Helper function to get MIME type from URL
    const getMimeType = (url: string, isVideo: boolean): string => {
        if (isVideo) {
            if (url.toLowerCase().includes('.webm')) return 'video/webm';
            if (url.toLowerCase().includes('.mov')) return 'video/quicktime';
            if (url.toLowerCase().includes('.avi')) return 'video/x-msvideo';
            return 'video/mp4'; // Default for videos
        }
        
        if (url.toLowerCase().includes('.png')) return 'image/png';
        if (url.toLowerCase().includes('.gif')) return 'image/gif';
        if (url.toLowerCase().includes('.webp')) return 'image/webp';
        return 'image/jpeg'; // Default for images
    };

    // Helper function to create video thumbnail (kept for future use)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const createVideoThumbnail = (videoFile: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            
            video.preload = 'metadata';
            video.muted = true;
            
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth || 400;
                canvas.height = video.videoHeight || 400;
                video.currentTime = 0.1; // Seek to 0.1 seconds for thumbnail
            };
            
            video.onseeked = () => {
                try {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const thumbnailFile = new File([blob], `${videoFile.name}-thumbnail.png`, { 
                                type: 'image/png' 
                            });
                            resolve(thumbnailFile);
                        } else {
                            reject(new Error('Failed to create thumbnail blob'));
                        }
                    }, 'image/png', 0.8);
                } catch (error) {
                    reject(error);
                } finally {
                    video.remove();
                    canvas.remove();
                }
            };
            
            video.onerror = () => reject(new Error('Failed to load video for thumbnail'));
            
            const videoUrl = URL.createObjectURL(videoFile);
            video.src = videoUrl;
            video.load();
        });
    };

    // Function to create coin from current post
    const createCoinFromPost = async (post: Post) => {
        console.log('Creating coin from post:', { 
            id: post.id, 
            hasImage: !!post.image, 
            hasMediaUrl: !!post.mediaUrl, 
            content: post.content,
            tab: tab 
        });
        
        if (!PRIVATE_KEY) {
            console.error('No private key available for coin creation');
            setCoinCreationStatus("error");
            return;
        }

        // Validate private key format
        if (PRIVATE_KEY.length !== 66) { // 0x + 64 hex characters
            console.error('Invalid private key length. Expected 66 characters (0x + 64 hex), got:', PRIVATE_KEY.length);
            setCoinCreationStatus("error");
            return;
        }

        // For stories, we can create coins even without media by using a placeholder
        // For posts, we need at least an image
        if (tab !== 'story' && !post.image && !post.mediaUrl) {
            console.error('No image or mediaUrl available for coin creation');
            setCoinCreationStatus("error");
            return;
        }

        setCoinCreationStatus("pending");
        try {
            // Create account from private key
            const account = privateKeyToAccount(PRIVATE_KEY);

            // Setup viem clients
            const publicClient = createPublicClient({
                chain: base,
                transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'),
            });
            const walletClient = createWalletClient({
                chain: base,
                transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'),
                account: account as unknown as `0x${string}`, // Type assertion for viem compatibility
            });

            // Generate coin details from caption
            const isStory = tab === 'story';
            const { name, symbol, description } = generateCoinDetails(post.content, isStory);

            // Determine which media URL to use
            const mediaUrl = post.image || post.mediaUrl;
            let createMetadataParameters;
            
            if (mediaUrl) {
                // Detect if this is a video or image
                const isVideo = isVideoUrl(mediaUrl) || !!post.code; // reels have codes and are videos
                
                console.log('Media detected:', { isVideo, hasCode: !!post.code, mediaUrl });
                
                if (isVideo && post.code) {
                    // For reels, get the actual video URL from the reel-download API
                    console.log('Fetching actual video URL for reel code:', post.code);
                    const reelResponse = await fetch(`/api/reel-download?code=${encodeURIComponent(post.code)}`, { cache: 'no-store' });
                    const reelData = await reelResponse.json();
                    
                    if (!reelData.videoUrl) {
                        console.error('Failed to get video URL for reel:', post.code);
                        throw new Error('Could not fetch video URL for reel');
                    }
                    
                    console.log('Got actual video URL:', reelData.videoUrl);
                    
                    // Download the actual video
                    const videoResponse = await fetch(`/api/proxy-media?url=${encodeURIComponent(reelData.videoUrl)}`);
                    const videoBlob = await videoResponse.blob();
                    const mimeType = getMimeType(reelData.videoUrl, true);
                    
                    // Download the thumbnail (original mediaUrl is often the thumbnail for reels)
                    const thumbnailResponse = await fetch(`/api/proxy-media?url=${encodeURIComponent(mediaUrl)}`);
                    const thumbnailBlob = await thumbnailResponse.blob();
                    
                    // Handle video content with EIP-7572 standard
                    const uploader = createZoraUploaderForCreator(account.address);
                    
                    // Create and upload video file
                    const videoFile = new File([videoBlob], `${post.id}.mp4`, { type: mimeType });
                    const videoUploadResult = await uploader.upload(videoFile);
                    console.log('Video uploaded:', videoUploadResult.url);
                    console.log('Video file info:', { 
                        name: videoFile.name, 
                        size: videoFile.size, 
                        type: videoFile.type,
                        originalUrl: reelData.videoUrl 
                    });
                    
                    // Create and upload thumbnail file
                    const thumbnailFile = new File([thumbnailBlob], `${post.id}-thumbnail.jpg`, { type: 'image/jpeg' });
                    const thumbnailUploadResult = await uploader.upload(thumbnailFile);
                    console.log('Thumbnail uploaded:', thumbnailUploadResult.url);
                    console.log('Thumbnail file info:', { 
                        name: thumbnailFile.name, 
                        size: thumbnailFile.size, 
                        type: thumbnailFile.type,
                        originalUrl: mediaUrl 
                    });
                    
                    // Create EIP-7572 compliant video metadata
                    const videoMetadata = {
                        name: name,
                        symbol: symbol,
                        description: description,
                        image: thumbnailUploadResult.url, // Thumbnail from Instagram
                        animation_url: videoUploadResult.url, // Actual video
                        content: {
                            mime: mimeType,
                            uri: videoUploadResult.url
                        },
                        properties: {
                            category: isStory ? "story" : "media"
                        }
                    };
                    
                    console.log('Creating video metadata:', videoMetadata);
                    
                    // Upload metadata as JSON
                    const metadataBlob = new Blob([JSON.stringify(videoMetadata)], { type: 'application/json' });
                    const metadataFile = new File([metadataBlob], `metadata-${post.id}.json`, { type: 'application/json' });
                    const metadataUploadResult = await uploader.upload(metadataFile);
                    
                    createMetadataParameters = {
                        name: name,
                        symbol: symbol,
                        metadata: { type: "RAW_URI" as const, uri: metadataUploadResult.url }
                    };
                } else {
                    // Handle image content or non-reel videos
                    const mediaResponse = await fetch(`/api/proxy-media?url=${encodeURIComponent(mediaUrl)}`);
                    const mediaBlob = await mediaResponse.blob();
                    const mimeType = getMimeType(mediaUrl, isVideo);
                    // Handle image content with standard metadata builder
                    const imageFile = new File([mediaBlob], `${post.id}.jpg`, { type: mimeType });
                    
                    const metadataBuilder = createMetadataBuilder()
                        .withName(name)
                        .withSymbol(symbol)
                        .withDescription(description);

                    const result = await metadataBuilder
                        .withImage(imageFile)
                        .upload(createZoraUploaderForCreator(account.address));
                    
                    createMetadataParameters = result.createMetadataParameters;
                }
            } else {
                // Create a placeholder image if no media is available
                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 400;
                const ctx = canvas.getContext('2d')!;
                
                ctx.fillStyle = '#7C65C1';
                ctx.fillRect(0, 0, 400, 400);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(isStory ? 'Story' : 'Post', 200, 180);
                ctx.font = '16px Arial';
                ctx.fillText('Instagram Coin', 200, 220);
                
                const placeholderBlob = await new Promise<Blob>((resolve) => {
                    canvas.toBlob((blob) => resolve(blob!), 'image/png');
                });
                const imageFile = new File([placeholderBlob], `placeholder-${post.id}.png`, { type: 'image/png' });
                
                const metadataBuilder = createMetadataBuilder()
                    .withName(name)
                    .withSymbol(symbol)
                    .withDescription(description);

                const result = await metadataBuilder
                    .withImage(imageFile)
                    .upload(createZoraUploaderForCreator(account.address));
                
                createMetadataParameters = result.createMetadataParameters;
            }

            // Build coin creation parameters
            const params: CreateCoinArgs = {
                ...createMetadataParameters,
                creator: account.address,
                currency: CreateConstants.ContentCoinCurrencies.ZORA,
                chainId: base.id,
            };

            console.log("Creating coin with params:", params);

            const res = await createCoin({
                call: params,
                walletClient,
                publicClient,
            });

            setCoinResult(res);
            setCoinCreationStatus("success");
            console.log("Coin created successfully:", res);
        } catch (err) {
            console.error("Error creating coin:", err);
            setCoinCreationStatus("error");
        }
    };

    useEffect(() => {
        x.set(0);
    }, [index, x]);

    // Profile loader
    useEffect(() => {
        (async () => {
            try {
                setProfileLoading(true);
                const res = await fetch('/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username_or_url: USERNAME }),
                    cache: 'no-store',
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to fetch profile');
                if (data.success && data.profilePicUrl) setProfilePicUrl(data.profilePicUrl);
            } catch (e) {
                console.error('Error loading profile', e);
            } finally {
                setProfileLoading(false);
            }
        })();
    }, [USERNAME]);

    // Map API → UI
    const mapToPost = useCallback((m: ApiItem): Post => ({
        id: m.id,
        author: { name: USERNAME, username: USERNAME, avatar: profilePicUrl || DEFAULT_AVATAR },
        image: m.thumbnail ?? null,
        content: (m.caption ?? '').trim(),
        hashtags: [],
        likes: (m.stats?.likeCount ?? 0) || 0,
        comments: (m.stats?.commentCount ?? 0) || 0,
        code: m.code ?? undefined,
        takenAt: m.takenAt ?? null,
        mediaUrl: m.mediaUrl ?? null,
    }), [USERNAME, profilePicUrl]);

    // Fetch page (posts or stories)
    const loadPage = useCallback(async (cursor: string | null, mode: 'post' | 'story' = 'post') => {
        const endpoint = mode === 'story' ? '/api/stories' : '/api/posts';
        const payload: { username_or_url: string; after?: string } = { username_or_url: USERNAME };
        if (mode === 'post' && cursor) payload.after = cursor;

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        const data: ApiResponse = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to fetch ${mode}`);

        const newPosts = (data.items || [])
            .filter((m) => m.thumbnail || m.mediaUrl)
            .map(mapToPost);

        setQueue((prev) => {
            const byId = new Map<string | number, Post>();
            [...prev, ...newPosts].forEach((p) => byId.set(p.id, p));
            const merged = Array.from(byId.values());
            merged.sort((a, b) => (b.takenAt ?? 0) - (a.takenAt ?? 0));
            return merged;
        });

        setHasMore(mode === 'post' ? Boolean(data.pageInfo?.hasNextPage) : false);
        setAfter(mode === 'post' ? data.pageInfo?.endCursor ?? null : null);
        if (mode === 'story' && (!data.items || data.items.length === 0)) setNotice('No active stories right now.');
    }, [USERNAME]);

    // Initial & on tab change
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                setNotice(null);
                setQueue([]);
                setIndex(0);
                setAfter(null);
                setHasMore(false);

                await loadPage(null, tab);
                if (!alive) return;
                setNotice(tab === 'story' ? `Loaded stories for @${USERNAME}.` : `Loaded posts + reels for @${USERNAME}.`);
            } catch (e: unknown) {
                if (alive) setError(e instanceof Error ? e.message : `Unable to load ${tab}`);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [tab, USERNAME]);

    // Lock scroll when editor is open
    useEffect(() => {
        if (isEditorOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isEditorOpen]);

    // Prefetch next image
    useEffect(() => {
        const next = queue[index + 1]?.image;
        if (next) {
            const img = new Image();
            img.src = next;
        }
    }, [queue, index]);

    // Auto-load more (posts only)
    useEffect(() => {
        if (tab === 'post' && index >= queue.length - 3 && hasMore) {
            loadPage(after, 'post').catch(() => { });
        }
    }, [index, queue.length, hasMore, after, tab]);

    const total = queue.length;
    const currentPost = queue[index];

    // navigation + swipe
    const advance = () => {
        setIndex((i) => Math.min(i + 1, total));
        setCoinCreationStatus("idle"); // Reset coin creation status for next post
        setCoinResult(null);
    };
    const snapBack = () => animate(x, 0, { type: 'spring', stiffness: 600, damping: 40 });

    const flyOutLeft = async () => {
        const width = typeof window !== 'undefined' ? window.innerWidth : 500;
        await animate(x, -width * 1.1, { duration: 0.22 });
        advance();
    };

    const flyOutRight = async () => {
        const width = typeof window !== 'undefined' ? window.innerWidth : 500;
        await animate(x, width * 1.1, { duration: 0.22 });
        // Trigger coin creation before advancing
        if (currentPost) {
            await createCoinFromPost(currentPost);
        }
        advance();
    };

    const onDragEnd = (_: PointerEvent, info: PanInfo) => {
        const farLeft = info.offset.x < -120;
        const fastLeft = info.velocity.x < -600;
        const farRight = info.offset.x > 120;
        const fastRight = info.velocity.x > 600;
        const farUp = info.offset.y < -UP_TRIGGER;
        const fastUp = info.velocity.y < -600;
        
        if (farLeft || fastLeft) {
            flyOutLeft();
            return;
        }
        
        if (farRight || fastRight) {
            flyOutRight();
            return;
        }
        
        // Check for upward swipe to open editor
        if (farUp || fastUp) {
            handleEdit();
            return;
        }
        
        snapBack();
    };


    const handleIgnore = () => flyOutLeft();

    const handleCast = async () => {
        if (!currentPost) return;
        
        // Create coin from the current post
        await createCoinFromPost(currentPost);
        
        // Always advance after coin creation, regardless of post type
        advance();
    };

    const handleEdit = () => {
        if (!currentPost) return;
        setDraftCaption(currentPost.content || '');
        setIsEditorOpen(true);
        
        // Add a small delay to make the transition feel natural after the swipe
        setTimeout(() => {
            // Reset the up progress after opening editor
            setUpProgress(0);
        }, 100);
    };

    const handleEditorCast = async () => {
        setQueue((prev) => {
            const next = [...prev];
            if (next[index]) next[index] = { ...next[index], content: draftCaption };
            return next;
        });
        setIsEditorOpen(false);
        
        // Get the updated post with new caption
        const updatedPost = { ...currentPost, content: draftCaption };
        if (updatedPost) {
            await createCoinFromPost(updatedPost);
        }
        
        advance();
    };

    const progressText = useMemo(() => {
        if (!total) return '0 of 0';
        return `${Math.min(index + 1, total)} of ${total}`;
    }, [index, total]);

    const primaryActionLabel = tab === 'story' ? 'Story' : 'Post';

    const getAspect = (p?: Post, t?: 'post' | 'story') => {
        if (!p) return '1 / 1';
        if (t === 'story') return '9 / 16';
        if (p.code) return '9 / 16';
        return '1 / 1';
    };

    return (
        <div className="min-h-screen bg-[#e8e9eb] p-4">
            <div className="text-[#666] font-outfit text-base mb-6" />

            <div className="bg-white rounded-[32px] max-w-sm mx-auto overflow-hidden relative">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-3">
                    <div className="flex items-center gap-3">
                        {profileLoading ? (
                            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                        ) : profilePicUrl ? (
                            <img
                                src={`/api/proxy-media?url=${encodeURIComponent(profilePicUrl)}`}
                                alt={USERNAME}
                                className="w-10 h-10 rounded-full object-cover"
                                draggable={false}
                            />
                        ) : (
                            <img src={DEFAULT_AVATAR} alt={USERNAME} className="w-10 h-10 rounded-full object-cover" draggable={false} />
                        )}
                        <div>
                            <h1 className="text-black font-outfit text-xl font-medium">Pick and cast</h1>
                            <p className="text-gray-500 font-outfit text-sm">@{USERNAME}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => loadPage(null, tab)}
                        className="w-8 h-8 bg-black rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
                        title="Refresh"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.32 5 13.38 5C10.1 5 7.1 5.81 4.77 7.28C2.68 8.61 2 10.88 2 12C2 13.12 2.68 15.39 4.77 16.72C7.1 18.19 10.1 19 13.38 19C14.32 19 15.24 18.94 17.33 18.83L13.5 21.5L15 23L21 17V15H19V9H21ZM17.33 17.97C16.5 18.16 15.56 18.2 14.59 18.2C11.34 18.2 8.67 17.45 6.81 16.36C5.21 15.42 4.8 14.58 4.8 14C4.8 13.42 5.21 12.58 6.81 11.64C8.67 10.55 11.34 9.8 14.59 9.8C15.56 9.8 16.5 9.84 17.33 10.03V17.97Z"
                                fill="white"
                            />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pb-4">
                    <div className="flex items-center gap-6">
                        <button
                            type="button"
                            onClick={() => setTab('post')}
                            className={`rounded-full px-6 py-3 font-outfit text-[18px] transition-all ${tab === 'post' ? 'bg-[#4a4653] text-white shadow-sm' : 'bg-transparent text-[#bfbfc4] hover:text-black'
                                }`}
                        >
                            Post
                        </button>

                        <button
                            type="button"
                            onClick={() => setTab('story')}
                            className={`rounded-full px-6 py-3 font-outfit text-[18px] transition-all ${tab === 'story' ? 'bg-[#4a4653] text-white shadow-sm' : 'bg-transparent text-[#bfbfc4] hover:text-black'
                                }`}
                        >
                            Story
                        </button>
                    </div>
                </div>

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
                                                                 drag="x"                      // only allow horizontal dragging
                                 dragElastic={0.18}
                                 dragMomentum={false}
                                                                 style={{ 
                                     x, 
                                     rotate
                                 }}
                                                                                                  onDragStart={() => {
                                     // Reset progress when starting drag
                                     setUpProgress(0);
                                 }}
                                 onDragEnd={onDragEnd}
                                 whileTap={{ scale: 0.995 }}
                                 onTouchStart={(e) => {
                                     const touch = e.touches[0];
                                     if (touch) {
                                         // Store initial touch position
                                         (e.currentTarget as HTMLElement & { _touchStartY?: number; _touchStartTime?: number })._touchStartY = touch.clientY;
                                         (e.currentTarget as HTMLElement & { _touchStartY?: number; _touchStartTime?: number })._touchStartTime = Date.now();
                                     }
                                 }}
                                 onTouchMove={(e) => {
                                     const touch = e.touches[0];
                                     const target = e.currentTarget as HTMLElement & { _touchStartY?: number; _touchStartTime?: number };
                                     if (touch && target._touchStartY !== undefined) {
                                         const startY = target._touchStartY;
                                         const currentY = touch.clientY;
                                         const deltaY = startY - currentY; // Positive when swiping up
                                         
                                         if (deltaY > 0) { // Only track upward swipes
                                             const prog = Math.min(1, Math.max(0, deltaY / UP_TRIGGER));
                                             setUpProgress(prog);
                                         }
                                     }
                                 }}
                                 onTouchEnd={(e) => {
                                     const touch = e.changedTouches[0];
                                     const target = e.currentTarget as HTMLElement & { _touchStartY?: number; _touchStartTime?: number };
                                     if (touch && target._touchStartY !== undefined) {
                                         const startY = target._touchStartY;
                                         const endY = touch.clientY;
                                         const deltaY = startY - endY; // Positive when swiping up
                                         const startTime = target._touchStartTime ?? Date.now();
                                         const endTime = Date.now();
                                         const duration = endTime - startTime;
                                         const velocity = deltaY / duration;
                                         
                                         // Check if swipe up was sufficient to trigger editor
                                         if (deltaY > UP_TRIGGER || velocity > 0.8) { // 0.8 px/ms threshold
                                             handleEdit();
                                         }
                                         
                                         // Reset progress
                                         setUpProgress(0);
                                         
                                         // Clean up stored values
                                         delete target._touchStartY;
                                         delete target._touchStartTime;
                                     }
                                 }}
                                className="relative bg-[#F8F8F8] rounded-3xl p-4 mb-6"
                            >
                                {/* Swipe Action Overlays */}
                                <motion.div
                                    className="absolute inset-0 bg-red-500/20 rounded-3xl flex items-center justify-start pl-8 pointer-events-none"
                                    style={{ opacity: leftActionOpacity }}
                                >
                                    <div className="flex items-center gap-2 text-red-600">
                                        <img src="/Icon/ignoreIcon.svg" alt="Ignore" className="w-8 h-8" />
                                        <span className="font-outfit font-medium">Ignore</span>
                                    </div>
                                </motion.div>
                                
                                <motion.div
                                    className="absolute inset-0 bg-green-500/20 rounded-3xl flex items-center justify-end pr-8 pointer-events-none"
                                    style={{ opacity: rightActionOpacity }}
                                >
                                    <div className="flex items-center gap-2 text-green-600">
                                        <span className="font-outfit font-medium">Create Coin</span>
                                        <img src="/Icon/rightArrowIcon.svg" alt="Post" className="w-8 h-8" />
                                    </div>
                                </motion.div>

                                {/* Header */}

                                                                 {/* Pull-up to edit hint */}
                                 <motion.div
                                     className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-outfit shadow"
                                     style={{
                                         opacity: upProgress,              // fade in as you pull
                                         background: `rgba(0,0,0,${0.35 + 0.4 * upProgress})`,
                                         pointerEvents: 'none'
                                     }}
                                 >
                                     {upProgress < 1 ? 'Pull up to edit' : 'Release to edit'}
                                 </motion.div>
                                 
                                 {/* Visual feedback for upward swipe */}
                                 {upProgress > 0.3 && (
                                     <motion.div
                                         className="absolute inset-0 bg-blue-500/10 rounded-3xl border-2 border-blue-400/30 pointer-events-none"
                                         style={{
                                             opacity: upProgress
                                         }}
                                     />
                                 )}
                                 
                                 {/* Subtle upward movement indicator */}
                                 {upProgress > 0.1 && (
                                     <motion.div
                                         className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-2 bg-blue-400 rounded-full pointer-events-none"
                                         style={{
                                             opacity: upProgress
                                         }}
                                     />
                                 )}


                                {/* Card header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {profileLoading ? (
                                            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                                        ) : profilePicUrl ? (
                                            <img
                                                src={`/api/proxy-media?url=${encodeURIComponent(profilePicUrl)}`}
                                                alt={USERNAME}
                                                className="w-10 h-10 rounded-full object-cover"
                                                draggable={false}
                                            />
                                        ) : (
                                            <img src={DEFAULT_AVATAR} alt={USERNAME} className="w-10 h-10 rounded-full object-cover" draggable={false} />
                                        )}
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

                                {/* Media */}
                                {(() => {
                                    const aspect = getAspect(currentPost, tab);
                                    const imgUrl = currentPost?.image ? `/api/proxy-media?url=${encodeURIComponent(currentPost.image)}` : null;
                                    const vidUrl = currentPost?.mediaUrl ? `/api/proxy-media?url=${encodeURIComponent(currentPost.mediaUrl)}` : null;

                                    return (
                                        <div
                                            className="rounded-2xl overflow-hidden mb-4 bg-[#f0f0f0] relative w-full"
                                            style={{ aspectRatio: aspect, maxHeight: tab === 'story' ? '60vh' : '50vh', minHeight: '200px' }}
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
                                                <img className="absolute inset-0 w-full h-full object-cover" src={imgUrl} alt="Instagram media" draggable={false} />
                                            ) : (
                                                <div className="absolute inset-0 w-full h-full flex items-center justify-center text-[#666]">Media unavailable</div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Caption */}
                                {!!currentPost.content && (
                                    <div className="text-black font-outfit text-sm leading-relaxed mb-2 whitespace-pre-wrap">{currentPost.content}</div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Empty state */}
                    {!loading && (!currentPost || index >= total) && (
                        <div className="bg-[#F8F8F8] rounded-3xl p-6 mb-6 text-center">
                            <div className="font-outfit text-md text-[#333] mb-2">You’re all caught up</div>
                            <div className="text-[#666] text-sm">{tab === 'story' ? 'No active stories right now.' : 'Try another Instagram username.'}</div>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0F0F0]">
                    <button onClick={() => (currentPost ? handleIgnore() : undefined)} className="flex flex-col items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center justify-center">
                            <img src="/Icon/ignoreIcon.svg" alt="Ignore" className="w-12 h-12" />
                        </div>
                        <span className="text-[#666] font-outfit text-xs">Ignore</span>
                    </button>

                    <button onClick={handleEdit} className="flex flex-col items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center justify-center">
                            <img src="/Icon/editIcon.svg" alt="Edit" className="w-12 h-12" />
                        </div>
                        <span className="text-[#666] font-outfit text-xs">Edit</span>
                    </button>

                    <button 
                        onClick={() => (currentPost ? handleCast() : undefined)} 
                        disabled={coinCreationStatus === "pending"}
                        className="flex flex-col items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <div className="flex items-center justify-center relative">
                            {coinCreationStatus === "pending" ? (
                                <div className="w-12 h-12 border-2 border-gray-300 border-t-[#7C65C1] rounded-full animate-spin"></div>
                            ) : coinCreationStatus === "success" ? (
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            ) : coinCreationStatus === "error" ? (
                                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M6 6l12 12M6 18L18 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </div>
                            ) : (
                                <img src="/Icon/rightArrowIcon.svg" alt="Cast" className="w-12 h-12" />
                            )}
                        </div>
                        <span className="text-[#666] font-outfit text-xs">
                            {coinCreationStatus === "pending" ? "Creating..." : 
                             coinCreationStatus === "success" ? "Created!" :
                             coinCreationStatus === "error" ? "Failed" :
                             primaryActionLabel}
                        </span>
                    </button>
                </div>

                <div className="text-center py-3 text-[#666] font-outfit text-sm border-t border-[#F0F0F0]">{progressText}</div>

                {/* Bottom nav */}
                <div className="flex items-center justify-center py-4 border-t border-[#F0F0F0]">
                    <Link href="/settings" className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors" aria-label="Settings">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="white" strokeWidth="2" />
                        </svg>
                    </Link>
                </div>

                {/* EDITOR SHEET */}
                <AnimatePresence>
                    {isEditorOpen && (
                        <>
                            <motion.div
                                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsEditorOpen(false)}
                            />

                            <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:p-5 pointer-events-none">
                                                                 <motion.div
                                     role="dialog"
                                     aria-modal="true"
                                     className="pointer-events-auto w-full max-w-sm bg-white rounded-[28px] shadow-2xl overflow-hidden"
                                     initial={{ y: '100%', scale: 0.95 }}
                                     animate={{ y: 0, scale: 1 }}
                                     exit={{ y: '100%', scale: 0.95 }}
                                     transition={{ 
                                         type: 'spring', 
                                         stiffness: 420, 
                                         damping: 40,
                                         scale: { delay: 0.1, duration: 0.2 }
                                     }}
                                    drag="y"
                                    dragConstraints={{ top: 0, bottom: 0 }}
                                    dragElastic={{ top: 0, bottom: 0.4 }}
                                    onDragEnd={(_, info) => {
                                        if (info.offset.y > 120 || info.velocity.y > 800) setIsEditorOpen(false);
                                    }}
                                    style={{ maxHeight: 'min(86dvh, 720px)' }}
                                >
                                    <div className="px-5 pt-4">
                                        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold font-outfit">Edit post</h3>
                                            <button
                                                onClick={() => setIsEditorOpen(false)}
                                                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100"
                                                aria-label="Close editor"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                            </button>
                                        </div>

                                        <img src="/Icon/curvyLineIcon.svg" alt="Decorative wave" className="mb-6" />
                                    </div>

                                    <div className="px-5 mt-3 overflow-auto" style={{ maxHeight: 'calc(min(86dvh, 720px) - 168px)' }}>
                                        <textarea
                                            className="w-full h-[240px] sm:h-[280px] rounded-2xl bg-[#F3F3F4] p-4 outline-none resize-none font-outfit text-[15px] leading-6 text-[#161616] focus:ring-2 focus:ring-black/10"
                                            value={draftCaption}
                                            onChange={(e) => setDraftCaption(e.target.value)}
                                            placeholder="Write your caption…"
                                        />
                                    </div>

                                    <div className="px-5 mt-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 14px)' }}>
                                        <button
                                            onClick={handleEditorCast}
                                            className="w-full bg-black text-white font-outfit text-base py-4 rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.18)] active:translate-y-[2px] active:shadow-[0_6px_0_0_rgba(0,0,0,0.18)]"
                                        >
                                            Post
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
