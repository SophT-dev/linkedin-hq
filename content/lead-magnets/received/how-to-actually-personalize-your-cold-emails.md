# How To Actually Personalize Your Cold Emails

**Source:** unknown (sub-page inside 'The Ultimate Outbound Sales Playbook') — https://www.notion.so/How-To-Actually-Personalize-Your-Cold-Emails-18815203fef481778506dc08d46762d5?pvs=21
**Topic:** ai-automation · **Type:** notion-page

## Key takeaways
- Full pipeline for generating a hyper-personalized mock 'event/webinar' image per prospect: Clay (import + validate/filter leads) -> Enrich Company/Person (LinkedIn URL, headshot) -> HTTP API calls for a website screenshot API + a logo-color-recognition API -> DinoPics (dynamic composite-image builder) via Zapier -> final image URL pushed back into Clay.
- The composite image places the prospect's own logo colors, website screenshot, and profile photo into a fake 'webinar' mockup — used in cold emails, LinkedIn DMs, or a retargeted landing page for a big surprise/'wow' effect.
- Practical warnings: watch per-API costs, only run the expensive enrichment pipeline on leads you'll actually contact, validate that scraped images are real/high-quality before compositing, and test on 10-20 rows before scaling to thousands.

## Excerpt
This workflow generates custom images showcasing a mock event or webinar featuring the prospect's own brand, website screenshot, and face. Gather & Prep Prospect Data in Clay, then Enrich Company/Person details and use HTTP Request columns to call a screenshot API and a logo color-recognition API. Build the Custom Mockup with DinoPics: design a base template with placeholders (logo, screenshot, profile picture, colors, name, company), send the data via Zapier, and save the returned composite image URL back into Clay. Use the images in email campaigns, LinkedIn DMs, or retargeting landing pages. Key tips: double-check API costs, filter smartly to leads you'll actually contact, validate data quality, and test a small batch before scaling.