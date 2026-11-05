"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { isAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { IMAGE_TYPES, MEDIA_BUCKET, VIDEO_TYPES, isOurStorageUrl, storagePathFromUrl } from "@/lib/media";

// ರೈತರ ಸಮುದಾಯ (ಪ್ರೊಫೈಲ್, ಪೋಸ್ಟ್, ರೀಲ್ಸ್, ಫ್ರೆಂಡ್ಸ್, ಲೈಕ್, ಕಾಮೆಂಟ್).
// ಗುರುತು = ಗ್ರಾಹಕ ಲಾಗಿನ್‌ನ ಮೊಬೈಲ್ ನಂಬರ್ (OTP ಇಲ್ಲ; ಮಾಲೀಕರ ಆಯ್ಕೆ). ನಂಬರ್ ಯಾವ ಉತ್ತರದಲ್ಲೂ ಹೊರಗೆ ಹೋಗುವುದಿಲ್ಲ.

const PHONE = /^[6-9]\d{9}$/;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_AVATAR_CHARS = 400_000;
const COMMUNITY_PREFIX = "community/";
const PROFILE_FIELDS = "id,name,village,avatar_url";
const REPORTS_TO_HIDE = 3;

const text = (v, max) => (typeof v === "string" ? v.trim().replace(/[ \t]+\n/g, "\n").slice(0, max) : "");
const tableMissing = (error) => error && (error.code === "42P01" || error.code === "PGRST205");

const recent = new Map();
async function rateLimited(kind, limit, windowMs) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const key = `${kind}:${ip}`;
  const now = Date.now();
  const hits = (recent.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) return true;
  hits.push(now);
  recent.set(key, hits);
  return false;
}
const HOUR = 60 * 60 * 1000;

function db() {
  return getSupabaseAdmin();
}

// ಗ್ರಾಹಕರ ಪ್ರೊಫೈಲ್ ಸಾಲು (ಇಲ್ಲದಿದ್ದರೆ ಹೊಸದು). viewer = { name, phone }
async function ensureProfile(sb, viewer) {
  const phone = typeof viewer?.phone === "string" ? viewer.phone.trim() : "";
  const name = text(viewer?.name, 60);
  if (!PHONE.test(phone) || name.length < 2) return { error: "login" };
  const { data: existing, error } = await sb.from("community_profiles").select("id,name").eq("phone", phone).maybeSingle();
  if (error) return { error: tableMissing(error) ? "table" : "server" };
  if (existing) return { id: existing.id };
  const { data: created, error: insErr } = await sb.from("community_profiles").insert([{ phone, name }]).select("id").single();
  if (insErr) {
    // ಎರಡು ವಿನಂತಿಗಳು ಒಟ್ಟಿಗೆ ಬಂದರೆ (unique) ಮತ್ತೆ ಓದುವುದು
    const { data: again } = await sb.from("community_profiles").select("id").eq("phone", phone).maybeSingle();
    return again ? { id: again.id } : { error: "server" };
  }
  return { id: created.id };
}

async function withViewer(viewer) {
  const sb = db();
  if (!sb) return { error: "server" };
  const me = await ensureProfile(sb, viewer);
  if (me.error) return { error: me.error };
  return { sb, meId: me.id };
}

