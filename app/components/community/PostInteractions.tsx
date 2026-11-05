"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, Heart, Loader2, MessageCircle, MoreHorizontal, Send, Share2, Trash2, X } from "lucide-react";
import Avatar from "../customer/Avatar";
import { useLanguage } from "../i18n/LanguageProvider";
import { useCustomer } from "../customer/CustomerProvider";
import { addComment, deleteComment, deletePost, listComments, reportPost, toggleLike } from "@/app/community/actions";
import { communityError, timeAgo, viewerOf, type CommunityPost, type PostComment } from "@/lib/community";

type Result = { error?: string };

// ಸಣ್ಣ ತಾತ್ಕಾಲಿಕ ಸಂದೇಶ
export function useFlash() {
  const [msg, setMsg] = useState("");
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2500);
  };
  const node = msg ? (
    <p role="status" className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[70] bg-slate-900 text-white text-sm px-4 py-2 rounded-full shadow-lg">
      {msg}
    </p>
  ) : null;
  return { flash, node };
}

export function shareUrl(post: CommunityPost) {
  return post.kind === "reel" ? `${window.location.origin}/reels#r${post.id}` : `${window.location.origin}/farmer/${post.author?.id}#p${post.id}`;
}

// ಲೈಕ್ | ಕಾಮೆಂಟ್ | ಹಂಚಿಕೊಳ್ಳಿ | ಇನ್ನಷ್ಟು (ರಿಪೋರ್ಟ್ / ಅಳಿಸಿ)
export function PostActions({
  post,
  onChange,
  onDeleted,
  onOpenComments,
  canModerate = false,
  vertical = false,
}: {
  post: CommunityPost;
  onChange: (p: CommunityPost) => void;
  onDeleted: () => void;
  onOpenComments: () => void;
  canModerate?: boolean;
  vertical?: boolean;
}) {
  const { t } = useLanguage();
  const { requireLogin } = useCustomer();
  const [menu, setMenu] = useState(false);
  const { flash, node } = useFlash();

  const like = () =>
    requireLogin(async (c) => {
      onChange({ ...post, liked: !post.liked, likes: Math.max(0, post.likes + (post.liked ? -1 : 1)) });
      const res = (await toggleLike(viewerOf(c), post.id)) as Result & { liked?: boolean; likes?: number };
      if (res.error) {
        onChange(post);
        flash(t(communityError(res.error)));
      } else onChange({ ...post, liked: !!res.liked, likes: res.likes ?? post.likes });
    }, t("community.loginReason"));

  const share = async () => {
    const url = shareUrl(post);
    try {
      if (navigator.share) {
        await navigator.share({ title: "JP Organics", text: t("community.shareText"), url });
        return;
      }
    } catch {
      return; // ಬಳಕೆದಾರರು ರದ್ದುಮಾಡಿದರು
    }
    try {
      await navigator.clipboard.writeText(url);
      flash(t("community.linkCopied"));
    } catch {
      window.prompt(t("community.share"), url);
    }
  };

  const report = () => {
    setMenu(false);
    requireLogin(async (c) => {
      if (!window.confirm(t("community.confirmReport"))) return;
      const res = (await reportPost(viewerOf(c), post.id)) as Result;
      flash(res.error ? t(communityError(res.error)) : t("community.reported"));
    }, t("community.loginReason"));
  };

  const { customer } = useCustomer();
  const remove = async () => {
    setMenu(false);
    if (!window.confirm(t("community.confirmDelete"))) return;
    const res = (await deletePost(viewerOf(customer), post.id)) as Result;
    if (res.error) flash(t(communityError(res.error)));
    else onDeleted();
  };

  const btn = vertical
    ? "flex flex-col items-center gap-1 text-white text-xs font-semibold drop-shadow"
    : "flex items-center gap-1.5 text-slate-700 text-sm font-semibold hover:text-emerald-700";
  const icon = vertical ? "w-7 h-7" : "w-6 h-6";

  return (
    <div className={`relative ${vertical ? "flex flex-col items-center gap-5" : "flex items-center gap-5"}`}>
      <button type="button" onClick={like} aria-pressed={post.liked} aria-label={t("community.like")} className={btn}>
        <Heart className={`${icon} ${post.liked ? "fill-red-500 text-red-500" : ""}`} />
        <span>{post.likes}</span>
      </button>
      <button type="button" onClick={onOpenComments} aria-label={t("community.comments")} className={btn}>
        <MessageCircle className={icon} />
        <span>{post.comments}</span>
      </button>
      <button type="button" onClick={share} aria-label={t("community.share")} className={btn}>
        <Share2 className={icon} />
        {vertical && <span>{t("community.share")}</span>}
      </button>
      <div className={vertical ? "" : "ml-auto"}>
        <button type="button" onClick={() => setMenu((m) => !m)} aria-label="More" aria-expanded={menu} className={btn}>
          <MoreHorizontal className={icon} />
        </button>
        {menu && (
          <div
            className={`absolute z-20 bg-white text-slate-800 rounded-xl shadow-xl border overflow-hidden min-w-40 ${
              vertical ? "right-12 bottom-0" : "right-0 top-8"
            }`}
          >
            {!post.mine && (
              <button type="button" onClick={report} className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-slate-50">
                <Flag className="w-4 h-4" /> {t("community.report")}
              </button>
            )}
            {(post.mine || canModerate) && (
              <button type="button" onClick={remove} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> {t("community.delete")}
              </button>
            )}
          </div>
        )}
      </div>
      {node}
    </div>
  );
}

