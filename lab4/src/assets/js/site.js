(function () {
  const nav = document.getElementById("nav");

  function updateNav() {
    if (!nav) {
      return;
    }
    nav.classList.toggle("nav--scrolled", window.scrollY > 60);
  }

  window.addEventListener("scroll", updateNav, { passive: true });
  updateNav();

  const burger = document.getElementById("navBurger");
  const navLinks = document.getElementById("navLinks");

  if (burger && navLinks) {
    burger.addEventListener("click", function () {
      const isOpen = navLinks.classList.toggle("nav__links--open");
      burger.classList.toggle("nav__burger--active", isOpen);
      burger.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("nav__links--open");
        burger.classList.remove("nav__burger--active");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  const revealEls = document.querySelectorAll(
    ".about__grid, .course-card, .testimonial-card, .gallery__item, .contact__grid, .mobile-spotlight__inner",
  );

  if (revealEls.length > 0) {
    const revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );

    revealEls.forEach(function (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = "opacity 0.55s ease, transform 0.55s ease";
      revealObserver.observe(el);
    });
  }

  const mascot = document.getElementById("mascot");
  const mascotBubble = document.getElementById("mascotBubble");

  if (mascot && mascotBubble) {
    mascot.addEventListener("click", function () {
      mascotBubble.classList.toggle("mascot__bubble--visible");
    });

    document.addEventListener("click", function (event) {
      if (!mascot.contains(event.target)) {
        mascotBubble.classList.remove("mascot__bubble--visible");
      }
    });
  }

  const mobileCta = document.getElementById("mobileCta");
  const contactSection = document.getElementById("contact");

  if (mobileCta && contactSection) {
    const ctaObserver = new IntersectionObserver(
      function (entries) {
        const entry = entries[0];
        mobileCta.classList.toggle(
          "mobile-cta-bar--hidden",
          entry.isIntersecting,
        );
      },
      { threshold: 0.1 },
    );

    ctaObserver.observe(contactSection);
  }

  if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", function (user) {
      if (!user) {
        window.netlifyIdentity.on("login", function () {
          document.location.href = "/admin/";
        });
      }
    });
  }
})();
