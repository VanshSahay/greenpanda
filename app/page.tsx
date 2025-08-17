"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import { Home } from "./components/DemoComponents";
import { Features } from "./components/DemoComponents";
import Onboarding from "./components/welcome/Onboarding";

export default function App() {

  return (
    <div>
      <Onboarding />
    </div>
  );
}
