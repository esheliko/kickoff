import { createEngine, type EngineInfo, type EngineBackend } from "@app/engine-client";
import { useEffect, useState } from "react";

type State = { status: "loading" } | { status: "ready"; info: EngineInfo; backend: EngineBackend } | { status: "error"; message: string };

export function App() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    createEngine()
      .then(async (engine) => ({ info: await engine.info(), backend: engine.backend }))
      .then((r) => alive && setState({ status: "ready", ...r }))
      .catch((e: unknown) => alive && setState({ status: "error", message: e instanceof Error ? e.message : String(e) }));
    return () => { alive = false; };
  }, []);

  return (
    <div className="shell">
      <header className="bar"><strong>{{NAME}}</strong></header>
      <main className="stage" aria-live="polite">
        <h1>{{NAME}}</h1>
        <p>{{PURPOSE}}</p>
        {state.status === "loading" && <p data-testid="engine">Starting engine…</p>}
        {state.status === "ready" && <p data-testid="engine">Engine {state.info.name} v{state.info.version} ({state.backend})</p>}
        {state.status === "error" && <p role="alert" data-testid="engine-error">Engine failed to start: {state.message}</p>}
      </main>
    </div>
  );
}
