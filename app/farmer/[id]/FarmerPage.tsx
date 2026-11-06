"use client";

import React from "react";
import PageHeader from "../../components/PageHeader";
import ProfileView from "../../components/community/ProfileView";
import { useLanguage } from "../../components/i18n/LanguageProvider";

export default function FarmerPage({ id }: { id: string }) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <PageHeader title={t("community.title")} />
      <main className="max-w-3xl mx-auto md:px-4 md:py-5">
        <ProfileView id={id} />
      </main>
    </div>
  );
}
