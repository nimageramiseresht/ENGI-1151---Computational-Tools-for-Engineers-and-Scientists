# ENGI 1151 Week 5: Monte Carlo simulation with Python

Lecture notes as a web page, with live Python (JupyterLite + Pyodide) running
in the student's browser. No server, no installs, no accounts.

## What's in the repo

| Path | Purpose |
|---|---|
| `index.html` | The lesson page. Every code block has an **Open live Python** button that loads an editable Python console right under it. |
| `content/week5_monte_carlo.ipynb` | Practice notebook, embedded at the bottom of the page. Add more notebooks to this folder and they'll be built in too. |
| `.github/workflows/deploy.yml` | Builds JupyterLite into `lite/` and publishes everything to GitHub Pages on every push to `main`. |
| `requirements.txt` | Pinned JupyterLite build tools. |

## Publish it (about 5 minutes)

1. Create a new **public** repository on GitHub (e.g. `engi1151-week5`).
2. Upload all of these files, keeping the folder structure. The `.github` folder
   is hidden on macOS/Linux; drag the whole unzipped folder in, or use `git`:
   ```bash
   git init && git add . && git commit -m "Week 5 lesson"
   git branch -M main
   git remote add origin https://github.com/<you>/engi1151-week5.git
   git push -u origin main
   ```
3. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Open the **Actions** tab. The *Build and deploy* workflow runs (about 1–2 minutes).
   Re-run it if it started before you changed the Pages setting.
5. Your page is live at `https://<you>.github.io/engi1151-week5/`.

## Previewing locally

Opening `index.html` directly works: the live consoles fall back to the public
JupyterLite demo. To preview the full site including the embedded notebook:

```bash
pip install -r requirements.txt
jupyter lite build --contents content --output-dir dist/lite
cp index.html dist/
python -m http.server -d dist 8000   # then visit http://localhost:8000
```

## Notes for students

- The first live console takes 10–20 s to start while Python downloads; after that it's cached.
- NumPy and Matplotlib load automatically when imported.
- Notebook edits are saved in the browser only. Use *File → Download* to keep a copy.
