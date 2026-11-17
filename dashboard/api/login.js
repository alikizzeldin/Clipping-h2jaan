import { checkLogin, configured, newSession, ownerEmail, sessionCookie } from "./_lib/auth.js";
import { json, readBody, route } from "./_lib/http.js";
import { openGate } from "./_lib/throttle.js";

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

export default route({
  async POST(request) {
    if (!configured()) return json({ error: "Signing in has not been set up on the server yet." }, 503);
    const { email, password } = await readBody(request, 2000);
    const gate = await openGate(request);
    if (gate.blocked) return json({ error: "Too many wrong tries. Wait fifteen minutes and try again." }, 429);
    const ok = typeof email === "string" && typeof password === "string" && email.length <= 200 && password.length <= 200
      && checkLogin(email, password);
    if (!ok) {
      await Promise.all([gate.failed(), pause(700)]); // the pause slows down guessing
      return json({ error: "That email or password is not right." }, 401);
    }
    await gate.passed();
    return json({ ok: true, email: ownerEmail() }, 200, { "set-cookie": sessionCookie(request, newSession()) });
  },
});
