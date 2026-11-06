"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Users } from "lucide-react";
import Avatar from "../customer/Avatar";
import { useLanguage } from "../i18n/LanguageProvider";
import type { FarmerProfile } from "@/lib/community";

// ಹುಡುಕಾಟ / ಫ್ರೆಂಡ್ಸ್ ಪಟ್ಟಿಯ ರೈತರ ಕಾರ್ಡ್
export default function FarmerCard({ farmer, onClick, right }: { farmer: FarmerProfile; onClick?: () => void; right?: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 min-w-0 bg-white border rounded-2xl px-3 py-2.5">
      <Link href={`/farmer/${farmer.id}`} onClick={onClick} className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar customer={{ name: farmer.name, avatar: farmer.avatar_url }} className="w-12 h-12 text-lg flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-slate-900">{farmer.name}</b>
          {farmer.village && (
            <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
              <MapPin className="w-3 h-3 flex-none" /> <span className="truncate">{farmer.village}</span>
            </span>
          )}
          {typeof farmer.friends === "number" && (
            <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
              <Users className="w-3 h-3" /> {t("community.friendsCount", { n: farmer.friends })}
            </span>
          )}
        </span>
        {!right && <ChevronRight className="w-4 h-4 text-slate-400 flex-none" />}
      </Link>
      {right}
    </div>
  );
}
