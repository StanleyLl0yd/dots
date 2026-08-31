import { chooseAiMove } from "./ai";
import type { AiWorkerRequest, AiWorkerResponse } from "./ai-worker-protocol";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<AiWorkerRequest>) => void) | null;
  postMessage: (message: AiWorkerResponse) => void;
};

scope.onmessage = (event) => {
  const { requestId, state, options } = event.data;
  try {
    const move = chooseAiMove(state, options);
    scope.postMessage({ requestId, move });
  } catch {
    scope.postMessage({ requestId, error: "AI computation failed" });
  }
};
