
# How the Meridian blog publishes

- Site is hosted on Netlify from GitHub repo `FN-MA/meridian-accountants-website` (branch `main`). Netlify's base directory is `Website docs v2/`; everything the site needs lives there.
- Posts are Markdown files in `Website docs v2/content/posts`, named `YYYY-MM-DD-slug.md`. They can also be written in the CMS at meridian-accountants.com/admin (Sveltia CMS, GitHub login).
- When uploading via GitHub's web page, open the TARGET folder first (check the breadcrumb at the top), then drag in the files. A post file goes into `Website docs v2/content/posts`; blog page files into `Website docs v2/blog`. GitHub's uploader doesn't keep folders from a zip reliably: on 10 Oct 2026 dragging gave plain file names, which would have put blog/index.html over the HOMEPAGE. Upload each folder's files separately.
- Front matter:

```
---
title: "Post title with the search terms people use"
date: 2026-09-26
excerpt: "One-line summary shown on the blog list."
description: "About 150 characters for Google results (optional; falls back to excerpt). Keep under 160."
updated: 2026-10-01   # optional, when a post is revised (also triggers an IndexNow ping)
---
```

- Body is Markdown (headings, bold, lists, tables, links). No H1 needed. Link to contact with `/#contact`. Link to other posts with the full URL, ending in a slash, e.g. https://meridian-accountants.com/blog/directors-loan-account-explained/
- Always share post links WITH the trailing slash (the no-slash version redirects, and Search Console flagged it as a "Redirect error" on 7 Oct 2026).
- Workflow used so far: draft in a Claude Doc → Farid comments → approve → Claude converts to the .md file and test-builds it → Farid uploads to content/posts.
- Writing style Farid wants: gender-neutral wording (e.g. "front-of-house worker", not "waiter"); say who "you" is (posts are mainly for employers/business owners; add a staff FAQ where relevant); Farid doesn't work with pubs, so don't list pubs in hospitality CTAs (restaurants, cafés, hotels).
- Blog layout (live 10 Oct 2026): post and blog-list pages widened to max-width 1000px, side padding clamp(1.25rem, 4vw, 3rem), post text 1.15rem (Farid found the old 740px column too narrow); tables scroll sideways on phones (max-width 700px rule in blog/post.html).
- LinkedIn posts: Farid opens them with "This week's post…" and ends with an invite to get in touch or comment.

## Standard service-area wording (use in EVERY post's call to action)
Farid's chosen wording, which matches his Google Business Profile service areas: **"based in Southampton, serving Southampton, Romsey, Winchester, the New Forest, Totton and surrounding areas"**.
- The same list is on the homepage (SO14 card: "Based in Southampton, serving Romsey, Winchester, the New Forest, Totton & surrounding areas") and in the homepage schema (`areaServed` in build.js).
- Keep it identical across the website, Google, Bing and Facebook.

## SEO build (live since 2026-09-26)
- `build.js` + `package.json` + `netlify.toml` make Netlify pre-render every post into real HTML at `/blog/<slug>/` (date prefix dropped from the address), with meta description, canonical, Open Graph tags, BlogPosting schema and an author byline (Farid Nasri, ACA).
- A `## Frequently asked questions` section with `###` questions is turned into FAQ schema automatically.
- Build also writes `sitemap.xml`, `robots.txt` (blocks /admin/) and redirects old `post.html?slug=` links.
- The homepage "Latest from the Blog" section (3 newest posts, under the hero) is added at build time.
- Social links: a `SOCIAL` list near the top of build.js puts "Follow us on …" links in every page footer and adds the profiles to the schema (`sameAs`). It currently holds Facebook and the LinkedIn company page.
- IndexNow (added 3 Oct 2026): key file `/58c59e50816a8b46dcc96ccae3e5a68c.txt`. Netlify plugin `plugins/indexnow` sends the homepage, /blog/ and any post dated or updated in the last 3 days to Bing and others after each production deploy. Check the Netlify deploy log for "IndexNow: submitted … response 200/202".
- If a Netlify build fails, the previous version stays live.

