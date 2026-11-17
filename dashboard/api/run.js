// POST   ask the agent to run now ("run"), render a test clip without
//        publishing ("test") or check its setup ("setup"). Owner only.
// DELETE withdraw the request.
//
// The request is picked up by a small scheduled job in the agent's
// repository, which starts the run; that usually takes a few minutes.

import { randomBytes } from "node:crypto";
import { requireOwner } from "./_lib/auth.js";
import { HttpError, json, readBody, route } from "./_lib/http.js";
import { RUN_KINDS, readControl, writeControl } from "./_lib/store.js";

export default route({
  async POST(request) {
    requireOwner(request);
    const { kind } = await readBody(request, 500);
    if (!RUN_KINDS.has(kind)) throw new HttpError(400, "Unknown kind of run.");
    const doc = await readControl();
    doc.request = { id: randomBytes(6).toString("hex"), kind, requested_at: new Date().toISOString() };
    return json(await writeControl(doc));
  },
  async DELETE(request) {
    requireOwner(request);
    const doc = await readControl();
    doc.request = null;
    return json(await writeControl(doc));
  },
});
