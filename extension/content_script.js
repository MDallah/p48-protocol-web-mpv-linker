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
    itemSelector:
      'ytd-rich-item-renderer, ytd-video-renderer:not(:has(a#video-title[href*="/shorts/"])), ytd-grid-video-renderer',
    urlSelector:
      'a#video-title-link[href*="/watch?v="], ytd-thumbnail[href*="/watch?v="] a, a#video-title[href*="/watch?v="]',
    buttonTargetSelector: "#metadata-line",
    buttonStyle: { marginTop: "-6px" },
  },
  {
    itemSelector: "ytd-compact-video-renderer",
    urlSelector:
      'a.yt-simple-endpoint[href*="/watch?v="]:has(#video-title), a#video-title[href*="/watch?v="]',
    buttonTargetSelector: "#metadata-line",
    buttonStyle: { marginTop: "-6px" },
  },
  {
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
    },
  },
  {
    itemSelector: 'ytd-video-renderer:has(a#video-title[href*="/shorts/"])',
    urlSelector: 'a#video-title[href*="/shorts/"]',
    buttonTargetSelector: "#metadata-line",
    buttonStyle: {
      marginLeft: "8px",
      display: "inline-flex",
      verticalAlign: "middle",
      marginTop: "0px",
    },
  },
];

let currentP48Quality = "best";

function loadP48Quality() {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["p48Quality"], (result) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "P48 Linker: Error loading quality setting:",
          chrome.runtime.lastError.message
        );
        currentP48Quality = "best";
      } else if (result.p48Quality) {
        currentP48Quality = result.p48Quality;
        console.log("P48 Linker: Loaded quality setting:", currentP48Quality);
      } else {
        currentP48Quality = "best";
      }
    });
  } else {
    console.warn(
      "P48 Linker: chrome.storage.local not available. Using default quality."
    );
    currentP48Quality = "best";
  }
}

if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.p48Quality) {
      currentP48Quality = changes.p48Quality.newValue;
      console.log("P48 Linker: Quality setting changed to:", currentP48Quality);
    }
  });
}
loadP48Quality();

function createP48Button(videoUrl, config) {
  if (!videoUrl) {
    return null;
  }

  let cleanUrl;
  const isShort = videoUrl.includes("/shorts/");
  const isWatch = videoUrl.includes("/watch?v=");

  if (!isShort && !isWatch) {
    return null;
  }

  if (videoUrl.startsWith("/")) {
    videoUrl = `https://www.youtube.com${videoUrl}`;
  }

  try {
    const urlObject = new URL(videoUrl);
    if (isWatch) {
      const videoId = urlObject.searchParams.get("v");
      if (!videoId) {
        return null;
      }
      cleanUrl = `${urlObject.origin}/watch?v=${videoId}`;
    } else if (isShort) {
      const shortId = urlObject.pathname.split("/shorts/")[1];
      if (!shortId) return null;
      cleanUrl = `${urlObject.origin}/watch?v=${shortId}`;
    } else {
      return null;
    }
  } catch (e) {
    console.error("P48 Linker: Error parsing video URL:", videoUrl, e);
    return null;
  }

  let urlForP48 = cleanUrl;
  if (currentP48Quality && currentP48Quality !== "best") {
    urlForP48 += `&q=${currentP48Quality}`;
  }

  const p48Href = `P48://${urlForP48}`;

  const buttonContainer = document.createElement("div");
  buttonContainer.className = P48_BUTTON_CLASS_OUTER;
  buttonContainer.style.display = "ruby";

  if (config && config.itemSelector === "ytd-compact-video-renderer") {
    buttonContainer.style.position = "absolute";
  }

  const iconWrapper = document.createElement("div");
  iconWrapper.style.opacity = "1";

  const link = document.createElement("a");
  link.classList.add(P48_LINK_CLASS);
  link.href = p48Href;
  link.target = "_self";
  link.innerHTML = P48_ICON_SVG;
  link.style.display = "flex";
  link.style.opacity = "0.2";

  link.onmouseenter = function () {
    link.style.opacity = "0.5";
  };
  link.onmouseleave = function () {
    link.style.opacity = "0.2";
  };

  if (config && config.buttonStyle) {
    Object.assign(link.style, config.buttonStyle);
  }

  iconWrapper.appendChild(link);
  buttonContainer.appendChild(iconWrapper);

  buttonContainer.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  link.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  return buttonContainer;
}

function processNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  VIDEO_CONFIGS.forEach((config) => {
    const items = [];
    try {
      if (node.matches(config.itemSelector)) {
        items.push(node);
      }
    } catch (e) {
      // console.warn("P48 Linker: CSS selector error for node.matches:", config.itemSelector, e.message);
    }

    try {
      node.querySelectorAll(config.itemSelector).forEach((foundItem) => {
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
          const p48Button = createP48Button(videoUrl, config);
          if (p48Button) {
            buttonTarget.appendChild(p48Button);
          }
        }
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
  processNode(document.body);
}

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialScan);
} else {
  initialScan();
}

console.log("P48 Linker: Observer started and initial scan scheduled/run.");
