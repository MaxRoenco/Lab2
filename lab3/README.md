# Kvadrat — Acting Academy | Lab 3

Enhanced landing page for **Kvadrat** — a professional acting academy in Chișinău, Moldova.  
Lab 3 adds **responsive design**, **CSS animations**, a **theatre mascot**, and **partial Tailwind CSS migration**.

> **Live demo:** _[Add your deployed URL here]_

---

## What's New in Lab 3

| Feature | Description |
| --- | --- |
| **Full Responsive Design** | Fluid layouts from 1180px desktop down to 320px phone |
| **Mobile CTA Bar** | Fixed sticky "Enroll Now" bar, visible only on mobile |
| **Mobile Spotlight Section** | Mobile-only stats strip between Hero and About |
| **Theatre Mascot** | Animated comedy-mask mascot (appears after 3 s, floats, hover CTA) |
| **CSS Animations** | Hero entrance, scroll reveal, mascot float & appear keyframes |
| **Tailwind CSS** | Partial migration — mobile spotlight & CTA components use Tailwind utility CDN |

---

## Sections

| Section | Description |
| --- | --- |
| **Hero** | Full-viewport intro with headline and CTA buttons |
| **Mobile Spotlight** | Mobile-only stats strip (7+ years · 300+ graduates · 12 courses) |
| **About** | Academy story, values, and key statistics |
| **Courses** | 4 course cards (beginner → advanced) |
| **Gallery** | Responsive photo grid |
| **Testimonials** | Student reviews (3 cards) |
| **Contact** | Address, phone, email, and enrollment form |

---

## Mascot — Kvad the Theatre Mask

**Kvad** is a golden comedy-mask mascot wearing a beret:

- Appears in the **bottom-right corner** after a **3-second delay**
- Continuously **floats** (gentle up-down bob animation)
- **Tilts and pops** when hovered
- Shows a **speech bubble** with a CTA ("Ready to step into the spotlight? Enroll today →") on hover/tap

---

## Tech Stack

- **HTML5** — semantic markup, ARIA attributes
- **CSS3** — custom properties, Grid, Flexbox, keyframe animations, media queries
- **Tailwind CSS** — partial migration (mobile UI components via CDN Play)
- **JavaScript** — vanilla JS for nav, scroll reveal, mascot interaction

---

## Running Locally

Open `lab3/index.html` directly in your browser, or:

```bash
npx serve .
```
