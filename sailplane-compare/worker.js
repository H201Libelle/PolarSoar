export default {
  async fetch(request, env) {
    if (!isAuthorized(request, env)) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="SPADE"',
          'Content-Type': 'text/plain',
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};

function isAuthorized(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Basic ')) return false;
  try {
    const decoded = atob(auth.slice(6));
    const colon = decoded.indexOf(':');
    if (colon === -1) return false;
    const username = decoded.slice(0, colon);
    const password = decoded.slice(colon + 1);
    return username === env.AUTH_USERNAME && password === env.AUTH_PASSWORD;
  } catch {
    return false;
  }
}
