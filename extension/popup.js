document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("videoUrlInput");
  const generateButton = document.getElementById("generateButton");
  const outputContainer = document.getElementById("outputLinkContainer");
  const errorContainer = document.getElementById("errorMessage");

  function generateAndOpenLink() {
    const rawUrl = urlInput.value.trim();
    outputContainer.innerHTML = ""; // Clear previous output
    errorContainer.innerHTML = ""; // Clear previous error

    if (!rawUrl) {
      errorContainer.textContent = "Please enter a Video URL.";
      return;
    }

    try {
      const url = new URL(rawUrl); // Throws TypeError if invalid URL format
      let videoId = null;
      let cleanUrl = rawUrl; // Default

      // Validation and cleaning
      if (url.hostname.includes("youtu")) {
        if (url.hostname === "youtu.be") {
          videoId = url.pathname.substring(1).split("?")[0]; // Get ID after '/' and before any '?'
          if (videoId) cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        } else if (url.hostname.includes("youtube.com")) {
          if (url.pathname === "/watch") {
            videoId = url.searchParams.get("v");
            if (videoId) cleanUrl = `${url.origin}${url.pathname}?v=${videoId}`;
          } else if (url.pathname.startsWith("/shorts/")) {
            videoId = url.pathname.split("/shorts/")[1].split("?")[0];
            if (videoId)
              cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
          }
        }
        if (!videoId) {
          errorContainer.textContent =
            "Invalid or unsupported YouTube URL format. Use watch?v=... or youtu.be/...";
          return;
        }
      } else if (
        url.hostname.includes("https://") ||
        url.hostname.includes("http://")
      ) {
        cleanUrl = url.hostname;
      } else {
        errorContainer.textContent = "Invalid or unsupported URL format.";
        return;
      }

      const p48Href = `P48://${cleanUrl}`;

      // Display the link
      const linkElement = document.createElement("a");
      linkElement.href = p48Href;
      linkElement.textContent = `Click to open: ${p48Href}`;
      linkElement.title = `Open ${cleanUrl} with P48 handler`;
      // linkElement.target = '_blank'; // Not usually needed/effective for custom protocols
      outputContainer.appendChild(linkElement);

      // Attempt to open the link directly from the popup
      console.log("P48 Linker Popup: Attempting to open ", p48Href);
      window.open(p48Href); // Browser asks OS to handle the P48:// protocol
    } catch (e) {
      console.error("P48 Linker Popup Error:", e);
      if (e instanceof TypeError && e.message.includes("Invalid URL")) {
        errorContainer.textContent = "The entered text is not a valid URL.";
      } else {
        errorContainer.textContent = "An error occurred processing the URL.";
      }
    }
  }

  generateButton.addEventListener("click", generateAndOpenLink);

  // Allow pressing Enter in the input field
  urlInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent default Enter behavior
      generateAndOpenLink();
    }
  });

  // Select text on focus for easy pasting over
  urlInput.addEventListener("focus", () => {
    urlInput.select();
  });
});
