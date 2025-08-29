"use client";

import { Suspense } from 'react';
import PickAndCastOnboarding from "../components/welcome/PickAndCastOnboarding";

export default function PickAndCastPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PickAndCastOnboarding />
    </Suspense>
  );
}
