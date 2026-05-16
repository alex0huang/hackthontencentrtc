# SecReviewer landing page

Next.js 14 + Tailwind. Run:

```bash
# Init (one-time, from sec-reviewer/ root):
npx create-next-app@latest web --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# Then overwrite app/page.tsx with the version in this directory and:
cd web
npm run dev
```

Deploy: `vercel deploy` (free tier is fine).
