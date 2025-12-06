@echo off
echo ===================================================
echo   SANDWICH WAR DEPLOYMENT SCRIPT
echo ===================================================
echo.
echo 1. Adding all changes...
git add .

echo.
echo 2. Committing changes...
git commit -m "Deployment Update: %date% %time%"

echo.
echo 3. Pushing to GitHub...
echo    (This sends the code to https://github.com/shaill0895/sandwich-war-online)
git push origin HEAD:main

echo.
echo ===================================================
echo   DONE! 
echo   If you saw no errors, Vercel is building the site now.
echo ===================================================
pause
