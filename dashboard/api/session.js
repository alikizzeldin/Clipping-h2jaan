import { configured, ownerEmail, signedIn } from "./_lib/auth.js";
import { json, route } from "./_lib/http.js";

export default route({
  async GET(request) {
    const yes = signedIn(request);
    return json({ signedIn: yes, ready: configured(), ...(yes ? { email: ownerEmail() } : {}) });
  },
});
