import { checkLogin, configured, newSession, ownerEmail, sessionCookie } from "./_lib/auth.js";
import { json, readBody, route } from "./_lib/http.js";

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

export default route({
  async POST(request) {
    if (!configured()) return json({ error: "Signing in has not been set up on the server yet." }, 503);
    const { email, password } = await readBody(request, 2000);
    const ok = typeof email === "string" && typeof password === "string" && email.length <= 200 && password.length <= 200
      && checkLogin(email, password);
    if (!ok) {
      await pause(700); // slows down guessing
      return json({ error: "That email or password is not right." }, 401);
    }
    return json({ ok: true, email: ownerEmail() }, 200, { "set-cookie": sessionCookie(request, newSession()) });
  },
});