// ಕೆಳಗಿನಿಂದ ಬರುವ ಕಾಮೆಂಟ್ ಹಾಳೆ
export function CommentsSheet({
  post,
  onClose,
  onCountChange,
  canModerate = false,
}: {
  post: CommunityPost;
  onClose: () => void;
  onCountChange: (n: number) => void;
  canModerate?: boolean;
}) {
  const { t, lang } = useLanguage();
  const { customer, requireLogin } = useCustomer();
  const [comments, setComments] = useState<(PostComment & { mine?: boolean })[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const phone = customer?.phone;
  useEffect(() => {
    let active = true;
    listComments(post.id, phone ? { name: "", phone } : null).then((res) => {
      if (!active) return;
      const r = res as Result & { comments?: PostComment[] };
      setComments(r.comments ?? []);
    });
    return () => {
      active = false;
    };
  }, [post.id, phone]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    requireLogin(async (c) => {
      setSending(true);
      setError("");
      const res = (await addComment(viewerOf(c), post.id, body)) as Result & { comment?: PostComment };
      setSending(false);
      if (res.error || !res.comment) return setError(t(communityError(res.error)));
      const next = [...(comments ?? []), res.comment];
      setComments(next);
      onCountChange(next.length);
      setBody("");
    }, t("community.loginReason"));
  };

  const remove = async (id: number) => {
    if (!window.confirm(t("community.confirmDelete"))) return;
    const res = (await deleteComment(viewerOf(customer), id)) as Result;
    if (res.error) return setError(t(communityError(res.error)));
    const next = (comments ?? []).filter((c) => c.id !== id);
    setComments(next);
    onCountChange(next.length);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("community.comments")}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[75dvh] flex flex-col text-slate-900"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-bold">{t("community.comments")}</p>
          <button type="button" onClick={onClose} aria-label={t("community.close")} className="p-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {comments === null ? (
            <p className="text-center text-sm text-slate-500 py-6">
              <Loader2 className="w-5 h-5 animate-spin inline" />
            </p>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-6">{t("community.noComments")}</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                {c.author && (
                  <Link href={`/farmer/${c.author.id}`} className="flex-none">
                    <Avatar customer={{ name: c.author.name, avatar: c.author.avatar_url }} className="w-8 h-8 text-xs" />
                  </Link>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <Link href={`/farmer/${c.author?.id}`} className="font-bold mr-1.5 hover:underline">
                      {c.author?.name}
                    </Link>
                    <span className="whitespace-pre-line break-words">{c.body}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                    {timeAgo(c.created_at, lang)}
                    {(c.mine || canModerate) && (
                      <button type="button" onClick={() => remove(c.id)} className="hover:text-red-600">
                        {t("community.delete")}
                      </button>
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        {error && <p className="px-4 text-xs text-red-600">{error}</p>}
        <form onSubmit={send} className="flex items-center gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder={t("community.commentPh")}
            aria-label={t("community.commentPh")}
            className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm outline-none focus:border-emerald-600"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            aria-label={t("community.send")}
            className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ಒಂದು ಪೋಸ್ಟ್/ರೀಲ್ ಅನ್ನು ದೊಡ್ಡದಾಗಿ ನೋಡುವ ವಿಂಡೋ (ಪ್ರೊಫೈಲ್ ಗ್ರಿಡ್‌ನಿಂದ)
export function PostModal({
  post,
  onClose,
  onChange,
  onDeleted,
  canModerate = false,
}: {
  post: CommunityPost;
  onClose: () => void;
  onChange: (p: CommunityPost) => void;
  onDeleted: () => void;
  canModerate?: boolean;
}) {
  const { t, lang } = useLanguage();
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-0 md:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full md:max-w-md h-full md:h-auto md:max-h-[92dvh] md:rounded-2xl overflow-y-auto flex flex-col"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          {post.author && (
            <Link href={`/farmer/${post.author.id}`} onClick={onClose} className="flex items-center gap-2 min-w-0 flex-1">
              <Avatar customer={{ name: post.author.name, avatar: post.author.avatar_url }} className="w-9 h-9 text-sm" />
              <span className="min-w-0">
                <b className="block truncate text-sm">{post.author.name}</b>
                {post.author.village && <span className="block truncate text-xs text-slate-500">{post.author.village}</span>}
              </span>
            </Link>
          )}
          <button type="button" onClick={onClose} aria-label={t("community.close")} className="p-1.5 rounded-full hover:bg-slate-100 flex-none">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-black flex items-center justify-center flex-1 md:flex-none">
          {post.media_type === "video" ? (
            <video src={post.media_url} controls autoPlay playsInline loop className="w-full max-h-[70dvh] object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.media_url} alt={post.caption || post.author?.name || ""} className="w-full max-h-[70dvh] object-contain" />
          )}
        </div>
        <div className="px-4 py-3 space-y-2">
          <PostActions
            post={post}
            onChange={onChange}
            onDeleted={onDeleted}
            onOpenComments={() => setCommentsOpen(true)}
            canModerate={canModerate}
          />
          {post.caption && (
            <p className="text-sm whitespace-pre-line break-words">
              <b className="mr-1.5">{post.author?.name}</b>
              {post.caption}
            </p>
          )}
          <p className="text-[11px] text-slate-400">{timeAgo(post.created_at, lang)}</p>
        </div>
      </div>
      {commentsOpen && (
        <CommentsSheet
          post={post}
          canModerate={canModerate}
          onClose={() => setCommentsOpen(false)}
          onCountChange={(n) => onChange({ ...post, comments: n })}
        />
      )}
    </div>
  );
}
