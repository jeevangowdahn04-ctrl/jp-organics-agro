"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clapperboard, Loader2, Plus, Volume2, VolumeX } from "lucide-react";
import Avatar from "../components/customer/Avatar";
import CreateModal from "../components/community/CreateModal";
import { CommentsSheet, PostActions } from "../components/community/PostInteractions";
import { useLanguage } from "../components/i18n/LanguageProvider";
import { useCustomer } from "../components/customer/CustomerProvider";
import { useAdminMode } from "../components/admin/InlineAdmin";
import { listReels } from "../community/actions";
import { communityError, type CommunityPost } from "@/lib/community";

type ReelsResult = { reels?: CommunityPost[]; done?: boolean; error?: string };

// ಒಂದು ರೀಲ್: ಪರದೆಯಲ್ಲಿ ಕಾಣಿಸಿದಾಗ ತಾನಾಗಿ ಪ್ಲೇ, ಹೊರಗೆ ಹೋದಾಗ ನಿಲ್ಲುತ್ತದೆ
function ReelItem({
  reel,
  muted,
  onToggleMute,
  onVisible,
  onChange,
  onDeleted,
  onOpenComments,
  canModerate,
}: {
  reel: CommunityPost;
  muted: boolean;
  onToggleMute: () => void;
  onVisible: () => void;
  onChange: (p: CommunityPost) => void;
  onDeleted: () => void;
  onOpenComments: () => void;
  canModerate: boolean;
}) {
  const { t } = useLanguage();
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const visibleRef = useRef(onVisible);

  useEffect(() => {
    visibleRef.current = onVisible;
  });

  useEffect(() => {
    const box = boxRef.current;
    const video = videoRef.current;
    if (!box || !video) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
          visibleRef.current();
        } else {
          video.pause();
          video.currentTime = 0;
        }
      },
      { threshold: 0.6 }
    );
    io.observe(box);
    return () => io.disconnect();
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  return (
    <div ref={boxRef} className="h-full w-full snap-start snap-always relative flex items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-[calc((100dvh-3.5rem)*9/16)] md:max-w-[calc(100dvh*9/16)]">
        <video
          ref={videoRef}
          src={reel.media_url}
          loop
          playsInline
          muted={muted}
          preload="metadata"
          onClick={togglePlay}
          className="h-full w-full object-contain"
        />
        {paused && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-white text-3xl">▶</span>
          </span>
        )}

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={t("community.sound")}
          className="absolute top-16 right-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <div className="absolute right-3 bottom-24 md:bottom-10">
          <PostActions
            post={reel}
            vertical
            canModerate={canModerate}
            onChange={onChange}
            onDeleted={onDeleted}
            onOpenComments={onOpenComments}
          />
        </div>

        <div className="absolute left-0 right-16 bottom-0 p-4 pb-6 bg-gradient-to-t from-black/70 to-transparent text-white">
          {reel.author && (
            <Link href={`/farmer/${reel.author.id}`} className="flex items-center gap-2 mb-2 w-fit">
              <Avatar customer={{ name: reel.author.name, avatar: reel.author.avatar_url }} className="w-9 h-9 text-sm ring-2 ring-white" />
              <span className="min-w-0">
                <b className="block text-sm drop-shadow">{reel.author.name}</b>
                {reel.author.village && <span className="block text-xs text-white/80">{reel.author.village}</span>}
              </span>
            </Link>
          )}
          {reel.caption && <p className="text-sm line-clamp-3 whitespace-pre-line drop-shadow">{reel.caption}</p>}
        </div>
      </div>
    </div>
  );
}

// ರೀಲ್ಸ್: ಪೂರ್ಣ ಪರದೆಯ ಲಂಬ (9:16) ವಿಡಿಯೋ ಫೀಡ್, ಮೇಲಕ್ಕೆ ಸ್ವೈಪ್ ಮಾಡಿದಂತೆ ಮುಂದಿನದು
export default function ReelsPage() {
  const { t } = useLanguage();
  const { customer, requireLogin } = useCustomer();
  const [isAdmin] = useAdminMode();
  const [reels, setReels] = useState<CommunityPost[] | null>(null);
  const [done, setDone] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState<CommunityPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [version, setVersion] = useState(0);

  const phone = customer?.phone;
  const viewer = phone ? { name: customer?.name ?? "", phone } : null;

  useEffect(() => {
    let active = true;
    const m = window.location.hash.match(/^#r(\d+)$/);
    listReels(phone ? { name: "", phone } : null, { startId: m ? Number(m[1]) : undefined }).then((res) => {
      if (!active) return;
      const r = res as ReelsResult;
      setError(r.error ? t(communityError(r.error)) : "");
      setReels(r.reels ?? []);
      setDone(!!r.done);
    });
    return () => {
      active = false;
    };
  }, [phone, t, version]);

  const loadMore = async () => {
    if (done || loadingMore || !reels?.length) return;
    setLoadingMore(true);
    const res = (await listReels(viewer, { before: Math.min(...reels.map((r) => r.id)) })) as ReelsResult;
    setLoadingMore(false);
    if (res.reels) {
      setReels((cur) => {
        const seen = new Set((cur ?? []).map((r) => r.id));
        return [...(cur ?? []), ...res.reels!.filter((r) => !seen.has(r.id))];
      });
      setDone(!!res.done);
    }
  };

  const update = (p: CommunityPost) => {
    setReels((cur) => cur?.map((r) => (r.id === p.id ? p : r)) ?? cur);
    setCommentsFor((c) => (c && c.id === p.id ? p : c));
  };
  const remove = (id: number) => setReels((cur) => cur?.filter((r) => r.id !== id) ?? cur);

  const create = () => requireLogin(() => setCreating(true), t("community.loginReason"));

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0 bg-black text-white">
      <header className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <ArrowLeft className="w-5 h-5" /> {t("nav.reels")}
        </Link>
        <button
          type="button"
          onClick={create}
          aria-label={t("community.create")}
          className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> {t("community.create")}
        </button>
      </header>

      {reels === null ? (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : reels.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
          <Clapperboard className="w-14 h-14 text-white/60" />
          <p className="text-white/80">{error || t("community.reelsEmpty")}</p>
          <button type="button" onClick={create} className="bg-emerald-600 hover:bg-emerald-700 font-bold px-5 py-2.5 rounded-full flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("community.create")}
          </button>
        </div>
      ) : (
        <div className="h-full overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {reels.map((r, i) => (
            <ReelItem
              key={r.id}
              reel={r}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onVisible={() => {
                if (i >= reels.length - 2) loadMore();
              }}
              onChange={update}
              onDeleted={() => remove(r.id)}
              onOpenComments={() => setCommentsFor(r)}
              canModerate={isAdmin}
            />
          ))}
          {loadingMore && (
            <div className="h-16 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>
      )}

      {commentsFor && (
        <CommentsSheet
          post={commentsFor}
          canModerate={isAdmin}
          onClose={() => setCommentsFor(null)}
          onCountChange={(n) => update({ ...commentsFor, comments: n })}
        />
      )}

      {creating && (
        <CreateModal
          initialKind="reel"
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setReels(null);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
