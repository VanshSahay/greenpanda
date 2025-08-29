"use client";

import { Suspense } from 'react';
import ConnectInstagram from "../components/welcome/ConnectInstagram";

export default function PickAndCastPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConnectInstagram />
    </Suspense>
  );
}
