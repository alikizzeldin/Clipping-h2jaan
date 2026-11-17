import { sessionCookie } from "./_lib/auth.js";
import { json, route } from "./_lib/http.js";

export default route({
  async POST(request) {
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(request, "") });
  },
});
