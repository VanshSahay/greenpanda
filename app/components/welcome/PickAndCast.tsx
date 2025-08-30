'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRef, useLayoutEffect } from "react";

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
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';

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
    const [coinResult, setCoinResult] = useState<{ hash: `0x${string}`; address: `0x${string}` | undefined } | null>(null);

    // Motion values
    const UP_TRIGGER = 120;                 // px to trigger editor
    const [upProgress, setUpProgress] = useState(0);

    const { address, isConnected } = useAccount();
const { data: walletClient } = useWalletClient();
const publicClient = usePublicClient(); // auto-uses your Wagmi/RainbowKit config


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
          tab,
        });
      
        // Must have a connected wallet + clients
        if (!isConnected || !address || !walletClient || !publicClient) {
          console.error('Wallet not connected or clients unavailable');
          setCoinCreationStatus('error');
          return;
        }
      
        // For posts (not stories), require some media
        if (tab !== 'story' && !post.image && !post.mediaUrl) {
          console.error('No image or mediaUrl available for coin creation');
          setCoinCreationStatus('error');
          return;
        }
      
        setCoinCreationStatus('pending');
      
        try {
          const isStory = tab === 'story';
          const { name, symbol, description } = generateCoinDetails(post.content, isStory);
      
          // Pick a media URL to use (if any)
          const mediaUrl = post.image || post.mediaUrl;
          let createMetadataParameters;
      
          if (mediaUrl) {
            const isVideo = isVideoUrl(mediaUrl) || !!post.code; // reels have codes and are videos
            console.log('Media detected:', { isVideo, hasCode: !!post.code, mediaUrl });
      
            if (isVideo && post.code) {
              // VIDEO CONTENT: Use EIP-7572 standard with animation_url and content
              console.log('Processing video content with EIP-7572 metadata');
              
              // Reels: resolve the real video URL
              const reelResponse = await fetch(`/api/reel-download?code=${encodeURIComponent(post.code)}`, { cache: 'no-store' });
              const reelData = await reelResponse.json();
              if (!reelData.videoUrl) throw new Error('Could not fetch video URL for reel');
      
              // Download assets
              const videoResponse = await fetch(`/api/proxy-media?url=${encodeURIComponent(reelData.videoUrl)}`);
              const videoBlob = await videoResponse.blob();
              const thumbnailResponse = await fetch(`/api/proxy-media?url=${encodeURIComponent(mediaUrl)}`);
              const thumbnailBlob = await thumbnailResponse.blob();
              const mimeType = getMimeType(reelData.videoUrl, true);
      
              // Use connected address for uploads
              const uploader = createZoraUploaderForCreator(address);
      
              // Upload video file
              const videoFile = new File([videoBlob], `${post.id}.mp4`, { type: mimeType });
              const videoUpload = await uploader.upload(videoFile);
              console.log('Video uploaded:', videoUpload.url);
      
              // Upload thumbnail image
              const thumbnailFile = new File([thumbnailBlob], `${post.id}-thumbnail.jpg`, { type: 'image/jpeg' });
              const thumbUpload = await uploader.upload(thumbnailFile);
              console.log('Thumbnail uploaded:', thumbUpload.url);
      
              // Create EIP-7572 compliant metadata for video content
              const videoMetadata = {
                name,
                symbol,
                description,
                image: thumbUpload.url, // Thumbnail as the main image
                animation_url: videoUpload.url, // Video file as animation_url
                content: { 
                  mime: mimeType, 
                  uri: videoUpload.url 
                },
                properties: { 
                  category: isStory ? 'story' : 'media',
                  mediaType: 'video',
                  hasAudio: true
                },
              };
      
              console.log('Creating video metadata:', videoMetadata);
      
              // Upload metadata JSON file
              const metadataBlob = new Blob([JSON.stringify(videoMetadata)], { type: 'application/json' });
              const metadataFile = new File([metadataBlob], `metadata-${post.id}.json`, { type: 'application/json' });
              const metadataUpload = await uploader.upload(metadataFile);
              console.log('Metadata uploaded:', metadataUpload.url);
      
              createMetadataParameters = {
                name,
                symbol,
                metadata: { type: 'RAW_URI' as const, uri: metadataUpload.url },
              };
            } else if (isVideo && !post.code) {
              // VIDEO CONTENT (non-reel): Use EIP-7572 standard
              console.log('Processing non-reel video content with EIP-7572 metadata');
              
              const mediaResponse = await fetch(`/api/proxy-media?url=${encodeURIComponent(mediaUrl)}`);
              const mediaBlob = await mediaResponse.blob();
              const mimeType = getMimeType(mediaUrl, true);
              
              // Use connected address for uploads
              const uploader = createZoraUploaderForCreator(address);
              
              // Upload video file
              const videoFile = new File([mediaBlob], `${post.id}.mp4`, { type: mimeType });
              const videoUpload = await uploader.upload(videoFile);
              console.log('Video uploaded:', videoUpload.url);
              
              // Create a placeholder thumbnail for video
              const canvas = document.createElement('canvas');
              canvas.width = 400; canvas.height = 400;
              const ctx = canvas.getContext('2d')!;
              ctx.fillStyle = '#7C65C1'; ctx.fillRect(0, 0, 400, 400);
              ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
              ctx.font = 'bold 24px Arial'; ctx.fillText('Video Content', 200, 180);
              ctx.font = '16px Arial'; ctx.fillText('Instagram Coin', 200, 220);
              
              const placeholderBlob: Blob = await new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/png');
              });
              const thumbnailFile = new File([placeholderBlob], `video-thumbnail-${post.id}.png`, { type: 'image/png' });
              const thumbUpload = await uploader.upload(thumbnailFile);
              console.log('Video thumbnail uploaded:', thumbUpload.url);
              
              // Create EIP-7572 compliant metadata for video content
              const videoMetadata = {
                name,
                symbol,
                description,
                image: thumbUpload.url, // Placeholder thumbnail as main image
                animation_url: videoUpload.url, // Video file as animation_url
                content: { 
                  mime: mimeType, 
                  uri: videoUpload.url 
                },
                properties: { 
                  category: isStory ? 'story' : 'media',
                  mediaType: 'video',
                  hasAudio: true
                },
              };
              
              console.log('Creating video metadata:', videoMetadata);
              
              // Upload metadata JSON file
              const metadataBlob = new Blob([JSON.stringify(videoMetadata)], { type: 'application/json' });
              const metadataFile = new File([metadataBlob], `metadata-${post.id}.json`, { type: 'application/json' });
              const metadataUpload = await uploader.upload(metadataFile);
              console.log('Metadata uploaded:', metadataUpload.url);
              
              createMetadataParameters = {
                name,
                symbol,
                metadata: { type: 'RAW_URI' as const, uri: metadataUpload.url },
              };
            } else {
              // IMAGE CONTENT: Use standard metadata builder
              console.log('Processing image content with standard metadata builder');
              
              const mediaResponse = await fetch(`/api/proxy-media?url=${encodeURIComponent(mediaUrl)}`);
              const mediaBlob = await mediaResponse.blob();
              const mimeType = getMimeType(mediaUrl, false);
              const imageFile = new File([mediaBlob], `${post.id}.jpg`, { type: mimeType });
      
              const metadataBuilder = createMetadataBuilder()
                .withName(name)
                .withSymbol(symbol)
                .withDescription(description);
      
              const result = await metadataBuilder
                .withImage(imageFile)
                .upload(createZoraUploaderForCreator(address));
      
              createMetadataParameters = result.createMetadataParameters;
              console.log('Image metadata created:', createMetadataParameters);
            }
          } else {
            // No media available: Create placeholder image
            console.log('No media available, creating placeholder image');
            
            const canvas = document.createElement('canvas');
            canvas.width = 400; canvas.height = 400;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#7C65C1'; ctx.fillRect(0, 0, 400, 400);
            ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
            ctx.font = 'bold 32px Arial'; ctx.fillText(isStory ? 'Story' : 'Post', 200, 180);
            ctx.font = '16px Arial'; ctx.fillText('Instagram Coin', 200, 220);
      
            const placeholderBlob: Blob = await new Promise((resolve) => {
              canvas.toBlob((b) => resolve(b!), 'image/png');
            });
            const imageFile = new File([placeholderBlob], `placeholder-${post.id}.png`, { type: 'image/png' });
      
            const metadataBuilder = createMetadataBuilder()
              .withName(name)
              .withSymbol(symbol)
              .withDescription(description);
      
            const result = await metadataBuilder
              .withImage(imageFile)
              .upload(createZoraUploaderForCreator(address));
      
            createMetadataParameters = result.createMetadataParameters;
            console.log('Placeholder metadata created:', createMetadataParameters);
          }
      
          // Build coin params using connected wallet
          const params: CreateCoinArgs = {
            ...createMetadataParameters,
            creator: address,
            currency: CreateConstants.ContentCoinCurrencies.ZORA,
            chainId: 8453,
          };
      
          console.log('Creating coin with params:', params);
      
          const res = await createCoin({
            call: params,
            walletClient, // from useWalletClient()
            publicClient, // from usePublicClient()
          });
      
          setCoinResult(res);
          setCoinCreationStatus('success');
          console.log('Coin created successfully:', res);
        } catch (err) {
          console.error('Error creating coin:', err);
          setCoinCreationStatus('error');
        }
      };
      

    // useEffect(() => {
    //     x.set(0);
    // }, [index, x]);

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
    // navigation + swipe
