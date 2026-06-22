const APP_BASE_URL = new URL(import.meta.env.BASE_URL || "./", window.location.href);
const MATHJAX_ROOT = new URL("vendor/mathjax", APP_BASE_URL).href.replace(/\/$/, "");
const MATHJAX_SCRIPT = `${MATHJAX_ROOT}/tex-svg-full.js`;
const MATHJAX_TEX_PACKAGES = ["ams", "cases", "mathtools", "noerrors", "noundefined"];

let mathJaxPromise = null;
let typesetQueue = Promise.resolve();

function configuredMathJax() {
  return {
    loader: {
      paths: {
        mathjax: MATHJAX_ROOT,
        tex: `${MATHJAX_ROOT}/input/tex/extensions`,
      },
      versionWarnings: false,
    },
    options: {
      enableMenu: false,
      enableAssistiveMml: false,
      renderActions: { assistiveMml: [] },
      skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      ignoreHtmlClass: "tex2jax_ignore",
      processHtmlClass: "tex2jax_process",
    },
    tex: {
      inlineMath: [["\\(", "\\)"]],
      displayMath: [["\\[", "\\]"], ["$$", "$$"]],
      processEscapes: true,
      packages: { "[+]": MATHJAX_TEX_PACKAGES },
    },
    svg: { fontCache: "none" },
    startup: { typeset: false },
  };
}

export function hasMathDelimiters(value = "") {
  return /\\\(|\\\[|\$\$/.test(String(value));
}

export function loadMathJax() {
  if (window.MathJax?.typesetPromise && window.MathJax?.startup?.promise) {
    return window.MathJax.startup.promise.then(() => window.MathJax);
  }
  if (mathJaxPromise) return mathJaxPromise;

  mathJaxPromise = new Promise((resolve, reject) => {
    window.MathJax = configuredMathJax();
    document.getElementById("wawa-mathjax-script")?.remove();
    const script = document.createElement("script");
    script.id = "wawa-mathjax-script";
    script.src = MATHJAX_SCRIPT;
    script.async = true;
    script.addEventListener("load", () => {
      Promise.resolve(window.MathJax?.startup?.promise)
        .then(() => resolve(window.MathJax))
        .catch(reject);
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load local MathJax bundle.")), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    mathJaxPromise = null;
    throw error;
  });

  return mathJaxPromise;
}

export function typesetMath(element) {
  if (!element) return Promise.resolve();

  const task = typesetQueue.then(async () => {
    const mathJax = await loadMathJax();
    if (!element.isConnected) return;
    mathJax.typesetClear?.([element]);
    await mathJax.typesetPromise([element]);
  });

  typesetQueue = task.catch(() => {});
  return task;
}

export function clearTypesetMath(element) {
  if (element) window.MathJax?.typesetClear?.([element]);
}
