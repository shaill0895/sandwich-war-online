# Sandwich War Online

A networked multiplayer version of "Austin vs Brady: Hyper Sandwich War".

## Tech Stack
-   **Framework**: React + Vite
-   **Networking**: Supabase Realtime
-   **Styling**: Vanilla CSS

## Setup
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Set up environment variables:
    Create a `.env` file with:
    ```
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_key
    ```
3.  Run locally:
    ```bash
    npm run dev
    ```

## Deployment (Vercel)
1.  Push this repository to GitHub/GitLab.
2.  Import the project into Vercel.
3.  Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Vercel Project Settings > Environment Variables.
4.  Deploy!
