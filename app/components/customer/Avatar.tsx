"use client";

import React from "react";
import type { Customer } from "./CustomerProvider";

// ಗ್ರಾಹಕರ ಪ್ರೊಫೈಲ್ ಫೋಟೋ; ಫೋಟೋ ಇಲ್ಲದಿದ್ದರೆ ಹೆಸರಿನ ಮೊದಲಕ್ಷರ
export default function Avatar({ customer, className = "" }: { customer: Pick<Customer, "name" | "avatar">; className?: string }) {
  if (customer.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={customer.avatar} alt={customer.name} className={`rounded-full object-cover ${className}`} />
    );
  }
  return (
    <span className={`rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center ${className}`}>
      {customer.name.charAt(0).toUpperCase()}
    </span>
  );
}
