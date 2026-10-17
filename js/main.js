
document.addEventListener("DOMContentLoaded", () => {
    // Contact scroll
    let contactScrollFrame = null;

    document.querySelectorAll('a[href="#contact"]').forEach(link => {
        link.addEventListener("click", event => {
            if (
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
            ) return;

            const footer = document.getElementById("contact");
            if (!footer) return;

            event.preventDefault();

            if (contactScrollFrame !== null) {
                cancelAnimationFrame(contactScrollFrame);
                contactScrollFrame = null;
            }

            const reducedMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

            const getBottom = () => Math.max(
                0,
                Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight
                ) - window.innerHeight
            );

            if (reducedMotion) {
                window.scrollTo({ top: getBottom(), behavior: "instant" });
                history.replaceState(null, "", "#contact");
                return;
            }

            const startY = window.scrollY;
            const startTime = performance.now();
            const duration = 1300;

            const easeInOut = progress =>
                1 - Math.pow(1 - progress, 4);

            function animate(now) {
                const progress = Math.min(
                    (now - startTime) / duration,
                    1
                );

                const targetY = getBottom();

                const nextY =
                    startY + (targetY - startY) * easeInOut(progress);

                window.scrollTo({
                    top: nextY,
                    behavior: "instant"
                });

                if (progress < 1) {
                    contactScrollFrame = requestAnimationFrame(animate);
                } else {
                    window.scrollTo({
                        top: getBottom(),
                        behavior: "instant"
                    });

                    contactScrollFrame = null;
                }
            }

            contactScrollFrame = requestAnimationFrame(animate);

            history.replaceState(null, "", "#contact");
        });
    });

    // Project filters
    const filterButtons = document.querySelectorAll(".projects-filter__button");
    const projectCards = document.querySelectorAll(
        ".projects-page__grid .project-card"
    );

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            const filter = button.dataset.filter || "all";

            filterButtons.forEach(item => {
                const isActive = item === button;
                item.classList.toggle("active", isActive);
                item.setAttribute("aria-pressed", String(isActive));
            });

            projectCards.forEach(card => {
                const categories = (card.dataset.category || "")
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);

                card.hidden = filter !== "all" && !categories.includes(filter);
            });
        });
    });

    // Image lightbox
    const candidates = Array.from(
        document.querySelectorAll(".zoomable-image, [data-lightbox]")
    );

    const triggers = candidates.filter(candidate =>
        !candidate.parentElement?.closest(".zoomable-image, [data-lightbox]")
    );

    const entries = triggers
        .map(trigger => {
            const img = trigger.matches("img")
                ? trigger
                : trigger.querySelector("img");

            if (!img) return null;

            return {
                trigger,
                img,
                group: trigger.dataset.gallery || img.dataset.gallery || ""
            };
        })
        .filter(Boolean);

    if (!entries.length) return;

    if (
        typeof HTMLDialogElement === "undefined" ||
        typeof HTMLDialogElement.prototype.showModal !== "function"
    ) {
        return;
    }

    const viewer = document.createElement("dialog");
    viewer.className = "portfolio-viewer";
    viewer.setAttribute("aria-label", "Project image viewer");

    viewer.innerHTML = `
        <div class="portfolio-viewer__toolbar">
            <span class="portfolio-viewer__counter" aria-live="polite"></span>
            <button class="portfolio-viewer__close" type="button"
                aria-label="Close viewer">×</button>
        </div>
        <button class="portfolio-viewer__prev" type="button"
            aria-label="Previous image">‹</button>
        <div class="portfolio-viewer__stage">
            <img class="portfolio-viewer__image" alt="">
        </div>
        <button class="portfolio-viewer__next" type="button"
            aria-label="Next image">›</button>
    `;

    document.body.appendChild(viewer);

    const stage = viewer.querySelector(".portfolio-viewer__stage");
    const image = viewer.querySelector(".portfolio-viewer__image");
    const counter = viewer.querySelector(".portfolio-viewer__counter");
    const prev = viewer.querySelector(".portfolio-viewer__prev");
    const next = viewer.querySelector(".portfolio-viewer__next");
    const close = viewer.querySelector(".portfolio-viewer__close");

    let currentGroup = [];
    let currentIndex = 0;
    let previousFocus = null;

    function render() {
        const entry = currentGroup[currentIndex];
        if (!entry) return;

        const fullSource =
            entry.trigger.dataset.full || entry.img.dataset.full;

        const source =
            fullSource || entry.img.currentSrc || entry.img.src;

        image.removeAttribute("srcset");
        image.removeAttribute("sizes");
        image.src = source;
        image.alt = entry.img.alt || "Project screenshot";

        stage.scrollTop = 0;
        stage.scrollLeft = 0;

        const multiple = currentGroup.length > 1;
        prev.hidden = !multiple;
        next.hidden = !multiple;

        counter.textContent = multiple
            ? `${currentIndex + 1} / ${currentGroup.length}`
            : "";

        viewer.classList.toggle("portfolio-viewer--gallery", multiple);
    }

    function openViewer(entry) {
        if (viewer.open) return;

        previousFocus = document.activeElement;

        currentGroup = entry.group
            ? entries.filter(item => item.group === entry.group)
            : [entry];

        currentIndex = currentGroup.indexOf(entry);

        render();
        viewer.showModal();
        close.focus();
    }

    function changeImage(direction) {
        if (!viewer.open || currentGroup.length < 2) return;

        currentIndex = (
            currentIndex + direction + currentGroup.length
        ) % currentGroup.length;

        render();
    }

    function closeViewer() {
        if (viewer.open) viewer.close();
    }

    entries.forEach(entry => {
        const { trigger, img } = entry;

        const isNativeControl = trigger.matches("a, button");
        const isAnchor = trigger.matches("a");

        trigger.classList.add("is-zoomable");

        if (!isNativeControl) {
            trigger.tabIndex = trigger.hasAttribute("tabindex")
                ? trigger.tabIndex
                : 0;

            trigger.setAttribute("role", "button");
        }

        if (!trigger.hasAttribute("aria-label")) {
            trigger.setAttribute(
                "aria-label",
                `${img.alt || "Project image"} — enlarge`
            );
        }

        trigger.addEventListener("click", event => {
            if (
                isAnchor &&
                (
                    event.ctrlKey ||
                    event.metaKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.button !== 0
                )
            ) return;

            const nestedControl = event.target.closest?.("a, button");

            if (nestedControl && nestedControl !== trigger) return;

            if (isAnchor) event.preventDefault();

            openViewer(entry);
        });

        if (!isNativeControl) {
            trigger.addEventListener("keydown", event => {
                if (event.target !== trigger) return;

                if (
                    event.key !== "Enter" &&
                    event.key !== " "
                ) return;

                event.preventDefault();
                openViewer(entry);
            });
        }
    });

    close.addEventListener("click", closeViewer);

    prev.addEventListener("click", () => changeImage(-1));
    next.addEventListener("click", () => changeImage(1));

    viewer.addEventListener("keydown", event => {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            changeImage(-1);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            changeImage(1);
        }
    });

    viewer.addEventListener("click", event => {
        if (event.target !== viewer) return;

        const rect = viewer.getBoundingClientRect();

        const clickedOutside =
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom;

        if (clickedOutside) closeViewer();
    });

    viewer.addEventListener("close", () => {
        image.removeAttribute("src");
        image.alt = "";

        currentGroup = [];
        currentIndex = 0;

        if (
            previousFocus?.isConnected &&
            typeof previousFocus.focus === "function"
        ) {
            previousFocus.focus();
        }

        previousFocus = null;
    });
});
