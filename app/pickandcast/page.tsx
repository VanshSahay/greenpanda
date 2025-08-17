"use client";

import { Suspense } from 'react';
import PickAndCast from "../components/welcome/PickAndCast";

export default function PickAndCastPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PickAndCast />
    </Suspense>
  );
}
