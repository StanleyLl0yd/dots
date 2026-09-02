import { requestAiMove } from "./core";
import type { AiWorkerRequest, AiWorkerResponse } from "./ai-worker-protocol";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<AiWorkerRequest>) => void) | null;
  postMessage: (message: AiWorkerResponse) => void;
};

scope.onmessage = (event) => {
  const { requestId, state, options } = event.data;
  void requestAiMove(state, options)
    .then((move) => scope.postMessage({ requestId, move }))
    .catch(() => scope.postMessage({ requestId, error: "AI computation failed" }));
};
