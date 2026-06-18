# Cloudflare Pages Deploy Steps

1. Open your GitHub repository for APX Tools.
2. Upload/replace these files from this package:
   - `index.html`
   - `styles.min.css`
   - `app.min.js`
   - `favicon.ico`
   - `assets/apx-logo.png`
3. Commit the changes.
4. In Cloudflare Pages, make sure the project is connected to this GitHub repo.
5. Use these settings:
   - Framework preset: `None`
   - Build command: blank
   - Output directory: `/`
6. Deploy.
7. Open `https://apxtools.org` and hard refresh.

## After Deploy Test
- Confirm footer says `UI v2.1 RC1 · Engine v2.1.0`.
- Test mobile layout.
- Test Copy Recommendation.
- Test Developer Mode with `?dev=1` if needed.