## SEO checklist for each post
- Title with the main search phrase; a 2-sentence "Quick answer" at the top; an FAQ section of real questions; dated figures; the standard service-area wording in the call to action; a search description under 160 characters; links to related earlier posts.

## After publishing each post (ALWAYS remind Farid of this list once a post is live)
Farid asked (3 Oct 2026) to be reminded of these steps after every new post:
1. Check the post is live on the website and appears in the homepage "Latest from the Blog" section.
2. Google Business Profile → Posts → Add update: two lines about the post, button "Learn more", link to the post URL.
3. Facebook business page: share the post link with 2–3 lines in his own words.
4. LinkedIn: share from his personal profile (Farid writes these himself; don't draft them unless asked). In a LinkedIn post, paste the full https:// address; it becomes a link card once published (words can't be hyperlinked in a normal post). If no card appears, use linkedin.com/post-inspector.
5. Optional, for time-sensitive posts: Google Search Console → URL inspection → Request indexing. Bing is notified automatically (IndexNow), and Google also picks posts up from the sitemap.

## Posts
- 2026-09-10 Welcome to the Meridian Accountants Blog
- 2026-09-26 Director's Loan Account Explained: s455 Tax, Interest and Benefit in Kind (2026/27) — live at /blog/directors-loan-account-explained/. Shared as a Google Business Profile update on 27 Sep 2026. Service-area CTA added 3 Oct 2026 (`updated: 2026-10-03`).
- 2026-10-03 Sole Trader vs Limited Company: Which Is Right for You? (2026/27) — live at /blog/sole-trader-vs-limited-company/. Draft doc: https://claude.ai/code/artifact/41a8b9a7-6ed3-42e8-8886-52c1d6a3935d
- 2026-10-10 Tips, Troncs and the New Tipping Rules: A Guide for Hospitality Employers (2026/27) — LIVE 10 Oct 2026 at /blog/tips-troncs-new-tipping-rules-hospitality/ (7 FAQ questions in schema). Doc https://claude.ai/code/artifact/4c66f829-059e-4bdc-8313-70f37a57435a. Research: claude/hospitality-tips-research.md. FOLLOW-UP: when the government confirms the start date for the ERA 2025 consultation/3-year review duties (expected late 2026), update the post (`updated:` date). Open points not in the post: card processing fee deductions; whether VAT on a compulsory service charge can be kept back before passing it on.
- 2026-10-17 Making Tax Digital for Income Tax: Your 7 November Update and What's Coming in April 2027 — file `2026-10-17-making-tax-digital-income-tax-quarterly-updates.md`, URL /blog/making-tax-digital-income-tax-quarterly-updates/. Test-built OK (6 FAQ questions), sent for upload 17 Oct 2026. Doc https://claude.ai/code/artifact/e2cb8eba-4ac9-4d94-abb9-4f6eb43cde49

## Ideas for next posts
- The content calendar lives in the Claude Doc "Website Traffic Plan" (https://claude.ai/artifact/3vig4X6dERHkBjrLmspgPZ), section "Content plan: October 2026 to April 2027". Next: Autumn Budget 2026 round-up (publish by 29 Oct; Budget 28 Oct), then Salary vs dividends (20 Nov), Self Assessment checklist (1 Dec), Payments on account (6 Jan), MTD 7 Feb update (20 Jan), MTD £30k guide (20 Feb), Year-end planning (10 Mar), 2027/28 rates (7 Apr).

## Useful links
- Google review link: https://g.page/r/CU-GDm4rg3WsEBM/review (added to the website's Contact section on 27 Sep 2026)
- Facebook business page: https://www.facebook.com/profile.php?id=61594854459995
- LinkedIn company page (Meridian Accountants Limited): https://www.linkedin.com/company/129244179/
- Meridian Accountants Limited is an Authorised Corporate Service Provider (ACSP): it can do Companies House identity verification and company set-up for clients.
