# Lab 4 - Static Site Generator + Git CMS

This folder contains the Lab 4 implementation for the Kvadrat landing page.

Stack selected:

- SSG: Eleventy (11ty)
- Git CMS: Decap CMS
- Design/CSS integration: Lab 3 styles (including Tailwind CDN + custom reset/style)

## What was migrated from Lab 3

- Responsive layout and media query behavior
- Mascot appearance/animation and hover CTA bubble
- Mobile-only spotlight section
- Mobile sticky CTA bar
- Existing gallery and course visuals
- Existing interactions (nav scroll state, burger menu, reveal effects)

## CMS editable content

Most content is editable from Decap CMS:

- Global metadata/navigation/footer: src/\_data/site.json
- Main landing copy: src/content/home.md
- Courses: src/content/courses/\*.md
- Testimonials: src/content/testimonials/\*.md
- Gallery items: src/content/gallery/\*.md

## Project structure

lab4/

- .eleventy.js
- package.json
- netlify.toml
- src/
  - \_includes/base.njk
  - \_data/site.json
  - assets/
    - css/reset.css
    - css/style.css
    - js/site.js
    - images/\*
  - content/
    - home.md
    - courses/\*.md
    - testimonials/\*.md
    - gallery/\*.md
  - admin/
    - index.html
    - config.yml
  - index.njk

## Run locally

From the lab4 folder:

```bash
npm install
npm run dev
```

Site URL:

- http://localhost:8080

## Run CMS locally

In a second terminal (still in lab4):

```bash
npm run cms:proxy
```

CMS URL:

- http://localhost:8080/admin

The local proxy enables editing content without production auth setup.

## Build

```bash
npm run build
```

Output directory:

- lab4/\_site

## Deploy live (Netlify)

This setup includes netlify.toml for a simple deploy.

1. Connect your repository to Netlify.
2. Build settings are read automatically:
   - Base directory: lab4
   - Build command: npm run build
   - Publish directory: \_site
3. Enable Identity and Git Gateway in Netlify if you want browser-based CMS editing in production.
4. Open your deployed /admin route to edit content.

## Git history recommendation for lab grading

To satisfy "decent git history", use multiple commits such as:

1. chore(lab4): scaffold eleventy + assets
2. feat(lab4): migrate templates and interactions
3. feat(cms): configure decap collections
4. docs(lab4): add run/deploy instructions
