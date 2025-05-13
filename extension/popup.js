document.addEventListener("DOMContentLoaded", () => {
  // Tab Elements
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  // Generator Tab Elements
  const urlInput = document.getElementById("videoUrlInput");
  const generateLinkButton = document.getElementById("generateLinkButton");
  const outputContainer = document.getElementById("outputLinkContainer"); // Kept for potential future use or verbose display
  const errorContainer = document.getElementById("errorMessage");

  // Settings Tab Elements
  const qualitySelect = document.getElementById("qualitySelect");
  const statusMessageContainer = document.getElementById("statusMessage");

  let settingsStatusTimeout; // Renamed to avoid conflict if another timeout is used elsewhere

  // --- Tab Switching Logic ---
  function activateTab(tabId) {
    tabContents.forEach((content) => {
      content.classList.remove("active");
      if (content.id === `${tabId}Content`) {
        content.classList.add("active");
      }
    });
    tabButtons.forEach((button) => {
      button.classList.remove("active");
      if (button.dataset.tab === tabId) {
        button.classList.add("active");
      }
    });
    if (tabId === "generator" && urlInput) {
      setTimeout(() => urlInput.focus(), 0);
    }
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tab);
    });
  });

  // --- Status Message Logic (for Settings tab) ---
  function showSettingsStatusMessage(message, type = "success", duration = 2500) {
    clearTimeout(settingsStatusTimeout);
    statusMessageContainer.textContent = message;
    // Ensure CSS handles .status-message.success and .status-message.error
    statusMessageContainer.className = 'status-message'; // Reset classes
    statusMessageContainer.classList.add(type);


    settingsStatusTimeout = setTimeout(() => {
      statusMessageContainer.textContent = "";
      statusMessageContainer.classList.remove("success", "error");
    }, duration);
  }

  // --- Settings Tab Logic ---
  function saveQualityPreference() {
    const selectedQuality = qualitySelect.value;
    chrome.storage.local.set({ p48Quality: selectedQuality }, () => {
      if (chrome.runtime.lastError) {
        console.error("P48 Linker Popup: Error saving quality:", chrome.runtime.lastError.message);
        showSettingsStatusMessage("Error saving quality.", "error");
      } else {
        showSettingsStatusMessage("Quality preference saved!", "success");
        updateSubmitLinkHref(); // Update the generator link if quality changes
      }
    });
  }

  // --- Generator Tab Logic: Update Submit Link Href ---
  function updateSubmitLinkHref() {
    const rawUrl = urlInput.value.trim();
    
    chrome.storage.local.get(["p48Quality"], (storageResult) => {
      if (chrome.runtime.lastError) {
        console.error("P48 Linker Popup: Error getting quality for link generation:", chrome.runtime.lastError.message);
        errorContainer.textContent = "Error retrieving quality settings.";
        generateLinkButton.href = "#";
        generateLinkButton.classList.add("disabled");
        return;
      }
      const selectedQuality = storageResult.p48Quality || "1080p"; // Default for generation

      // Clear previous generator-specific messages/outputs
      if (outputContainer) outputContainer.innerHTML = ""; 
      if (errorContainer) errorContainer.textContent = ""; 

      if (!rawUrl) {
        generateLinkButton.href = "#";
        generateLinkButton.classList.add("disabled");
        return;
      }

      let videoId = null;
      let baseVideoUrl = rawUrl; 
      let p48Href;

      try {
        // Step 1: Validate and parse the initial input URL
        const parsedRawUrl = new URL(rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`);

        // Step 2: Process for YouTube specifics to get a 'clean' base video URL
        if (parsedRawUrl.hostname.includes("youtu")) { // Covers youtube.com, youtu.be
          if (parsedRawUrl.hostname === "youtu.be") {
            videoId = parsedRawUrl.pathname.substring(1).split(/[?#&]/)[0];
            if (videoId) baseVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            else throw new Error("Invalid youtu.be URL (no ID found).");
          } else if (parsedRawUrl.hostname.includes("youtube.com")) {
            if (parsedRawUrl.pathname === "/watch") {
              videoId = parsedRawUrl.searchParams.get("v");
              if (videoId) baseVideoUrl = `https://www.youtube.com/watch?v=${videoId}`; // Strips other params
              else throw new Error("Missing 'v' parameter in YouTube watch URL.");
            } else if (parsedRawUrl.pathname.startsWith("/shorts/")) {
              videoId = parsedRawUrl.pathname.split("/shorts/")[1].split(/[?#&]/)[0];
              if (videoId) baseVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
              else throw new Error("Invalid YouTube Shorts URL (no ID found).");
            } else {
                 baseVideoUrl = parsedRawUrl.toString();
                 if (!videoId && !baseVideoUrl.includes("/watch?v=") && !baseVideoUrl.includes("/playlist?list=")) {
                     console.warn("P48 Linker: Potentially non-video/playlist YouTube URL being used as is: ", baseVideoUrl);
                 }
            }
          }
        } else if (parsedRawUrl.protocol === "http:" || parsedRawUrl.protocol === "https:") {
            baseVideoUrl = parsedRawUrl.toString(); // Use the normalized URL from new URL()
        } else {
          throw new Error("URL must be HTTP or HTTPS.");
        }
        
        // Step 3: Create a new URL object from the (potentially cleaned) baseVideoUrl
        let urlForP48Object = new URL(baseVideoUrl);

        // Step 4: Add quality parameter if needed
        if (selectedQuality && selectedQuality !== "best") {
          urlForP48Object.searchParams.set("q", selectedQuality);
        }
        
        // Step 5: Get the final string representation.
        let finalUrlStringForP48 = urlForP48Object.toString();
        
        // Step 6: Construct the p48Href.
        p48Href = `p48://${finalUrlStringForP48}`;

        generateLinkButton.href = p48Href;
        generateLinkButton.classList.remove("disabled");
        if(errorContainer) errorContainer.textContent = ""; // Clear error on success

      } catch (e) {
        console.warn("P48 Linker Popup: Error parsing/constructing URL:", e.message, e);
        let displayError = "Error processing URL.";
        if (e instanceof TypeError && (e.message.includes("Invalid URL") || e.message.includes("Failed to construct 'URL'"))) {
          displayError = "Invalid URL entered.";
        } else if (e.message.includes("Invalid youtu.be URL") || e.message.includes("Missing 'v' parameter") || e.message.includes("Invalid YouTube Shorts URL") || e.message.includes("URL must be HTTP or HTTPS")) {
          displayError = e.message; 
        }
        
        if(errorContainer) errorContainer.textContent = displayError;
        generateLinkButton.href = "#";
        generateLinkButton.classList.add("disabled");
      }
    });
  }

  // --- Event Listeners ---

  urlInput.addEventListener("input", updateSubmitLinkHref);
  qualitySelect.addEventListener("change", saveQualityPreference); 

  if (generateLinkButton) {
    generateLinkButton.addEventListener("click", (event) => {
      if (!generateLinkButton.classList.contains("disabled") && generateLinkButton.href.startsWith("p48://")) {
        setTimeout(() => {
          if (window && !window.closed) {
            window.close();
          }
        }, 100); 
      } else {
        event.preventDefault();
      }
    });
  }

  urlInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); 
      if (generateLinkButton && !generateLinkButton.classList.contains("disabled")) {
        generateLinkButton.click(); 
      }
    }
  });

  urlInput.addEventListener("focus", () => {
    setTimeout(() => {
        if (typeof urlInput.select === 'function') {
            urlInput.select();
        }
    }, 0);
  });

  // --- Initialization ---
  chrome.storage.local.get(["p48Quality"], (result) => {
    if (chrome.runtime.lastError) {
        console.warn("P48 Linker Popup: Error loading quality:", chrome.runtime.lastError.message);
        qualitySelect.value = "best"; 
    } else if (result.p48Quality) {
      qualitySelect.value = result.p48Quality;
    } else {
      qualitySelect.value = "best"; 
    }
    updateSubmitLinkHref(); 
  });

  activateTab("generator");
});