console.log("P48 Linker: Content script loaded.");

const P48_BUTTON_CLASS = "p48-linker-button";
const P48_ICON_SVG = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.1339 22.5C15.5188 23.1667 16.4811 23.1667 16.866 22.5L22.9282 12C23.3131 11.3333 22.8319 10.5 22.0621 10.5H9.93777C9.16797 10.5 8.68685 11.3333 9.07175 12L15.1339 22.5Z" fill="#F8312F"/>
</svg>`;

function createP48Button(videoUrl) {
  if (!videoUrl || !videoUrl.includes("watch?v=")) {
    console.warn("P48 Linker: Invalid video URL for button:", videoUrl);
    return null;
  }

  // Ensure URL is absolute
  if (videoUrl.startsWith("/")) {
    videoUrl = `https://www.youtube.com${videoUrl}`;
  }

  // Clean potential extra params like &t= or &list=
  const urlObject = new URL(videoUrl);
  const cleanUrl = `${urlObject.origin}${
    urlObject.pathname
  }?v=${urlObject.searchParams.get("v")}`;
  const p48Href = `P48://${cleanUrl}`; // Use cleaned URL

  const buttonContainer = document.createElement("div");
  buttonContainer.className = P48_BUTTON_CLASS;
  //   buttonContainer.title = "Open with P48"; // Tooltip

  const iconContainer = document.createElement("div");
  iconContainer.style.opacity = "0";
  iconContainer.onmouseenter = function (e) {
    e.target.style.opacity = "1";
  };
  iconContainer.onmouseleave = function (e) {
    e.target.style.opacity = "0";
  };

  const link = document.createElement("a");
  link.id = "p48-linker-button"; // Unique ID for the button
  link.href = p48Href;
  link.innerHTML = P48_ICON_SVG;
  link.style.display = "flex";
  // link.style.alignItems = "center";
  // link.style.justifyContent = "center";
  // link.style.width = "100%";
  // link.style.height = "100%";
  // link.style.color = "white";
  link.style.opacity = "0.3";
  link.style.marginTop = "-6px";

  iconContainer.appendChild(link);
  buttonContainer.appendChild(iconContainer);

  // Prevent click event from bubbling up
  buttonContainer.addEventListener("click", (event) => {
    event.stopPropagation();
    console.log(`P48 Linker: Clicked P48 link: ${p48Href}`);
    // Browser/OS handles the protocol
  });

  return buttonContainer;
}

function findVideoUrl(itemRenderer) {
  // Selectors might need updates if YouTube changes structure
  const linkElement = itemRenderer.querySelector(
    'a#thumbnail[href*="/watch?v="], a#video-title-link[href*="/watch?v="]'
  );
  return linkElement ? linkElement.href : null;
}

// Use MutationObserver to detect dynamically added players
const observer = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const controlsContainer = node.matches("#metadata-line")
            ? node
            : node.querySelector("#metadata-line");

          if (
            controlsContainer &&
            !controlsContainer.querySelector("." + P48_BUTTON_CLASS)
          ) {
            // Find the ancestor rich item renderer to get the correct video URL
            const richItemRenderer = controlsContainer.closest(
              "ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer"
            ); // Add more potential containers if needed

            if (richItemRenderer) {
              const videoUrl = findVideoUrl(richItemRenderer);
              if (videoUrl) {
                const p48Button = createP48Button(videoUrl);
                if (p48Button) {
                  controlsContainer.appendChild(p48Button);
                }
              } else {
                console.warn(
                  "P48 Linker: Could not find video URL for inline player in:",
                  richItemRenderer
                );
              }
            } else {
              console.warn(
                "P48 Linker: Could not find parent item renderer for controls:",
                controlsContainer
              );
            }
          }
        }
      });
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

console.log("P48 Linker: Observer started.");
