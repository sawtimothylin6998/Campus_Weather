# Pookie Bear Campus Explorer

A multi-page HTML, CSS and JavaScript application for IT465 Assignment 2, styled with the supplied Pookie Bear logo and color palette.

## Use the app

1. Open the homepage through a local web server or the published Render website.
2. Type a country or city, choose a result, and view its photograph and map.
3. Click the photograph to open a separate destination page with weather, local time, currency conversion and news.

See PAGES.md for data sources, limitations and the detailed page flow.

## Deploy on Render

Create a public GitHub repository and upload every file in this folder. Connect that repository using Render's GitHub integration, choose Static Site and branch main, leave Root Directory blank, set Build Command to `echo "Static files ready"` and Publish Directory to `.`. Set Auto-Deploy to On Commit.

Open the assigned HTTPS address and test both pages. Do not open the HTML directly with file://: map tiles require a website referrer. While the local preview server is running on this computer, use http://127.0.0.1:8765/.

## Assignment evidence

Capture the search result with its photo/map, the destination page with API results, the Render deployment and GitHub commits. After the initial public deployment, make a visible improvement, commit it and observe the automatic update. Do not claim an update was deployed until the public page confirms it.

The earlier PDF draft describes an older app version and needs revision before submission. Public deployment, student identity and final deployment evidence remain pending.

## AI assistance

OpenAI Codex assisted with implementation, local testing and the earlier report draft. Review the code, verify your public deployment and describe your own changes accurately.
