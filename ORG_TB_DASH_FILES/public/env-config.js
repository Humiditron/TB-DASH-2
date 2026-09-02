// In development mode, window.__ENV__ is initialized as an empty object.
// In Docker production mode, entrypoint.sh generates this file dynamically from container environment variables.
window.__ENV__ = window.__ENV__ || {};
