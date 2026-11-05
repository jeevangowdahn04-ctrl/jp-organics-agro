"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Clapperboard, Grid3x3, Loader2, MapPin, Play, Plus, UserCheck, UserPlus, X } from "lucide-react";
import Avatar from "../customer/Avatar";
import FarmerCard from "./FarmerCard";
import CreateModal from "./CreateModal";
import { PostModal } from "./PostInteractions";
import { useLanguage } from "../i18n/LanguageProvider";
import { useCustomer } from "../customer/CustomerProvider";
import { useAdminMode } from "../admin/InlineAdmin";
import { friendAction, getFarmerProfile, listFriends } from "@/app/community/actions";
import { communityError, viewerOf, type CommunityPost, type FarmerProfile, type Relation } from "@/lib/community";

interface ProfileData {
  profile: FarmerProfile;
  relation: Relation;
  requests: FarmerProfile[];
  posts: CommunityPost[];
}

// Instagram ಮಾದರಿಯ ರೈತರ ಪ್ರೊಫೈಲ್: ಫೋಟೋ, ಹೆಸರು, ಊರು, ಫ್ರೆಂಡ್ಸ್, ಪೋಸ್ಟ್/ರೀಲ್ಸ್ ಗ್ರಿಡ್.
// self = ಗ್ರಾಹಕರ ಸ್ವಂತ ಪ್ರೊಫೈಲ್ ಪುಟದೊಳಗೆ (ಹೆಸರು/ಫೋಟೋ ಅಲ್ಲಿ ಮೇಲೆಯೇ ಇರುವುದರಿಂದ ಮತ್ತೆ ತೋರಿಸುವುದಿಲ್ಲ)
export default function ProfileView({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const { t } = useLanguage();
  const { customer, requireLogin } = useCustomer();
  const [isAdmin] = useAdminMode();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"post" | "reel">("post");
  const [open, setOpen] = useState<CommunityPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [friends, setFriends] = useState<FarmerProfile[] | null>(null);
  const [showFriends, setShowFriends] = useState(false);
  const [busy, setBusy] = useState(false);

  const phone = customer?.phone;
  const name = customer?.name;

  const fetchProfile = useCallback(
    () => getFarmerProfile(id, phone && name ? { name, phone } : null) as Promise<Partial<ProfileData> & { error?: string }>,
    [id, phone, name]
  );

  const apply = (res: Partial<ProfileData> & { error?: string }, openFromHash = false) => {
    if (res.error || !res.profile) {
      setError(res.error === "notfound" ? t("community.notFound") : t(communityError(res.error)));
      return;
    }
    setError("");
    const next = res as ProfileData;
    setData(next);
    if (openFromHash) {
      const m = window.location.hash.match(/^#p(\d+)$/);
      const hit = m && next.posts.find((p) => p.id === Number(m[1]));
      if (hit) {
        setTab(hit.kind);
        setOpen(hit);
      }
    }
  };

  useEffect(() => {
    let active = true;
    fetchProfile().then((res) => active && apply(res, true));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfile]);

  const reload = () => fetchProfile().then((res) => apply(res));

  const updatePost = (p: CommunityPost) => {
    setData((d) => (d ? { ...d, posts: d.posts.map((x) => (x.id === p.id ? p : x)) } : d));
    setOpen((o) => (o && o.id === p.id ? p : o));
  };
  const removePost = (postId: number) => {
    setData((d) => (d ? { ...d, posts: d.posts.filter((x) => x.id !== postId) } : d));
    setOpen(null);
  };

  const doFriend = (otherId: string, action: "add" | "accept" | "remove") =>
    requireLogin(async (c) => {
      setBusy(true);
      const res = (await friendAction(viewerOf(c), otherId, action)) as { error?: string; relation?: Relation };
      setBusy(false);
      if (res.error) return setError(t(communityError(res.error)));
      reload();
    }, t("community.loginReason"));

  const openFriends = () => {
    setShowFriends(true);
    setFriends(null);
    listFriends(id).then((res) => setFriends((res as { friends?: FarmerProfile[] }).friends ?? []));
  };

  if (error && !data) return <p className="text-center text-slate-500 py-16">{error}</p>;
  if (!data)
    return (
      <p className="text-center text-emerald-700 py-16">
        <Loader2 className="w-6 h-6 animate-spin inline" />
      </p>
    );

  const { profile, relation, requests, posts } = data;
  const self = relation === "self";
  const shown = posts.filter((p) => p.kind === tab);
  const postCount = posts.filter((p) => p.kind === "post").length;
  const reelCount = posts.length - postCount;

  const stat = (n: number, label: string, onClick?: () => void) => {
    const inner = (
      <>
        <b className="block text-lg leading-tight text-slate-900">{n}</b>
        <span className="text-xs text-slate-600">{label}</span>
      </>
    );
    return onClick ? (
      <button type="button" onClick={onClick} className="text-center hover:opacity-80">
        {inner}
      </button>
    ) : (
      <div className="text-center">{inner}</div>
    );
  };

  const pill = "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50";

  return (
    <section className={embedded ? "bg-white border rounded-2xl overflow-hidden" : "bg-white md:border md:rounded-2xl overflow-hidden"}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-5">
          {!embedded && <Avatar customer={{ name: profile.name, avatar: profile.avatar_url }} className="w-20 h-20 text-3xl flex-none" />}
          <div className="flex-1 grid grid-cols-3 gap-2">
            {stat(postCount, t("community.posts"))}
            {stat(reelCount, t("community.reels"))}
            {stat(profile.friends ?? 0, t("community.friends"), openFriends)}
          </div>
        </div>

        {!embedded && (
          <div>
            <h2 className="font-bold text-lg text-slate-900">{profile.name}</h2>
            {profile.village && (
              <p className="text-sm text-slate-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {profile.village}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          {self ? (
            <button type="button" onClick={() => setCreating(true)} className={`${pill} bg-emerald-600 text-white hover:bg-emerald-700`}>
              <Plus className="w-4 h-4" /> {t("community.create")}
            </button>
          ) : relation === "friends" ? (
            <>
              <span className={`${pill} bg-emerald-50 text-emerald-800 border border-emerald-200`}>
                <UserCheck className="w-4 h-4" /> {t("community.isFriend")}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => window.confirm(`${t("community.unfriend")}?`) && doFriend(profile.id, "remove")}
                className={`${pill} flex-none px-4 border border-slate-300 text-slate-700 hover:bg-slate-50`}
              >
                {t("community.unfriend")}
              </button>
            </>
          ) : relation === "sent" ? (
            <button type="button" disabled={busy} onClick={() => doFriend(profile.id, "remove")} className={`${pill} bg-slate-100 text-slate-700 hover:bg-slate-200`}>
              <Check className="w-4 h-4" /> {t("community.requestSent")} · {t("community.cancelRequest")}
            </button>
          ) : relation === "received" ? (
            <>
              <button type="button" disabled={busy} onClick={() => doFriend(profile.id, "accept")} className={`${pill} bg-emerald-600 text-white hover:bg-emerald-700`}>
                <UserCheck className="w-4 h-4" /> {t("community.accept")}
              </button>
              <button type="button" disabled={busy} onClick={() => doFriend(profile.id, "remove")} className={`${pill} border border-slate-300 text-slate-700`}>
                {t("community.decline")}
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => doFriend(profile.id, "add")} className={`${pill} bg-emerald-600 text-white hover:bg-emerald-700`}>
              <UserPlus className="w-4 h-4" /> {t("community.addFriend")}
            </button>
          )}
        </div>

        {self && requests.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-800">
              {t("community.requests")} ({requests.length})
            </p>
            {requests.map((r) => (
              <FarmerCard
                key={r.id}
                farmer={r}
                right={
                  <div className="flex gap-1.5 flex-none">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => doFriend(r.id, "accept")}
                      className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg"
                    >
                      {t("community.accept")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => doFriend(r.id, "remove")}
                      aria-label={t("community.decline")}
                      className="text-xs font-bold border border-slate-300 px-2 py-1.5 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* ಪೋಸ್ಟ್‌ಗಳು | ರೀಲ್ಸ್ ಟ್ಯಾಬ್‌ಗಳು */}
      <div role="tablist" className="grid grid-cols-2 border-t">
        {(["post", "reel"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-t-2 -mt-px ${
              tab === k ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"
            }`}
          >
            {k === "post" ? <Grid3x3 className="w-4 h-4" /> : <Clapperboard className="w-4 h-4" />}
            {k === "post" ? t("community.posts") : t("community.reels")}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500 space-y-3">
          <p>{tab === "post" ? t("community.noPosts") : t("community.noReels")}</p>
          {self && (
            <button type="button" onClick={() => setCreating(true)} className="font-semibold text-emerald-700 hover:underline">
              + {t("community.create")}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {shown.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(p)}
              aria-label={p.caption || (p.kind === "reel" ? t("community.reels") : t("community.posts"))}
              className={`relative bg-slate-200 overflow-hidden ${p.kind === "reel" ? "aspect-[9/16]" : "aspect-square"}`}
            >
              {p.media_type === "video" ? (
                <>
                  <video src={`${p.media_url}#t=0.5`} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                  <Play className="absolute top-2 right-2 w-5 h-5 text-white fill-white drop-shadow" />
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.media_url} alt="" loading="lazy" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      {open && (
        <PostModal
          post={open}
          canModerate={isAdmin}
          onClose={() => setOpen(null)}
          onChange={updatePost}
          onDeleted={() => removePost(open.id)}
        />
      )}

      {creating && (
        <CreateModal
          initialKind={tab}
          onClose={() => setCreating(false)}
          onCreated={(k) => {
            setCreating(false);
            setTab(k);
            reload();
          }}
        />
      )}

      {showFriends && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end md:items-center justify-center" onClick={() => setShowFriends(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("community.friends")}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-50 w-full md:max-w-md rounded-t-2xl md:rounded-2xl max-h-[75dvh] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white rounded-t-2xl">
              <p className="font-bold">
                {t("community.friends")} · {profile.name}
              </p>
              <button type="button" onClick={() => setShowFriends(false)} aria-label={t("community.close")} className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {friends === null ? (
                <p className="text-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin inline text-emerald-700" />
                </p>
              ) : friends.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-6">{t("community.noFriends")}</p>
              ) : (
                friends.map((f) => <FarmerCard key={f.id} farmer={f} onClick={() => setShowFriends(false)} />)
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
