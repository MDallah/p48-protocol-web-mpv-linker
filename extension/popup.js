document.addEventListener("DOMContentLoaded", () => {
  // Tab Elements
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  // Generator Tab Elements
  const urlInput = document.getElementById("videoUrlInput");
  const generateButton = document.getElementById("generateButton");
  const outputContainer = document.getElementById("outputLinkContainer");
  const errorContainer = document.getElementById("errorMessage");

  // Settings Tab Elements
  const qualitySelect = document.getElementById("qualitySelect");
  const statusMessageContainer = document.getElementById("statusMessage");

  let statusTimeout; // To clear previous status messages

  // --- Tab Switching Logic ---
  function activateTab(tabId) {
    tabContents.forEach((content) => {
      content.classList.remove("active");
      // *** FIX: Use backticks for template literal or simple concatenation ***
      if (content.id === `${tabId}Content`) {
        // Corrected line
        // Alternatively: if (content.id === tabId + 'Content') {
        content.classList.add("active");
      }
    }); // <-- Added missing closing parenthesis for forEach

    tabButtons.forEach((button) => {
      button.classList.remove("active");
      if (button.dataset.tab === tabId) {
        button.classList.add("active");
      }
    });

    // Focus the main input when switching back to the generator tab
    if (tabId === "generator" && urlInput) {
      // Use a slight delay to ensure the element is visible and focusable
      setTimeout(() => urlInput.focus(), 0);
    }
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tab);
    });
  });

  // --- Status Message Logic ---
  function showStatusMessage(message, type = "success", duration = 2500) {
    clearTimeout(statusTimeout);
    statusMessageContainer.textContent = message;
    // Add the type class ('error' or 'success')
    statusMessageContainer.classList.add(type);
    // Ensure only one type class exists if called rapidly
    if (type === "success") statusMessageContainer.classList.remove("error");
    if (type === "error") statusMessageContainer.classList.remove("success");

    statusTimeout = setTimeout(() => {
      statusMessageContainer.textContent = "";
      // Remove the type class when clearing
      statusMessageContainer.classList.remove("success", "error");
    }, duration);
  }

  // --- Settings Tab Logic ---
  function saveQualityPreference() {
    const selectedQuality = qualitySelect.value;
    chrome.storage.local.set({ p48Quality: selectedQuality }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "P48 Linker Popup: Error saving quality:",
          chrome.runtime.lastError.message
        );
        showStatusMessage("Error saving quality.", "error");
      } else {
        console.log(
          "P48 Linker Popup: Quality preference auto-saved:",
          selectedQuality
        );
        showStatusMessage("Quality preference saved!", "success");
      }
    });
  }

  // Load saved quality preference or set default
  chrome.storage.local.get(["p48Quality"], (result) => {
    if (result.p48Quality) {
      qualitySelect.value = result.p48Quality;
    } else {
      qualitySelect.value = "best"; // Default to best
      // Optionally save the default if it wasn't present
      // saveQualityPreference();
    }
  });

  // Save quality automatically when the selection changes
  qualitySelect.addEventListener("change", saveQualityPreference);

  // --- Generator Tab Logic ---
  function generateAndOpenLink() {
    const rawUrl = urlInput.value.trim();
    // Get the currently saved quality preference for generation
    chrome.storage.local.get(["p48Quality"], (result) => {
      const selectedQuality = result.p48Quality || "1080p"; // Use saved or default

      // Clear previous results in the Generator tab
      outputContainer.innerHTML = "";
      errorContainer.textContent = "";

      if (!rawUrl) {
        errorContainer.textContent = "Please enter a Video URL.";
        return;
      }

      try {
        const url = new URL(rawUrl);
        let videoId = null;
        let cleanUrl = rawUrl;

        // --- YouTube URL Parsing (same as before) ---
        if (url.hostname.includes("youtu")) {
          if (url.hostname === "youtu.be") {
            videoId = url.pathname.substring(1).split("?")[0];
            if (videoId)
              cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
          } else if (url.hostname.includes("youtube.com")) {
            if (url.pathname === "/watch") {
              videoId = url.searchParams.get("v");
              if (videoId)
                cleanUrl = `${url.origin}${url.pathname}?v=${videoId}`;
            } else if (url.pathname.startsWith("/shorts/")) {
              videoId = url.pathname.split("/shorts/")[1].split("?")[0];
              if (videoId)
                cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
            }
          }
          // Stricter check: only proceed if videoId was found for youtube domains
          if (!videoId && url.hostname.includes("youtu")) {
            errorContainer.textContent =
              "Invalid or unsupported YouTube URL format. Use watch?v=... or youtu.be/...";
            return;
          }
        } else if (!(url.protocol === "http:" || url.protocol === "https:")) {
          // Allow any http/https URL, reject others
          errorContainer.textContent =
            "Invalid or unsupported URL format (must be http/https).";
          return;
        }
        // --- End YouTube URL Parsing ---

        let urlForP48 = cleanUrl;
        // Append quality parameter if not 'best'
        if (selectedQuality && selectedQuality !== "best") {
          const tempUrlObj = new URL(urlForP48);
          // Ensure we don't add duplicate 'q' params, remove existing if present
          if (tempUrlObj.searchParams.has("q")) {
            tempUrlObj.searchParams.delete("q");
          }
          tempUrlObj.searchParams.set("q", selectedQuality);
          urlForP48 = tempUrlObj.toString();
        }

        const p48Href = `p48://${urlForP48}`; // Ensure lowercase protocol

        const linkElement = document.createElement("a");
        linkElement.href = p48Href;
        // Shorten displayed link if too long
        const displayHref =
          p48Href.length > 60 ? p48Href.substring(0, 57) + "..." : p48Href;
        linkElement.textContent = `Click to open: ${displayHref}`;
        linkElement.title = `Open in P48 Handler\nURL: ${urlForP48}\nQuality: ${selectedQuality}`;
        outputContainer.appendChild(linkElement);

        console.log("P48 Linker Popup: Attempting to open ", p48Href);

        // Try opening the link
        try {
          // Using chrome.tabs.create is generally safer for protocol handlers
          // from an extension popup than window.open
          chrome.tabs.create({ url: p48Href, active: false }); // Opens in background
          // Optionally close the popup after successful generation/opening
          // setTimeout(() => window.close(), 200);
        } catch (openError) {
          console.error("P48 Linker Popup: Error opening P48 link:", openError);
          errorContainer.textContent =
            "Could not automatically open the P48 link. Please click the generated link manually.";
          // Ensure the link is still visible for manual clicking
          if (!outputContainer.contains(linkElement)) {
            outputContainer.appendChild(linkElement);
          }
        }
      } catch (e) {
        console.error("P48 Linker Popup Error:", e);
        if (
          e instanceof TypeError &&
          (e.message.includes("Invalid URL") ||
            e.message.includes("Failed to construct 'URL'"))
        ) {
          errorContainer.textContent = "The entered text is not a valid URL.";
        } else {
          errorContainer.textContent = "An error occurred processing the URL.";
        }
      }
    }); // End chrome.storage.local.get callback
  }

  // Add event listeners for the Generator tab
  generateButton.addEventListener("click", generateAndOpenLink);

  urlInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent potential form submission
      generateAndOpenLink();
    }
  });

  // Select text on focus (optional, but user-friendly)
  urlInput.addEventListener("focus", () => {
    // Use a timeout to ensure the focus event completes before selecting
    setTimeout(() => urlInput.select(), 0);
  });

  // Initialize the default tab state (Generator)
  activateTab("generator");
});
