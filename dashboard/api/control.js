// GET  the owner's settings and rules. Open to read: the agent fetches this
//      at the start of every run, and none of it is secret.
// PUT  replace the settings and/or the rules. Owner only.

import { requireOwner } from "./_lib/auth.js";
import { HttpError, json, readBody, route } from "./_lib/http.js";
import { cleanRules, cleanSettings, readControl, writeControl } from "./_lib/store.js";

export default route({
  async GET() {
    return json(await readControl());
  },
  async PUT(request) {
    requireOwner(request);
    const body = await readBody(request);
    if (!("settings" in body) && !("rules" in body)) throw new HttpError(400, "Nothing to save.");
    const doc = await readControl();
    if ("settings" in body) doc.settings = cleanSettings(body.settings);
    if ("rules" in body) doc.rules = cleanRules(body.rules);
    return json(await writeControl(doc));
  },
});
