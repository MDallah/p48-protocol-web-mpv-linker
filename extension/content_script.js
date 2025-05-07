console.log("P48 Linker: Content script loaded.");

const P48_BUTTON_CLASS_OUTER = "p48-linker-button-container";
const P48_LINK_CLASS = "p48-linker-actual-anchor";
const P48_ICON_SVG = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.1339 22.5C15.5188 23.1667 16.4811 23.1667 16.866 22.5L22.9282 12C23.3131 11.3333 22.8319 10.5 22.0621 10.5H9.93777C9.16797 10.5 8.68685 11.3333 9.07175 12L15.1339 22.5Z" fill="#F8312F"/>
</svg>`;

// Configuration for different video item types
const VIDEO_CONFIGS = [
  {
    // VARIANT1 (NormalVideo, GridVideo) & common video renderers for WATCH videos
    // Targets ytd-rich-item-renderer, ytd-video-renderer (for /watch?v= links), ytd-grid-video-renderer
    // The :not selector for ytd-video-renderer ensures this config doesn't attempt to match
    // ytd-video-renderer items that are Shorts, as those are handled by a more specific config.
    itemSelector:
      'ytd-rich-item-renderer, ytd-video-renderer:not(:has(a#video-title[href*="/shorts/"])), ytd-grid-video-renderer',
    urlSelector:
      'a#video-title-link[href*="/watch?v="], ytd-thumbnail[href*="/watch?v="] a, a#video-title[href*="/watch?v="]',
    buttonTargetSelector: "#metadata-line", // Standard metadata line ID
    buttonStyle: { marginTop: "-6px" }, // Style for the <a> tag
  },
  {
    // VARIANT2 (CompactVideo) - e.g., related videos sidebar for WATCH videos
    itemSelector: "ytd-compact-video-renderer",
    urlSelector:
      'a.yt-simple-endpoint[href*="/watch?v="]:has(#video-title), a#video-title[href*="/watch?v="]',
    buttonTargetSelector: "#metadata-line", // Standard metadata line ID within compact video
    buttonStyle: { marginTop: "-6px" }, // Style for the <a> tag
  },
  {
    // VARIANT3 (SHORTS - ytd-reel-item-renderer, specific div structure for Shorts outside main feed/search)
    itemSelector:
      "ytd-reel-item-renderer, div.shortsLockupViewModelHostOutsideMetadata",
    urlSelector:
      'a#video-title[href*="/shorts/"], a.shortsLockupViewModelHostEndpoint[href*="/shorts/"]',
    buttonTargetSelector:
      "#meta.ytd-reel-item-renderer, div.shortsLockupViewModelHostMetadataSubhead.shortsLockupViewModelHostOutsideMetadataSubhead",
    buttonStyle: {
      marginLeft: "8px",
      display: "inline-flex",
      verticalAlign: "middle",
      marginTop: "0px",
    }, // Style for the <a> tag
  },
  {
    // VARIANT4 (SHORTS displayed within a ytd-video-renderer, e.g., in search results or channel tabs)
    // This specifically targets ytd-video-renderer when its primary link is a Short.
    itemSelector: 'ytd-video-renderer:has(a#video-title[href*="/shorts/"])',
    urlSelector: 'a#video-title[href*="/shorts/"]',
    // Place button in #metadata-line for visual consistency with other video cards in similar contexts (like search results),
    // so it appears alongside view count and date.
    buttonTargetSelector: "#metadata-line",
    buttonStyle: {
      marginLeft: "8px",
      display: "inline-flex",
      verticalAlign: "middle",
      marginTop: "0px",
    }, // Style for the <a> tag, consistent with other Shorts buttons
  },
];

// Modified function signature: config object is passed instead of just customLinkStyle
function createP48Button(videoUrl, config) {
  if (!videoUrl) {
    // console.warn("P48 Linker: Invalid video URL for button: null/undefined");
    return null;
  }

  let cleanUrl;
  const isShort = videoUrl.includes("/shorts/");
  const isWatch = videoUrl.includes("/watch?v=");

  if (!isShort && !isWatch) {
    // console.warn("P48 Linker: URL is not a recognized YouTube video/short:", videoUrl);
    return null;
  }

  // Ensure URL is absolute
  if (videoUrl.startsWith("/")) {
    videoUrl = `https://www.youtube.com${videoUrl}`;
  }

  try {
    const urlObject = new URL(videoUrl);
    if (isWatch) {
      const videoId = urlObject.searchParams.get("v");
      if (!videoId) {
        // console.warn("P48 Linker: Could not extract videoId from watch URL:", videoUrl);
        return null;
      }
      cleanUrl = `${urlObject.origin}${urlObject.pathname}?v=${videoId}`;
    } else if (isShort) {
      // For shorts, the path itself is usually /shorts/VIDEO_ID
      // Ensure no extra query params are carried over.
      cleanUrl = `${urlObject.origin}${urlObject.pathname}`;
    } else {
      // Should not be reached due to earlier checks, but as a fallback.
      // console.warn("P48 Linker: Unhandled URL type for cleaning:", videoUrl);
      return null;
    }
  } catch (e) {
    console.error("P48 Linker: Error parsing video URL:", videoUrl, e);
    return null;
  }

  const p48Href = `P48://${cleanUrl}`;

  const buttonContainer = document.createElement("div");
  buttonContainer.className = P48_BUTTON_CLASS_OUTER;
  buttonContainer.style.display = "ruby";

  // <<< START OF MODIFICATION >>>
  // Apply position: absolute specifically for compact video variant
  if (config && config.itemSelector === "ytd-compact-video-renderer") {
    buttonContainer.style.position = "absolute";
  }
  // <<< END OF MODIFICATION >>>

  const iconWrapper = document.createElement("div"); // This div controls visibility via opacity
  iconWrapper.style.opacity = "1"; // Initially hidden for hover effect

  // iconWrapper.onmouseenter = function () { iconWrapper.style.opacity = "1"; };
  // iconWrapper.onmouseleave = function () { iconWrapper.style.opacity = "0"; };

  const link = document.createElement("a");
  link.classList.add(P48_LINK_CLASS);
  link.href = p48Href;
  link.innerHTML = P48_ICON_SVG;
  link.style.display = "flex"; // Default, can be overridden by customLinkStyle
  link.style.opacity = "0.1"; // Default opacity when iconWrapper is visible (on parent hover)

  link.onmouseenter = function () {
    link.style.opacity = "0.5";
  }; // Full opacity on direct link hover
  link.onmouseleave = function () {
    link.style.opacity = "0.1";
  }; // Back to 0.3 if mouse leaves link but stays on iconWrapper

  // Apply custom styles from config, potentially overriding defaults
  // Use config.buttonStyle directly
  if (config && config.buttonStyle) {
    Object.assign(link.style, config.buttonStyle);
  }


  iconWrapper.appendChild(link);
  buttonContainer.appendChild(iconWrapper);

  // Prevent click on the container from navigating; only the link should trigger navigation.
  buttonContainer.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  // Allow link's default action (protocol navigation) but stop propagation to prevent YouTube's own handlers.
  link.addEventListener("click", (event) => {
    event.stopPropagation();
    // console.log(`P48 Linker: Anchor clicked, P48 navigation for: ${p48Href}`);
  });

  return buttonContainer;
}

function processNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  VIDEO_CONFIGS.forEach((config) => {
    const items = [];
    // Check if the current node itself matches the itemSelector
    // Must handle potential errors if :has is not supported by the query engine (though unlikely for target browsers)
    try {
      if (node.matches(config.itemSelector)) {
        items.push(node);
      }
    } catch (e) {
      // console.warn("P48 Linker: CSS selector error for node.matches:", config.itemSelector, e.message);
    }

    // Then, query for descendants that match.
    try {
      node.querySelectorAll(config.itemSelector).forEach((foundItem) => {
        // Deduplicate if the node itself was already added
        if (!items.includes(foundItem)) {
          items.push(foundItem);
        }
      });
    } catch (e) {
      // console.warn("P48 Linker: CSS selector error for querySelectorAll:", config.itemSelector, e.message);
    }

    items.forEach((item) => {
      const buttonTarget = item.querySelector(config.buttonTargetSelector);

      if (
        buttonTarget &&
        !buttonTarget.querySelector("." + P48_BUTTON_CLASS_OUTER)
      ) {
        const videoUrlElement = item.querySelector(config.urlSelector);

        if (videoUrlElement && videoUrlElement.href) {
          const videoUrl = videoUrlElement.href;
          // Pass the entire config object to createP48Button
          const p48Button = createP48Button(videoUrl, config);
          if (p48Button) {
            buttonTarget.appendChild(p48Button);
            // console.log(`P48 Linker: Added button to item for ${videoUrl}`, {item: item, target: buttonTarget, config_item_sel: config.itemSelector, config_target_sel: config.buttonTargetSelector });
          }
        } else {
          // console.warn(`P48 Linker: No video URL element from "${config.urlSelector}" in item:`, item, `for config itemSelector: ${config.itemSelector}`);
        }
      } else if (
        buttonTarget &&
        buttonTarget.querySelector("." + P48_BUTTON_CLASS_OUTER)
      ) {
        // console.log("P48 Linker: Button already exists in target for item:", item, `target selector: ${config.buttonTargetSelector}`);
      } else if (!buttonTarget) {
        // console.warn(`P48 Linker: Button target "${config.buttonTargetSelector}" not found in item:`, item, `for config itemSelector: ${config.itemSelector}`);
      }
    });
  });
}

const observer = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((addedNode) => processNode(addedNode));
    }
  }
});

function initialScan() {
  // console.log("P48 Linker: Performing initial scan of the document.");
  processNode(document.body);
}

// Start observing and run an initial scan
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Run initial scan after DOM is loaded or immediately if already loaded.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialScan);
} else {
  initialScan();
}

console.log("P48 Linker: Observer started and initial scan scheduled/run.");