async function friendCounts(sb, ids) {
  const counts = Object.fromEntries(ids.map((id) => [id, 0]));
  if (!ids.length) return counts;
  const list = ids.join(",");
  const { data } = await sb
    .from("friendships")
    .select("requester_id,addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.in.(${list}),addressee_id.in.(${list})`);
  for (const f of data || []) {
    if (f.requester_id in counts) counts[f.requester_id]++;
    if (f.addressee_id in counts) counts[f.addressee_id]++;
  }
  return counts;
}

// ಪೋಸ್ಟ್‌ಗಳಿಗೆ ಲೇಖಕ, ಲೈಕ್/ಕಾಮೆಂಟ್ ಸಂಖ್ಯೆ ಮತ್ತು "ನಾನು ಲೈಕ್ ಮಾಡಿದ್ದೇನೆಯೇ" ಸೇರಿಸುವುದು
async function decoratePosts(sb, rows, meId) {
  if (!rows?.length) return [];
  const ids = rows.map((r) => r.id);
  let liked = new Set();
  if (meId) {
    const { data } = await sb.from("post_likes").select("post_id").eq("profile_id", meId).in("post_id", ids);
    liked = new Set((data || []).map((l) => l.post_id));
  }
  return rows.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    kind: r.kind,
    media_url: r.media_url,
    media_type: r.media_type,
    caption: r.caption,
    author: r.author,
    likes: r.post_likes?.[0]?.count ?? 0,
    comments: r.post_comments?.[0]?.count ?? 0,
    liked: liked.has(r.id),
    mine: !!meId && r.author?.id === meId,
  }));
}
const POST_SELECT = `id,created_at,kind,media_url,media_type,caption,author:community_profiles!community_posts_profile_id_fkey(${PROFILE_FIELDS}),post_likes(count),post_comments(count)`;

async function optionalViewerId(sb, viewer) {
  if (!viewer?.phone || !PHONE.test(viewer.phone)) return null;
  const { data } = await sb.from("community_profiles").select("id").eq("phone", viewer.phone).maybeSingle();
  return data?.id ?? null;
}

// ---------- ಪ್ರೊಫೈಲ್ ----------

