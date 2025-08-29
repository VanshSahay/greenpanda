"use client";

import { Suspense } from 'react';
import ConnectWallet from "../components/welcome/ConnectWallet";

export default function PickAndCastPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConnectWallet />
    </Suspense>
  );
}
