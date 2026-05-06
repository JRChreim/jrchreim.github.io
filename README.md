# jrchreim.github.io

Personal website hosted with GitHub Pages.

## Quick edits

1. Update the text in `index.html`, `about/index.html`, `research/index.html`, `publications/index.html`, and `contact/index.html`.
2. Replace the sample GitHub and demo links with your actual URLs.
3. Commit and push to GitHub to publish changes on your GitHub Pages site.

## Current structure

- `index.html`: homepage
- `about/index.html`: about page
- `research/index.html`: research page
- `publications/index.html`: publications page
- `contact/index.html`: contact page
- `styles.css`: shared site styling
- `script.js`: shared footer year and active-nav logic
- `publications-data.js`: generated publications data consumed by the publications page
- `publications-manual.js`: manual additions layered on top of the ORCID-generated publication list
- `publications-overrides.json`: optional title, venue, and author overrides layered on top of ORCID data
- `scripts/update-publications-from-orcid.mjs`: ORCID sync script
- `.github/workflows/update-publications.yml`: scheduled ORCID refresh workflow

## Publications automation

The publications page can be regenerated from the public ORCID record at `https://orcid.org/0000-0002-2809-9116`.

To refresh it manually:

```bash
node scripts/update-publications-from-orcid.mjs
```

The GitHub Actions workflow also refreshes the generated publications file weekly and can be run manually from the Actions tab.

## Good next upgrades

1. Add a real headshot or project images.
2. Split CSS into a separate `styles.css` file once the design settles.
3. Add sections for resume, publications, or writing if those matter for your goals.