const advance = useCallback(() => {
    x.stop();
    x.set(0);                        // <- reset BEFORE we render the next card
    setIndex(i => Math.min(i + 1, Math.max(0, total - 1)));
    setCoinCreationStatus("idle");
    setCoinResult(null);
  }, [total, x]);
  
  const snapBack = () =>
    animate(x, 0, { type: 'spring', stiffness: 600, damping: 40 });
  
  const flyOutLeft = async () => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 500;
    await animate(x, -width * 1.1, { duration: 0.22 });
    x.set(0);                       // <- important
    advance();
  };
  
  const flyOutRight = async () => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 500;
    const postToCreateCoin = currentPost; // Capture current post before advancing
    
    // Animate card out and advance UI immediately
    await animate(x, width * 1.1, { duration: 0.22 });
    advance();
    
    // Create coin in background without blocking UI
    if (postToCreateCoin) {
      createCoinFromPost(postToCreateCoin).catch(error => {
        console.error('Background coin creation failed:', error);
      });
    }
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
        // Update the current post with edited caption
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


    const headerRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);

    // lock page scroll; only inner feed scrolls
    useLayoutEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    useLayoutEffect(() => {
        const setVars = () => {
          const h = headerRef.current?.offsetHeight ?? 0;
          const t = tabsRef.current?.offsetHeight ?? 0;
          const p = progressRef.current?.offsetHeight ?? 0;
          const b = bottomRef.current?.offsetHeight ?? 0;
          const a = actionsRef.current?.offsetHeight ?? 0;
      
          const px = (n: number) => `${n}px`; // <-- no scaling!
      
          const root = document.documentElement;
          root.style.setProperty('--pc-header',   px(h));
          root.style.setProperty('--pc-tabs',     px(t));
          root.style.setProperty('--pc-progress', px(p));
          root.style.setProperty('--pc-bottom',   px(b));
          root.style.setProperty('--pc-actions',  px(a));
        };
      
        const ro = new ResizeObserver(setVars);
        [headerRef, tabsRef, progressRef, bottomRef, actionsRef].forEach(r => r.current && ro.observe(r.current));
        setVars();
        return () => ro.disconnect();
      }, []);
      
      

    return (
        <div className="h-[100svh] bg-[#e8e9eb]">
    <div className="mx-auto max-w-[420px] h-full px-4 py-4">
      <div
        className="relative h-full rounded-[32px] bg-white ring-1 ring-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
        style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
      >
        {/* inner card that holds everything */}
        <div
          className="bg-white h-full max-w-sm mx-auto relative"
          style={{ ['--pc-lift' as string]: '0px' }}
        >
          {/* Header */}
          <div ref={headerRef} className="flex items-center justify-between p-6 pb-3">
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
                <h1 className="text-black font-outfit text-xl font-medium">Swipe and Coin</h1>
                <p className="text-gray-500 font-outfit text-sm">@{USERNAME}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div ref={tabsRef} className="px-6">
            <div className="inline-flex items-center gap-1 rounded-full bg-[#F3F3F4] p-1 m-1">
              <button
                type="button"
                onClick={() => setTab('post')}
                aria-pressed={tab === 'post'}
                className={`rounded-full px-4 py-1 min-h-5 font-outfit text-[14px] md:text-[15px] transition-all ${
                  tab === 'post' ? 'bg-[#4a4653] text-white shadow-sm' : 'bg-transparent text-[#9b9ba2] hover:text-black'
                }`}
              >
                Post
              </button>

              <button
                type="button"
                onClick={() => setTab('story')}
                aria-pressed={tab === 'story'}
                className={`rounded-full px-4 py-1 min-h-5 font-outfit text-[14px] md:text-[15px] transition-all ${
                  tab === 'story' ? 'bg-[#4a4653] text-white shadow-sm' : 'bg-transparent text-[#9b9ba2] hover:text-black'
                }`}
              >
                Story
              </button>
            </div>
          </div>

          {/* Feed (scrolls inside the card) */}
          <div
            id="pc-feed"
            className="px-6 overflow-y-auto overscroll-contain relative"
            style={{
              height: 'calc(100% - var(--pc-header) - var(--pc-tabs) - var(--pc-progress) - var(--pc-bottom))',
              paddingBottom:
                    'calc(var(--pc-actions, 96px) + var(--pc-lift, 28px) + max(env(safe-area-inset-bottom,0px),12px))',
                  }}
          >
            {loading && (
              <div className="bg-[#F8F8F8] rounded-3xl p-6 mb-6 animate-pulse text-[#666]">
                {tab === 'story' ? 'Loading stories…' : 'Loading posts + reels…'}
              </div>
            )}


<AnimatePresence mode="popLayout" initial={false} presenceAffectsLayout={false}>
  {currentPost && (
    <div className="relative mb-6 pt-10 isolate">{/* room for peeks; no negative margin */}
      {/* depth plate */}
      {queue[index + 2] && (
        <motion.div
          key={`plate-${queue[index + 2].id}`}
          aria-hidden
          className="absolute inset-x-0 top-0 rounded-[24px] bg-white border border-[#ECECED]
                     shadow-[0_8px_20px_rgba(0,0,0,0.05)] pointer-events-none transform-gpu"
          style={{ y: -2, scale: 0.95, opacity: 0.35, zIndex: 2 }}
          initial={false}
        />
      )}

      {/* peek (next card) */}
      {queue[index + 1] && (
        <motion.div
          key={`peek-${queue[index + 1].id}`}
          aria-hidden
          className="absolute inset-x-0 top-0 rounded-[24px] bg-white border border-[#ECECED]
                     overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,0.06)] pointer-events-none transform-gpu"
          style={{ y: -4, scale: 0.97, zIndex: 5, opacity: 0.98 }}
          initial={false}
          transition={{ type: 'spring', stiffness: 520, damping: 38 }}
        >
          <div className="p-4">
            {(() => {
              const nextPost = queue[index + 1];
              const aspect = getAspect(nextPost, tab);
              const imgUrl = nextPost.image ? `/api/proxy-media?url=${encodeURIComponent(nextPost.image)}` : null;
              const vidUrl = nextPost.mediaUrl ? `/api/proxy-media?url=${encodeURIComponent(nextPost.mediaUrl)}` : null;
              return (
                <div
                  className="relative w-full rounded-[18px] overflow-hidden ring-1 ring-[#E9EAEE]"
                  style={{
                    aspectRatio: aspect,
                    maxHeight: (tab === 'story' || nextPost?.code) ? 'clamp(160px, 36vh, 380px)' : 'clamp(120px, 26vh, 280px)',
                    minHeight: (tab === 'story' || nextPost?.code) ? '140px' : '120px',
                  }}
                >
                  {vidUrl ? (
                    <video className="absolute inset-0 w-full h-full object-cover"
                           src={vidUrl} poster={imgUrl ?? undefined}
                           muted playsInline preload="metadata" />
                  ) : imgUrl ? (
                    <img className="absolute inset-0 w-full h-full object-cover"
                         src={imgUrl} alt="" draggable={false} loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-[#9AA0A6] text-xs">loading…</div>
                  )}
                </div>
              );
            })()}
          </div>
        </motion.div>
      )}

      {/* front card (no enter variants, no fly-in) */}
      <motion.div
        key={currentPost.id}
        initial={false}
        animate={{ y: -24, opacity: 1, scale: 1 }}     
        transition={{ type: 'spring', stiffness: 520, damping: 38 }}
        className="relative z-20 rounded-[24px] p-4 bg-white border border-[#ECECED]
                   shadow-[0_12px_28px_rgba(0,0,0,0.06)] transform-gpu"
        drag="x"
        dragElastic={0.18}
        dragMomentum={false}
        style={{ x, rotate }}
        onDragStart={() => setUpProgress(0)}
        onDragEnd={onDragEnd}
        whileTap={{ scale: 0.995 }}
      >
        {/* swipe overlays */}
        <motion.div
          className="absolute inset-0 bg-red-500/20 rounded-[24px] flex items-center justify-start pl-8 pointer-events-none"
          style={{ opacity: leftActionOpacity }}
        >
          <div className="flex items-center gap-2 text-red-600">
            <img src="/Icon/ignoreIcon.svg" alt="Ignore" className="w-8 h-8" />
            <span className="font-outfit font-medium">Ignore</span>
          </div>
        </motion.div>
        <motion.div
          className="absolute inset-0 bg-green-500/20 rounded-[24px] flex items-center justify-end pr-8 pointer-events-none"
          style={{ opacity: rightActionOpacity }}
        >
          <div className="flex items-center gap-2 text-green-600">
            <span className="font-outfit font-medium">Create Coin</span>
            <img src="/Icon/rightArrowIcon.svg" alt="Post" className="w-8 h-8" />
          </div>
        </motion.div>

        {/* pull-up hint */}
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-outfit shadow"
          style={{ opacity: upProgress, background: `rgba(0,0,0,${0.35 + 0.4 * upProgress})`, pointerEvents: 'none' }}
        >
          {upProgress < 1 ? 'Pull up to edit' : 'Release to edit'}
        </motion.div>

        {/* Header */}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor" /></svg>
          </button>
        </div>

        {/* Media (front card) */}
        {(() => {
          const aspect = getAspect(currentPost, tab);
          const imgUrl = currentPost?.image ? `/api/proxy-media?url=${encodeURIComponent(currentPost.image)}` : null;
          const vidUrl = currentPost?.mediaUrl ? `/api/proxy-media?url=${encodeURIComponent(currentPost.mediaUrl)}` : null;
          return (
            <div
              className="rounded-[18px] overflow-hidden mb-4 bg-white ring-1 ring-[#E9EAEE] relative w-full"
              style={{
                aspectRatio: aspect,
                maxHeight: (tab === 'story' || currentPost?.code) ? 'clamp(180px, 42vh, 440px)' : 'clamp(140px, 28vh, 320px)',
                minHeight: (tab === 'story' || currentPost?.code) ? '160px' : '140px',
              }}
            >
              {vidUrl ? (
                <video className="absolute inset-0 w-full h-full object-cover" src={vidUrl} poster={imgUrl ?? undefined} controls muted playsInline />
              ) : imgUrl ? (
                <img className="absolute inset-0 w-full h-full object-cover" src={imgUrl} alt="Instagram media" draggable={false} />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-[#666]">Media unavailable</div>
              )}
            </div>
          );
        })()}

        {!!currentPost.content && (
          <div className="text-black font-outfit text-sm leading-relaxed mb-2 whitespace-pre-wrap">
            {currentPost.content}
          </div>
        )}
      </motion.div>
      
    </div>
  )}
</AnimatePresence>







            {!loading && (!currentPost || index >= total) && (
              <div className="bg-[#F8F8F8] rounded-3xl p-6 mb-6 text-center">
                <div className="font-outfit text-md text-[#333] mb-2">You’re all caught up</div>
                <div className="text-[#666] text-sm">
                  {tab === 'story' ? 'No active stories right now.' : 'Try another Instagram username.'}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions (pinned inside card) */}
          <div
            ref={actionsRef}
            className="absolute left-0 right-0 z-30 bg-white border-t border-[#F0F0F0]"
            style={{ bottom: 'calc(var(--pc-progress) + var(--pc-bottom) + var(--pc-lift, 16px))' }}
          >
            <div className="px-6 py-3 flex items-center justify-between">
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
                disabled={coinCreationStatus === 'pending'}
                className="flex flex-col items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-center relative">
                  {coinCreationStatus === 'pending' ? (
                    <div className="w-12 h-12 border-2 border-gray-300 border-t-[#7C65C1] rounded-full animate-spin" />
                  ) : coinCreationStatus === 'success' ? (
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ) : coinCreationStatus === 'error' ? (
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M6 18L18 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  ) : (
                    <img src="/Icon/rightArrowIcon.svg" alt="Cast" className="w-12 h-12" />
                  )}
                </div>
                <span className="text-[#666] font-outfit text-xs">
                  {coinCreationStatus === 'pending' ? 'Creating...' : coinCreationStatus === 'success' ? 'Created!' : coinCreationStatus === 'error' ? 'Failed' : primaryActionLabel}
                </span>
              </button>
            </div>
          </div>

          {/* Progress (no translate) */}
          <div ref={progressRef} className="text-center py-2 text-[#666] font-outfit text-sm">
            {progressText}
          </div>

          {/* Bottom nav (no translate) */}
          {/* <div ref={bottomRef} className="flex items-center justify-center py-3">
            <Link
              href="/settings"
              className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
              aria-label="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                  stroke="white"
                  strokeWidth="2"
                />
              </svg>
            </Link>
          </div> */}

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
                                            className="w-full bg-black text-white font-outfit text-base py-4 rounded-2xl"
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
        </div>
    </div>
    );
}
