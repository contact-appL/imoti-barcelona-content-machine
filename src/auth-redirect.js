(() => {
  const redirectUrl = "https://contact-appl.github.io/imoti-barcelona-content-machine/";
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";

    if (url.includes("/auth/v1/signup") && init.body) {
      try {
        const body = JSON.parse(init.body);
        if (!body.redirect_to) {
          body.redirect_to = redirectUrl;
          init = { ...init, body: JSON.stringify(body) };
        }
      } catch (_) {
        // Leave non-JSON requests untouched.
      }
    }

    return originalFetch(input, init);
  };
})();
