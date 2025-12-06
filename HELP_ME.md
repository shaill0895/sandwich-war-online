# 🆘 Troubleshooting & Launch Guide

If you see errors like "... is not recognized", follow these steps.

## 1. Check if Node.js is installed
Open your terminal and type:
```bash
node -v
```
*   **If you see numbers** (like `v18.16.0`): Good! Go to Step 2.
*   **If it says "not recognized"**: You need to install Node.js from [nodejs.org](https://nodejs.org/).

## 2. Make sure you are in the right folder
Your terminal needs to be looking at the `sandwich-war-web` folder.
Type this command to go there (copy-paste it):
```bash
cd "c:\Users\Frank\Desktop\This one\sandwich-war-web"
```

## 3. Now try to play
Once you are in the folder, try:
```bash
npm run dev
```

## 4. How to Deploy (Put it Online)
1.  **Create Repo**: Go to GitHub.com and create a new repository.
2.  **Push Code**:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git add .
    git commit -m "Ready for launch"
    git push -u origin main
    ```
3.  **Vercel**: Import the project on Vercel.com.

> **Need Help?**
> If `npm run dev` fails, try running `npm install` first to fix broken files.