// ಲಾಗಿನ್ ಆದ ಗ್ರಾಹಕರ ಹೆಸರು/ಊರು/ಫೋಟೋವನ್ನು ಸಮುದಾಯ ಪ್ರೊಫೈಲ್‌ಗೆ ಹೊಂದಿಸುವುದು
export async function syncProfile({ name, phone, village, avatar }) {
  const sb = db();
  if (!sb) return { error: "server" };
  const me = await ensureProfile(sb, { name, phone });
  if (me.error) return { error: me.error };

  const { data: row } = await sb.from("community_profiles").select("avatar_url,avatar_hash").eq("id", me.id).single();
  const update = { name: text(name, 60), village: text(village, 80) || null };

  const hasAvatar = typeof avatar === "string" && avatar.startsWith("data:image/jpeg;base64,") && avatar.length < MAX_AVATAR_CHARS;
  const hash = hasAvatar ? createHash("sha256").update(avatar).digest("hex").slice(0, 16) : null;
  if (hash !== (row?.avatar_hash ?? null)) {
    const oldPath = storagePathFromUrl(row?.avatar_url);
    if (hasAvatar) {
      const path = `${COMMUNITY_PREFIX}avatars/${me.id}-${hash}.jpg`;
      const bytes = Buffer.from(avatar.split(",")[1], "base64");
      const { error: upErr } = await sb.storage.from(MEDIA_BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (!upErr) {
        update.avatar_url = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
        update.avatar_hash = hash;
      }
    } else {
      update.avatar_url = null;
      update.avatar_hash = null;
    }
    if (oldPath?.startsWith(`${COMMUNITY_PREFIX}avatars/`) && "avatar_hash" in update) {
      await sb.storage.from(MEDIA_BUCKET).remove([oldPath]);
    }
  }
  await sb.from("community_profiles").update(update).eq("id", me.id);
  return { id: me.id };
}

export async function searchFarmers(query) {
  const sb = db();
  if (!sb) return { error: "server" };
  const q = typeof query === "string" ? query.trim() : "";
  let req = sb.from("community_profiles").select(PROFILE_FIELDS).limit(30);
  if (!q) {
    req = req.order("created_at", { ascending: false });
  } else if (/^\+?\d[\d\s-]*$/.test(q)) {
    // ಮೊಬೈಲ್ ನಂಬರ್: ಪೂರ್ಣ 10 ಅಂಕಿ ಹೊಂದಿದರೆ ಮಾತ್ರ
    const digits = q.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (!PHONE.test(digits)) return { farmers: [], needFullNumber: true };
    req = req.eq("phone", digits);
  } else {
    const safe = q.replace(/[,()*%_\\:."']/g, " ").trim().slice(0, 40);
    if (!safe) return { farmers: [] };
    req = req.or(`name.ilike.*${safe}*,village.ilike.*${safe}*`).order("name");
  }
  const { data, error } = await req;
  if (error) return { error: tableMissing(error) ? "table" : "server" };
  const counts = await friendCounts(sb, data.map((p) => p.id));
  return { farmers: data.map((p) => ({ ...p, friends: counts[p.id] ?? 0 })) };
}

export async function getFarmerProfile(id, viewer) {
  const sb = db();
  if (!sb) return { error: "server" };
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return { error: "notfound" };
  const { data: profile, error } = await sb.from("community_profiles").select(PROFILE_FIELDS).eq("id", id).maybeSingle();
  if (error) return { error: tableMissing(error) ? "table" : "server" };
  if (!profile) return { error: "notfound" };

  const meId = await optionalViewerId(sb, viewer);
  const [{ data: rows, error: postsError }, counts, relationRow] = await Promise.all([
    sb.from("community_posts").select(POST_SELECT).eq("profile_id", id).eq("hidden", false).order("created_at", { ascending: false }).limit(120),
    friendCounts(sb, [id]),
    meId && meId !== id
      ? sb
          .from("friendships")
          .select("requester_id,status")
          .or(`and(requester_id.eq.${meId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${meId})`)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (postsError) console.error("getFarmerProfile posts:", postsError.message);

  let relation = "none";
  if (meId === id) relation = "self";
  else if (relationRow?.data) {
    const f = relationRow.data;
    relation = f.status === "accepted" ? "friends" : f.requester_id === meId ? "sent" : "received";
  }

  let requests = [];
  if (relation === "self") {
    const { data } = await sb
      .from("friendships")
      .select(`created_at,requester:community_profiles!friendships_requester_id_fkey(${PROFILE_FIELDS})`)
      .eq("addressee_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    requests = (data || []).map((r) => r.requester).filter(Boolean);
  }

  return {
    profile: { ...profile, friends: counts[id] ?? 0 },
    relation,
    requests,
    posts: await decoratePosts(sb, rows, meId),
  };
}

export async function listFriends(id) {
  const sb = db();
  if (!sb) return { error: "server" };
  const { data, error } = await sb
    .from("friendships")
    .select(
      `requester:community_profiles!friendships_requester_id_fkey(${PROFILE_FIELDS}),addressee:community_profiles!friendships_addressee_id_fkey(${PROFILE_FIELDS})`
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${id},addressee_id.eq.${id}`);
  if (error) return { error: "server" };
  return { friends: (data || []).map((f) => (f.requester?.id === id ? f.addressee : f.requester)).filter(Boolean) };
}

// ---------- ಫ್ರೆಂಡ್ಸ್ ----------

// action: "add" | "accept" | "remove" (ವಿನಂತಿ ರದ್ದು / ನಿರಾಕರಣೆ / ಅನ್‌ಫ್ರೆಂಡ್)
export async function friendAction(viewer, otherId, action) {
  const ctx = await withViewer(viewer);
  if (ctx.error) return ctx;
  const { sb, meId } = ctx;
  if (typeof otherId !== "string" || otherId === meId) return { error: "invalid" };

  const pair = `and(requester_id.eq.${meId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${meId})`;
  const { data: existing } = await sb.from("friendships").select("requester_id,status").or(pair).maybeSingle();

  if (action === "add") {
    if (await rateLimited("friend", 60, HOUR)) return { error: "rate" };
    if (existing) {
      // ಅವರು ಈಗಾಗಲೇ ವಿನಂತಿ ಕಳುಹಿಸಿದ್ದರೆ, ಇದು ಒಪ್ಪಿಗೆ
      if (existing.status === "pending" && existing.requester_id === otherId) {
        await sb.from("friendships").update({ status: "accepted" }).eq("requester_id", otherId).eq("addressee_id", meId);
        return { relation: "friends" };
      }
      return { relation: existing.status === "accepted" ? "friends" : "sent" };
    }
    const { error } = await sb.from("friendships").insert([{ requester_id: meId, addressee_id: otherId }]);
    return error ? { error: "server" } : { relation: "sent" };
  }
  if (action === "accept") {
    if (!existing || existing.requester_id !== otherId) return { error: "invalid" };
    await sb.from("friendships").update({ status: "accepted" }).eq("requester_id", otherId).eq("addressee_id", meId);
    return { relation: "friends" };
  }
  if (action === "remove") {
    await sb.from("friendships").delete().or(pair);
    return { relation: "none" };
  }
  return { error: "invalid" };
}

// ---------- ಪೋಸ್ಟ್ / ರೀಲ್ಸ್ ----------

export async function createCommunityUploadUrl(viewer, { kind, contentType, size }) {
  const ctx = await withViewer(viewer);
  if (ctx.error) return ctx;
  const mediaType = kind === "post" ? "image" : kind === "reel" ? "video" : null;
  const allowed = mediaType === "image" ? IMAGE_TYPES : VIDEO_TYPES;
  if (!mediaType || !allowed.includes(contentType)) return { error: "type" };
  const max = mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (!Number.isFinite(size) || size <= 0 || size > max) return { error: "size" };
  if (await rateLimited("cupload", 20, HOUR)) return { error: "rate" };

  const ext = contentType.split("/")[1].replace("quicktime", "mov").replace("jpeg", "jpg");
  const path = `${COMMUNITY_PREFIX}${ctx.meId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await ctx.sb.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error) return { error: "server" };
  return { path, token: data.token, publicUrl: ctx.sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function createPost(viewer, { kind, mediaUrl, caption }) {
  const ctx = await withViewer(viewer);
  if (ctx.error) return ctx;
  if (kind !== "post" && kind !== "reel") return { error: "invalid" };
  const path = storagePathFromUrl(mediaUrl);
  if (!isOurStorageUrl(mediaUrl) || !path?.startsWith(`${COMMUNITY_PREFIX}${ctx.meId}/`)) return { error: "media" };
  if (await rateLimited("post", 15, HOUR)) return { error: "rate" };
  const { data, error } = await ctx.sb
    .from("community_posts")
    .insert([{ profile_id: ctx.meId, kind, media_url: mediaUrl, media_type: kind === "post" ? "image" : "video", caption: text(caption, 500) || null }])
    .select("id")
    .single();
  if (error) return { error: "server" };
  return { id: data.id, profileId: ctx.meId };
}

// ಮಾಲೀಕರು ಅಥವಾ ಅಡ್ಮಿನ್ ಮಾತ್ರ
export async function deletePost(viewer, postId) {
  const sb = db();
  if (!sb) return { error: "server" };
  const { data: post } = await sb.from("community_posts").select("id,profile_id,media_url").eq("id", postId).maybeSingle();
  if (!post) return { ok: true };
  const admin = await isAdmin();
  if (!admin) {
    const meId = await optionalViewerId(sb, viewer);
    if (!meId || meId !== post.profile_id) return { error: "auth" };
  }
  const { error } = await sb.from("community_posts").delete().eq("id", postId);
  if (error) return { error: "server" };
  const path = storagePathFromUrl(post.media_url);
  if (path?.startsWith(COMMUNITY_PREFIX)) await sb.storage.from(MEDIA_BUCKET).remove([path]);
  return { ok: true };
}

// ರೀಲ್ಸ್ ಫೀಡ್ (ಹೊಸದು ಮೊದಲು). startId ಕೊಟ್ಟರೆ ಆ ರೀಲ್ ಮೊದಲಿಗೆ (ಹಂಚಿಕೊಂಡ ಲಿಂಕ್)
export async function listReels(viewer, { before, startId } = {}) {
  const sb = db();
  if (!sb) return { error: "server" };
  const meId = await optionalViewerId(sb, viewer);
  let req = sb.from("community_posts").select(POST_SELECT).eq("kind", "reel").eq("hidden", false).order("id", { ascending: false }).limit(8);
  if (Number.isFinite(before)) req = req.lt("id", before);
  const { data, error } = await req;
  if (error) {
    console.error("listReels:", error.message);
    return { error: tableMissing(error) ? "table" : "server" };
  }
  let rows = data || [];
  if (Number.isFinite(startId) && !before) {
    const { data: first } = await sb.from("community_posts").select(POST_SELECT).eq("id", startId).eq("hidden", false).maybeSingle();
    if (first) rows = [first, ...rows.filter((r) => r.id !== first.id)];
  }
  return { reels: await decoratePosts(sb, rows, meId), done: (data || []).length < 8 };
}

export async function toggleLike(viewer, postId) {
  const ctx = await withViewer(viewer);
  if (ctx.error) return ctx;
  const { sb, meId } = ctx;
  const { data: existing } = await sb.from("post_likes").select("post_id").eq("post_id", postId).eq("profile_id", meId).maybeSingle();
  if (existing) await sb.from("post_likes").delete().eq("post_id", postId).eq("profile_id", meId);
  else {
    if (await rateLimited("like", 300, HOUR)) return { error: "rate" };
    await sb.from("post_likes").insert([{ post_id: postId, profile_id: meId }]);
  }
  const { count } = await sb.from("post_likes").select("post_id", { count: "exact", head: true }).eq("post_id", postId);
  return { liked: !existing, likes: count ?? 0 };
}

export async function listComments(postId, viewer) {
  const sb = db();
  if (!sb) return { error: "server" };
  const meId = await optionalViewerId(sb, viewer);
  const { data, error } = await sb
    .from("post_comments")
    .select(`id,created_at,body,author:community_profiles(${PROFILE_FIELDS})`)
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return { error: "server" };
  return { comments: (data || []).map((c) => ({ ...c, mine: !!meId && c.author?.id === meId })) };
}

export async function addComment(viewer, postId, body) {
  const ctx = await withViewer(viewer);
  if (ctx.error) return ctx;
  const clean = text(body, 500);
  if (!clean) return { error: "empty" };
  if (await rateLimited("comment", 60, HOUR)) return { error: "rate" };
  const { data, error } = await ctx.sb
    .from("post_comments")
    .insert([{ post_id: postId, profile_id: ctx.meId, body: clean }])
    .select(`id,created_at,body,author:community_profiles(${PROFILE_FIELDS})`)
    .single();
  if (error) return { error: "server" };
  return { comment: { ...data, mine: true } };
}

// ಕಾಮೆಂಟ್ ಬರೆದವರು ಅಥವಾ ಅಡ್ಮಿನ್ ಮಾತ್ರ
export async function deleteComment(viewer, commentId) {
  const sb = db();
  if (!sb) return { error: "server" };
  const { data: c } = await sb.from("post_comments").select("profile_id").eq("id", commentId).maybeSingle();
  if (!c) return { ok: true };
  if (!(await isAdmin())) {
    const meId = await optionalViewerId(sb, viewer);
    if (meId !== c.profile_id) return { error: "auth" };
  }
  await sb.from("post_comments").delete().eq("id", commentId);
  return { ok: true };
}

// ರಿಪೋರ್ಟ್: 3 ಬೇರೆ ಬೇರೆ ಜನರು ರಿಪೋರ್ಟ್ ಮಾಡಿದರೆ ತಾನಾಗಿಯೇ ಮರೆಯಾಗುತ್ತದೆ (ಅಡ್ಮಿನ್ ನಂತರ ಅಳಿಸಬಹುದು)
export async function reportPost(viewer, postId) {
  const ctx = await withViewer(viewer);
  if (ctx.error) return ctx;
  if (await rateLimited("report", 30, HOUR)) return { error: "rate" };
  await ctx.sb.from("post_reports").upsert([{ post_id: postId, profile_id: ctx.meId }], { ignoreDuplicates: true });
  const { count } = await ctx.sb.from("post_reports").select("post_id", { count: "exact", head: true }).eq("post_id", postId);
  if ((count ?? 0) >= REPORTS_TO_HIDE) await ctx.sb.from("community_posts").update({ hidden: true }).eq("id", postId);
  return { ok: true };
}
